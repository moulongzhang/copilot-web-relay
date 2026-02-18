const VALID_TUNNEL_PROTOCOLS = ['http:', 'https:', 'ws:', 'wss:'];
const WS_PROTOCOLS = ['ws:', 'wss:'];
const SECURE_PROTOCOLS = ['https:', 'wss:'];

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isValidUrl(url: string): boolean {
  return tryParseUrl(url) !== null;
}

export function isValidTunnelUrl(url: string): boolean {
  const parsed = tryParseUrl(url);
  return parsed !== null && VALID_TUNNEL_PROTOCOLS.includes(parsed.protocol);
}

export function isValidWebSocketUrl(url: string): boolean {
  const parsed = tryParseUrl(url);
  return parsed !== null && WS_PROTOCOLS.includes(parsed.protocol);
}

export function isSecureUrl(url: string): boolean {
  const parsed = tryParseUrl(url);
  return parsed !== null && SECURE_PROTOCOLS.includes(parsed.protocol);
}

export function normalizeUrl(url: string): string {
  const parsed = tryParseUrl(url);
  if (!parsed) return url;
  parsed.protocol = parsed.protocol.toLowerCase();
  // Remove trailing slashes from pathname
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  let result = parsed.toString();
  // Remove trailing slash unless path is just "/"
  if (parsed.pathname === '/' && !url.includes('?') && !url.includes('#')) {
    result = result.replace(/\/$/, '');
  }
  return result;
}

export function httpToWs(url: string): string {
  const parsed = tryParseUrl(url);
  if (!parsed) return url;
  if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
  else if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
  return parsed.toString();
}

export function wsToHttp(url: string): string {
  const parsed = tryParseUrl(url);
  if (!parsed) return url;
  if (parsed.protocol === 'ws:') parsed.protocol = 'http:';
  else if (parsed.protocol === 'wss:') parsed.protocol = 'https:';
  return parsed.toString();
}

export function getHostname(url: string): string {
  const parsed = tryParseUrl(url);
  return parsed ? parsed.hostname : '';
}

export function getPort(url: string): number | null {
  const parsed = tryParseUrl(url);
  if (!parsed || !parsed.port) return null;
  return parseInt(parsed.port, 10);
}

export function getPath(url: string): string {
  const parsed = tryParseUrl(url);
  return parsed ? parsed.pathname : '';
}

export function buildWebSocketUrl(base: string, path?: string): string {
  const wsBase = httpToWs(base);
  const parsed = tryParseUrl(wsBase);
  if (!parsed) return base;
  if (path) {
    // Ensure proper joining
    const basePath = parsed.pathname.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    parsed.pathname = basePath + cleanPath;
  }
  return parsed.toString().replace(/\/$/, '');
}

export function isLocalhost(url: string): boolean {
  const parsed = tryParseUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

export function isTrycloudflareUrl(url: string): boolean {
  const parsed = tryParseUrl(url);
  if (!parsed) return false;
  return parsed.hostname.endsWith('.trycloudflare.com');
}
