type MessageStatus = 'streaming' | 'done' | 'error';
type DocumentStatus = 'streaming' | 'ready' | 'error';

interface GeneratedDocLike {
  status: DocumentStatus;
}

interface AssistantMessageLike {
  status: MessageStatus;
  docs?: GeneratedDocLike[];
  stage?: unknown;
}

export function createAssistantStreamState() {
  let receivedContentSinceRevision = false;

  return {
    markContentReceived() {
      receivedContentSinceRevision = true;
    },

    resetForRevision() {
      receivedContentSinceRevision = false;
    },

    shouldUseFallback() {
      return !receivedContentSinceRevision;
    },
  };
}

export function finalizeAssistantMessage(
  message: AssistantMessageLike,
  status: Exclude<MessageStatus, 'streaming'>,
) {
  message.status = status;
  delete message.stage;

  for (const doc of message.docs ?? []) {
    if (doc.status !== 'streaming') continue;
    doc.status = status === 'done' ? 'ready' : 'error';
  }
}

export function recoverInterruptedAssistantMessage(message: AssistantMessageLike) {
  if (message.status !== 'streaming') return;
  finalizeAssistantMessage(message, 'error');
}
