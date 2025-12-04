type Messages = Record<string, string>;
type MessagesByLocale = Record<string, Messages>;

const modules = import.meta.glob('./auto/**/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const messagesByLocale: MessagesByLocale = {};

for (const [filePath, raw] of Object.entries(modules)) {
  if (typeof raw !== 'string') continue;
  try {
    const data = JSON.parse(raw) as Record<string, string>;
    const parts = filePath.split('/');
    const idx = parts.lastIndexOf('auto');
    const segment = idx >= 0 && idx + 1 < parts.length ? parts[idx + 1] : parts[parts.length - 1];
    const locale = segment.replace(/\.json$/i, '') || 'en';
    const existing = messagesByLocale[locale] || {};
    messagesByLocale[locale] = { ...existing, ...data };
  } catch {
  }
}

export function getMessagesByLocale(): MessagesByLocale {
  return messagesByLocale;
}

