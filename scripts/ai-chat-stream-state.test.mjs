import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadTsModule(relativePath) {
  const filename = resolve(relativePath);
  const source = readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });

  const module = { exports: {} };
  const sandbox = {
    exports: module.exports,
    module,
    require(specifier) {
      throw new Error(`Unexpected require from ${relativePath}: ${specifier}`);
    },
  };
  vm.runInNewContext(outputText, sandbox, { filename });
  return module.exports;
}

test('revision resets stream content tracking so polish failures can fall back', () => {
  const { createAssistantStreamState } = loadTsModule('src/lib/aiChatStreamState.ts');
  const state = createAssistantStreamState();

  assert.equal(state.shouldUseFallback(), true);
  state.markContentReceived();
  assert.equal(state.shouldUseFallback(), false);

  state.resetForRevision();
  assert.equal(state.shouldUseFallback(), true);

  state.markContentReceived();
  assert.equal(state.shouldUseFallback(), false);
});

test('error finalization does not mark the currently streaming document ready', () => {
  const { finalizeAssistantMessage } = loadTsModule('src/lib/aiChatStreamState.ts');
  const message = {
    status: 'streaming',
    stage: { id: 'polish', label: 'Polishing' },
    docs: [
      { id: 'first', title: 'First pass', html: '<p>complete</p>', status: 'ready' },
      { id: 'polish', title: 'Polished', html: '<p>partial', status: 'streaming' },
    ],
  };

  finalizeAssistantMessage(message, 'error');

  assert.equal(message.status, 'error');
  assert.equal(message.stage, undefined);
  assert.equal(message.docs[0].status, 'ready');
  assert.equal(message.docs[1].status, 'error');
});

test('successful finalization marks open documents ready', () => {
  const { finalizeAssistantMessage } = loadTsModule('src/lib/aiChatStreamState.ts');
  const message = {
    status: 'streaming',
    docs: [
      { id: 'doc', title: 'Draft', html: '<p>complete</p>', status: 'streaming' },
    ],
  };

  finalizeAssistantMessage(message, 'done');

  assert.equal(message.status, 'done');
  assert.equal(message.docs[0].status, 'ready');
});

test('persisted interrupted messages recover as errors, not ready documents', () => {
  const { recoverInterruptedAssistantMessage } = loadTsModule('src/lib/aiChatStreamState.ts');
  const message = {
    status: 'streaming',
    docs: [
      { id: 'closed', title: 'Closed', html: '<p>done</p>', status: 'ready' },
      { id: 'open', title: 'Open', html: '<p>partial', status: 'streaming' },
    ],
  };

  recoverInterruptedAssistantMessage(message);

  assert.equal(message.status, 'error');
  assert.equal(message.docs[0].status, 'ready');
  assert.equal(message.docs[1].status, 'error');
});

test('parser can flush an incomplete document without closing it as ready', () => {
  const { createVensuiteDocParser } = loadTsModule('src/lib/vensuiteDocStream.ts');
  const events = [];
  const parser = createVensuiteDocParser({
    onText: (text) => events.push(['text', text]),
    onDocStart: (title) => events.push(['start', title]),
    onDocChunk: (html) => events.push(['chunk', html]),
    onDocEnd: () => events.push(['end']),
  });

  parser.push('<vensuite-doc title="Partial"><p>half');
  parser.flush({ completeOpenDocument: false });

  assert.deepEqual(events, [
    ['start', 'Partial'],
    ['chunk', '<p>half'],
  ]);
});
