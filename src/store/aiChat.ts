/**
 * AI Assistant chat store — conversations, messages, generated documents.
 * Persists to localStorage (debounced) so chats survive reloads.
 */
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { ChatApiMessage } from '@/services/aiChat';

export interface ChatAttachment {
  id: string;
  name: string;
  html: string;
  plainText: string;
  sourceFileId?: string;
  role: 'primary' | 'reference' | 'context';
}

export interface GeneratedDoc {
  id: string;
  title: string;
  html: string;
  status: 'streaming' | 'ready';
  savedFileId?: string;
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachments: ChatAttachment[];
  docs: GeneratedDoc[];
  status: 'streaming' | 'done' | 'error';
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMsg[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'vensuite_ai_chats_v1';
const MAX_PERSISTED_DOC_HTML = 300_000;
const HISTORY_CAP = 12;

function loadPersisted(): { conversations: Conversation[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { conversations: [], activeId: null };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.conversations)) {
      return { conversations: [], activeId: null };
    }
    const conversations: Conversation[] = parsed.conversations.filter(
      (c: unknown): c is Conversation =>
        !!c && typeof c === 'object' && Array.isArray((c as Conversation).messages),
    );
    // Anything mid-stream when the page closed is finalized on load.
    for (const convo of conversations) {
      for (const msg of convo.messages) {
        if (msg.status === 'streaming') msg.status = 'done';
        for (const doc of msg.docs ?? []) {
          if (doc.status === 'streaming') doc.status = 'ready';
        }
      }
    }
    const activeId =
      typeof parsed.activeId === 'string' &&
      conversations.some((c) => c.id === parsed.activeId)
        ? parsed.activeId
        : null;
    return { conversations, activeId };
  } catch (error) {
    console.warn('Failed to load AI chats from storage, resetting:', error);
    return { conversations: [], activeId: null };
  }
}

export const useAiChatStore = defineStore('aiChat', {
  state: () => {
    const persisted = loadPersisted();
    return {
      conversations: persisted.conversations,
      activeId: persisted.activeId,
      /** Attachments staged in the composer for the next message (not persisted). */
      draftAttachments: [] as ChatAttachment[],
      _saveTimer: null as ReturnType<typeof setTimeout> | null,
    };
  },

  getters: {
    activeConversation(state): Conversation | null {
      return state.conversations.find((c) => c.id === state.activeId) ?? null;
    },

    sortedConversations(state): Conversation[] {
      return [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    },

    /**
     * Conversation history shaped for the API. Assistant messages with docs
     * become their text plus a short `[Generated document: title]` marker
     * instead of the full HTML (token economy). Capped to the most recent
     * messages.
     */
    apiHistory(): ChatApiMessage[] {
      const convo = this.activeConversation;
      if (!convo) return [];
      const mapped: ChatApiMessage[] = convo.messages
        .filter((m) => m.status !== 'error')
        .map((m) => {
          let content = m.text;
          if (m.role === 'assistant' && m.docs.length > 0) {
            const markers = m.docs
              .map((d) => `\n[Generated document: ${d.title}]`)
              .join('');
            content = `${content}${markers}`.trim();
          }
          return { role: m.role, content };
        })
        .filter((m) => m.content.length > 0);
      return mapped.slice(-HISTORY_CAP);
    },
  },

  actions: {
    newConversation(): Conversation {
      const now = Date.now();
      const convo: Conversation = {
        id: uuidv4(),
        title: 'New chat',
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      this.conversations.unshift(convo);
      this.activeId = convo.id;
      this.persist();
      return convo;
    },

    setActive(id: string) {
      if (this.conversations.some((c) => c.id === id)) {
        this.activeId = id;
        this.persist();
      }
    },

    deleteConversation(id: string) {
      this.conversations = this.conversations.filter((c) => c.id !== id);
      if (this.activeId === id) {
        this.activeId = this.conversations[0]?.id ?? null;
      }
      this.persist();
    },

    renameConversation(id: string, title: string) {
      const convo = this.conversations.find((c) => c.id === id);
      if (convo) {
        convo.title = title.trim() || 'New chat';
        convo.updatedAt = Date.now();
        this.persist();
      }
    },

    appendMessage(conversationId: string, message: ChatMsg) {
      const convo = this.conversations.find((c) => c.id === conversationId);
      if (!convo) return;
      convo.messages.push(message);
      convo.updatedAt = Date.now();
      this.persist();
    },

    updateMessage(
      conversationId: string,
      messageId: string,
      updater: (msg: ChatMsg) => void,
    ) {
      const convo = this.conversations.find((c) => c.id === conversationId);
      if (!convo) return;
      const msg = convo.messages.find((m) => m.id === messageId);
      if (!msg) return;
      updater(msg);
      convo.updatedAt = Date.now();
      this.persist();
    },

    removeMessage(conversationId: string, messageId: string) {
      const convo = this.conversations.find((c) => c.id === conversationId);
      if (!convo) return;
      convo.messages = convo.messages.filter((m) => m.id !== messageId);
      convo.updatedAt = Date.now();
      this.persist();
    },

    /** Title the conversation from its first user message. */
    autoTitle(conversationId: string) {
      const convo = this.conversations.find((c) => c.id === conversationId);
      if (!convo || (convo.title && convo.title !== 'New chat')) return;
      const firstUser = convo.messages.find((m) => m.role === 'user');
      if (!firstUser) return;
      const text = firstUser.text.replace(/\s+/g, ' ').trim();
      if (!text) return;
      convo.title = text.length > 48 ? `${text.slice(0, 48).trimEnd()}…` : text;
      this.persist();
    },

    addDraftAttachment(attachment: Omit<ChatAttachment, 'role'>) {
      const role: ChatAttachment['role'] =
        this.draftAttachments.length === 0 ? 'primary' : 'reference';
      this.draftAttachments.push({ ...attachment, role });
    },

    removeDraftAttachment(id: string) {
      this.draftAttachments = this.draftAttachments.filter((a) => a.id !== id);
    },

    cycleDraftAttachmentRole(id: string) {
      const attachment = this.draftAttachments.find((a) => a.id === id);
      if (!attachment) return;
      const order: ChatAttachment['role'][] = ['primary', 'reference', 'context'];
      const next = order[(order.indexOf(attachment.role) + 1) % order.length];
      attachment.role = next;
    },

    clearDraftAttachments() {
      this.draftAttachments = [];
    },

    /** Debounced localStorage persistence. */
    persist() {
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        try {
          const conversations = this.conversations.map((c) => ({
            ...c,
            messages: c.messages.map((m) => ({
              ...m,
              // Attachments can be large converted documents — keep names and
              // roles for display, drop heavy content from storage.
              attachments: m.attachments.map((a) => ({
                ...a,
                html: a.html.length > MAX_PERSISTED_DOC_HTML ? '' : a.html,
                plainText:
                  a.plainText.length > MAX_PERSISTED_DOC_HTML ? '' : a.plainText,
              })),
              docs: m.docs.map((d) => ({
                ...d,
                html: d.html.length > MAX_PERSISTED_DOC_HTML ? '' : d.html,
              })),
            })),
          }));
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ conversations, activeId: this.activeId }),
          );
        } catch (error) {
          console.warn('Failed to persist AI chats:', error);
        }
      }, 500);
    },
  },
});
