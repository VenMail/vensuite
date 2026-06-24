/**
 * Incremental parser for assistant streams that may embed a document wrapped as
 * `<vensuite-doc title="Some title">...full HTML...</vensuite-doc>` with
 * conversational text before/after. Tags can split across chunks, so the parser
 * keeps a small tail buffer in text/doc modes and only emits what is provably
 * outside a potential tag boundary.
 */

export interface DocStreamEvents {
  /** Conversational text delta (outside any document). */
  onText(t: string): void;
  /** `<vensuite-doc title="...">` fully parsed. */
  onDocStart(title: string): void;
  /** Document content delta. */
  onDocChunk(html: string): void;
  /** `</vensuite-doc>` seen. */
  onDocEnd(): void;
}

export interface DocStreamFlushOptions {
  completeOpenDocument?: boolean;
}

const OPEN_TAG = '<vensuite-doc';
const CLOSE_TAG = '</vensuite-doc>';
// Keep up to (tag.length - 1) trailing chars: anything shorter could be the
// start of a tag split across chunks.
const TEXT_TAIL_GUARD = OPEN_TAG.length - 1; // 12
const DOC_TAIL_GUARD = CLOSE_TAG.length - 1; // 14

type Mode = 'text' | 'tag-open' | 'doc';

export function createVensuiteDocParser(events: DocStreamEvents) {
  let mode: Mode = 'text';
  let buffer = '';

  function parseOpenTag(): boolean {
    const gt = buffer.indexOf('>');
    if (gt === -1) return false;

    const tag = buffer.slice(0, gt + 1);
    let title = 'Untitled document';
    const doubleQuoted = /^<vensuite-doc[^>]*?title="([^"]*)"[^>]*>/i.exec(tag);
    const singleQuoted = /^<vensuite-doc[^>]*?title='([^']*)'[^>]*>/i.exec(tag);
    if (doubleQuoted && doubleQuoted[1].trim()) {
      title = doubleQuoted[1].trim();
    } else if (singleQuoted && singleQuoted[1].trim()) {
      title = singleQuoted[1].trim();
    }

    events.onDocStart(title);
    buffer = buffer.slice(gt + 1);
    mode = 'doc';
    return true;
  }

  function step(): boolean {
    if (mode === 'text') {
      const idx = buffer.indexOf(OPEN_TAG);
      if (idx !== -1) {
        if (idx > 0) events.onText(buffer.slice(0, idx));
        buffer = buffer.slice(idx);
        mode = 'tag-open';
        return true;
      }
      if (buffer.length > TEXT_TAIL_GUARD) {
        const emit = buffer.slice(0, buffer.length - TEXT_TAIL_GUARD);
        events.onText(emit);
        buffer = buffer.slice(buffer.length - TEXT_TAIL_GUARD);
      }
      return false;
    }

    if (mode === 'tag-open') {
      return parseOpenTag();
    }

    // mode === 'doc'
    const idx = buffer.indexOf(CLOSE_TAG);
    if (idx !== -1) {
      if (idx > 0) events.onDocChunk(buffer.slice(0, idx));
      events.onDocEnd();
      buffer = buffer.slice(idx + CLOSE_TAG.length);
      mode = 'text';
      return true;
    }
    if (buffer.length > DOC_TAIL_GUARD) {
      const emit = buffer.slice(0, buffer.length - DOC_TAIL_GUARD);
      events.onDocChunk(emit);
      buffer = buffer.slice(buffer.length - DOC_TAIL_GUARD);
    }
    return false;
  }

  return {
    push(chunk: string): void {
      if (!chunk) return;
      buffer += chunk;
      // Loop until no further progress — a single chunk can contain
      // text + open tag + doc content + close tag + more text.
      while (step()) {
        /* keep consuming */
      }
    },

    flush(options: DocStreamFlushOptions = {}): void {
      const completeOpenDocument = options.completeOpenDocument ?? true;

      if (mode === 'tag-open') {
        // Unterminated open tag — degrade gracefully by treating it as text.
        if (buffer) events.onText(buffer);
        buffer = '';
        mode = 'text';
        return;
      }
      if (mode === 'doc') {
        // Unterminated document — emit remainder; caller decides whether to close it.
        if (buffer) events.onDocChunk(buffer);
        if (completeOpenDocument) events.onDocEnd();
        buffer = '';
        mode = 'text';
        return;
      }
      if (buffer) events.onText(buffer);
      buffer = '';
    },
  };
}
