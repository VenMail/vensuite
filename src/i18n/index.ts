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
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('app-locale', locale);
    } catch {
    }
  }
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

// Auto-load i18n JSON files from src/i18n/locales if they exist
const messageModules = import.meta.glob('./locales/**/*.json', { eager: true });
const resourceModules = import.meta.glob('../../resources/js/i18n/auto/**/*.json', { eager: true });
const testModule = import.meta.glob('../../resources/js/i18n/auto/en/views.json', { eager: true });

console.log('testModule:', testModule);

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

for (const [path, mod] of Object.entries(resourceModules)) {
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
  console.log('autoMessagesByLocale:', autoMessagesByLocale);
  let defaultLocale = autoMessagesByLocale.en ? 'en' : Object.keys(autoMessagesByLocale)[0];
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem('app-locale');
      if (saved && autoMessagesByLocale[saved]) {
        defaultLocale = saved;
      }
    } catch {
      // ignore storage errors
    }
  }
  console.log('initI18n with', defaultLocale);
  initI18n(defaultLocale, autoMessagesByLocale);
}
