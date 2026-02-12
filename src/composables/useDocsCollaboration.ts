import { ref, computed, watch, nextTick, type Ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import { useAuthStore } from '@/store/auth';
import { IWebsocketService, Message, useWebSocket } from '@/lib/wsService';

export function useDocsCollaboration(
  editor: Ref<Editor | undefined>,
  routeParams: { appFileId: string | undefined },
  opts: {
    onRemoteChange: (delta: any) => void;
    onTitleChange: (title: string) => void;
  }
) {
  const authStore = useAuthStore();
  const { initializeWebSocket } = useWebSocket();

  const wsService = ref<IWebsocketService | null>(null);
  const randomUserToken = Math.random().toString(36).substr(2, 9);
  const userId = ref(
    authStore.isAuthenticated && authStore.userId
      ? authStore.userId
      : `guest-${randomUserToken}`,
  );
  const userName = ref(
    authStore.isAuthenticated
      ? ([authStore.firstName, authStore.lastName].filter(Boolean).join(' ') || authStore.email?.split('@')[0] || 'You')
      : `Guest ${Math.floor(Math.random() * 1000)}`,
  );
  const changesPending = ref(false);
  const isJoined = ref(false);
  const SOCKET_URI = import.meta.env.VITE_SOCKET_BASE_URL || "wss://w.venmail.io:8443";

  const collaborators = ref<Record<string, { name: string; ts: number }>>({});
  const collaboratorList = computed(() =>
    Object.entries(collaborators.value)
      .filter(([id]) => id !== userId.value)
      .map(([id, info]) => ({ id, name: info.name, ts: info.ts })),
  );

  // Chat state
  const isChatOpen = ref(false);
  const chatMessages = ref<Message[]>([]);
  const newChatMessage = ref('');
  const chatMessagesContainer = ref<HTMLElement | null>(null);
  const chatInput = ref<HTMLTextAreaElement | null>(null);
  const textareaHeight = ref('40px');
  const unreadCount = ref(0);
  const notificationSound = typeof Audio !== 'undefined'
    ? new Audio(new URL('@/assets/bubble.mp3', import.meta.url).href)
    : null;

  const guestAccessiblePrivacyTypes = new Set<number>([1, 2, 3, 4]);

  function canJoinRealtime(privacyType: number) {
    const docId = routeParams.appFileId;
    if (!docId || docId === 'new') return false;
    if (authStore.isAuthenticated) return true;
    return guestAccessiblePrivacyTypes.has(privacyType);
  }

  function initializeWebSocketAndJoinDoc(privacyType: number) {
    if (!canJoinRealtime(privacyType)) return;
    const docId = routeParams.appFileId;
    if (docId && docId !== 'new' && !wsService.value) {
      wsService.value = initializeWebSocket(`${SOCKET_URI}?sheetId=${docId}&userName=${userName.value}&userId=${userId.value}`);
      joinDoc(privacyType);
    }
  }

  function joinDoc(privacyType: number) {
    if (isJoined.value || !canJoinRealtime(privacyType)) return;
    const docId = routeParams.appFileId;
    if (wsService.value && docId && docId !== 'new') {
      try {
        isJoined.value = wsService.value.joinSheet(docId, handleIncomingMessage);
      } catch (error) {
        console.error('Error joining document:', error);
      }
    }
  }

  function handleIncomingMessage(message: Message) {
    if (!message) return;
    const docId = routeParams.appFileId;
    if (message.sheetId && docId && message.sheetId !== docId) return;
    if (message.messages) {
      return message.messages.forEach(handleIncomingMessage);
    }
    switch (message.type) {
      case 'chat':
        handleChatMessage(message);
        break;
      case 'change':
        if (message.user?.id === userId.value) break;
        if (message.content?.delta) opts.onRemoteChange(message.content.delta);
        break;
      case 'cursor': {
        const uid = message.user?.id;
        const name = message.user?.name;
        if (uid && name) collaborators.value[uid] = { name, ts: Date.now() };
        break;
      }
      case 'title':
        if (message.user?.id !== userId.value && message.content?.title) {
          opts.onTitleChange(message.content.title);
        }
        break;
    }
  }

  function handleChatMessage(messageInfo: Message) {
    chatMessages.value.push(messageInfo);
    scrollChatToBottom();
    if (!isChatOpen.value && messageInfo.user?.id !== userId.value) {
      unreadCount.value++;
      try { notificationSound?.play().catch(() => {}); } catch {}
    }
  }

  function sendChatMessage() {
    if (!wsService.value) return;
    const docId = routeParams.appFileId;
    if (!docId || docId === 'new') return;
    const message = newChatMessage.value;
    if (!message.trim()) return;
    try {
      wsService.value.sendMessage(docId, 'chat', { message }, userId.value, userName.value);
      newChatMessage.value = '';
      adjustChatTextareaHeight();
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }

  function handleChatEnterKey(event: KeyboardEvent) {
    event.preventDefault();
    sendChatMessage();
  }

  function adjustChatTextareaHeight() {
    if (chatInput.value) {
      chatInput.value.style.height = '40px';
      chatInput.value.style.height = `${Math.min(chatInput.value.scrollHeight, 150)}px`;
      textareaHeight.value = chatInput.value.style.height;
    }
  }

  function scrollChatToBottom() {
    nextTick(() => {
      if (chatMessagesContainer.value) {
        chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight;
      }
    });
  }

  function formatChatTime(timestamp: number) {
    try { return new Date(timestamp).toLocaleTimeString(); } catch { return ''; }
  }

  function broadcastChange() {
    if (!editor.value || changesPending.value || !wsService.value) return;
    const docId = routeParams.appFileId;
    if (!docId || docId === 'new') return;
    try {
      const content = editor.value.getJSON();
      wsService.value.sendMessage(docId, 'change', { delta: content }, userId.value, userName.value);
    } catch (error) {
      console.error('Error broadcasting change:', error);
    }
  }

  function broadcastCursorPresence() {
    if (!editor.value || !wsService.value) return;
    const docId = routeParams.appFileId;
    if (!docId || docId === 'new') return;
    try {
      wsService.value.sendMessage(docId, 'cursor', {}, userId.value, userName.value);
    } catch (error) {
      console.error('Error broadcasting cursor presence:', error);
    }
  }

  function broadcastTitle(title: string) {
    const docId = routeParams.appFileId;
    if (wsService.value && docId && docId !== 'new') {
      wsService.value.sendMessage(docId, 'title', { title }, userId.value, userName.value);
    }
  }

  function leaveDoc() {
    const docId = routeParams.appFileId;
    if (wsService.value && docId && docId !== 'new') {
      wsService.value.leaveSheet(docId);
      isJoined.value = false;
    }
  }

  function colorForUser(uid: string) {
    const palette = ['#2563EB', '#9333EA', '#16A34A', '#DC2626', '#F59E0B', '#0EA5E9', '#7C3AED', '#059669', '#D97706', '#DB2777'];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    return palette[Math.abs(hash) % palette.length];
  }

  watch(isChatOpen, (open) => {
    if (open) {
      unreadCount.value = 0;
      nextTick(() => {
        chatInput.value?.focus();
        scrollChatToBottom();
      });
    }
  });

  watch(collaborators, () => {
    const now = Date.now();
    for (const [id, info] of Object.entries(collaborators.value)) {
      if (now - info.ts > 8000) delete collaborators.value[id];
    }
  }, { deep: true });

  return {
    userId, userName, changesPending, isJoined, wsService,
    collaborators, collaboratorList,
    isChatOpen, chatMessages, newChatMessage, chatMessagesContainer,
    chatInput, textareaHeight, unreadCount,
    initializeWebSocketAndJoinDoc, joinDoc, leaveDoc,
    broadcastChange, broadcastCursorPresence, broadcastTitle,
    sendChatMessage, handleChatEnterKey, adjustChatTextareaHeight,
    formatChatTime, colorForUser, canJoinRealtime,
  };
}
