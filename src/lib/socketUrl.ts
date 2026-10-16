export const DEFAULT_SOCKET_URL = 'wss://w.venmail.io:8443';

function defaultPageProtocol(): string {
  return typeof window === 'undefined' ? 'https:' : window.location.protocol;
}

export function secureSocketUrl(
  configuredUrl = DEFAULT_SOCKET_URL,
  pageProtocol = defaultPageProtocol(),
): string {
  let url: URL;

  try {
    url = new URL(configuredUrl);
  } catch {
    url = new URL(DEFAULT_SOCKET_URL);
  }

  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    url = new URL(DEFAULT_SOCKET_URL);
  }

  if (pageProtocol === 'https:' && url.protocol === 'ws:') {
    url.protocol = 'wss:';
  }

  const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.protocol}//${url.host}${pathname}${url.search}${url.hash}`;
}
