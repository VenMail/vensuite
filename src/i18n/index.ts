import { ref } from 'vue';

export type Messages = Record<string, string>;
export type MessagesByLocale = Record<string, Messages>;

export const currentLocale = ref<string>('en');
const store: MessagesByLocale = {};

export function initI18n(initialLocale: string, messagesByLocale: MessagesByLocale): void {
  currentLocale.value = initialLocale || 'en';
  for (const k of Object.keys(messagesByLocale || {})) {
    store[k] = { ...(messagesByLocale as any)[k] };
  }
}

export function t(key: string): string {
  const messages = store[currentLocale.value] || {};
  const value = messages[key];
  if (typeof value === 'string') return value;
  return key;
}

export function setLocale(locale: string): void {
  currentLocale.value = locale;
}

export function getLocale(): string {
  return currentLocale.value;
}

function flattenMessages(input: unknown, prefix = ''): Messages {
  const result: Messages = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return result;
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenMessages(value, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  return result;
}

const messageModules = import.meta.glob('@i18n-auto/**/*.json', { eager: true });

const autoMessagesByLocale: MessagesByLocale = {};

for (const [path, mod] of Object.entries(messageModules)) {
  const segments = path.split('/');
  const locale = segments[segments.length - 2];
  if (!locale) continue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (mod as any).default ?? mod;
  const flat = flattenMessages(data);
  autoMessagesByLocale[locale] = {
    ...(autoMessagesByLocale[locale] || {}),
    ...flat,
  };
}

if (Object.keys(autoMessagesByLocale).length > 0) {
  const defaultLocale = autoMessagesByLocale.en ? 'en' : Object.keys(autoMessagesByLocale)[0];
  initI18n(defaultLocale, autoMessagesByLocale);
}
