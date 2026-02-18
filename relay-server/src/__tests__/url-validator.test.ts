import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  isValidTunnelUrl,
  isValidWebSocketUrl,
  isSecureUrl,
  normalizeUrl,
  httpToWs,
  wsToHttp,
  getHostname,
  getPort,
  getPath,
  buildWebSocketUrl,
  isLocalhost,
  isTrycloudflareUrl,
} from '../url-validator.js';

// isValidUrl (6 tests)
describe('isValidUrl', () => {
  it('should return true for valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should return true for valid https URL', () => {
    expect(isValidUrl('https://example.com/path')).toBe(true);
  });

  it('should return false for invalid URL', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('should return false for string without protocol', () => {
    expect(isValidUrl('example.com')).toBe(false);
  });

  it('should return true for ftp URL', () => {
    expect(isValidUrl('ftp://files.example.com')).toBe(true);
  });
});

// isValidTunnelUrl (5 tests)
describe('isValidTunnelUrl', () => {
  it('should return true for http URL', () => {
    expect(isValidTunnelUrl('http://localhost:3000')).toBe(true);
  });

  it('should return true for https URL', () => {
    expect(isValidTunnelUrl('https://tunnel.example.com')).toBe(true);
  });

  it('should return true for ws URL', () => {
    expect(isValidTunnelUrl('ws://localhost:8080')).toBe(true);
  });

  it('should return true for wss URL', () => {
    expect(isValidTunnelUrl('wss://tunnel.example.com')).toBe(true);
  });

  it('should return false for ftp URL', () => {
    expect(isValidTunnelUrl('ftp://files.example.com')).toBe(false);
  });
});

// isValidWebSocketUrl (5 tests)
describe('isValidWebSocketUrl', () => {
  it('should return true for ws URL', () => {
    expect(isValidWebSocketUrl('ws://localhost:8080')).toBe(true);
  });

  it('should return true for wss URL', () => {
    expect(isValidWebSocketUrl('wss://secure.example.com')).toBe(true);
  });

  it('should return false for http URL', () => {
    expect(isValidWebSocketUrl('http://example.com')).toBe(false);
  });

  it('should return false for https URL', () => {
    expect(isValidWebSocketUrl('https://example.com')).toBe(false);
  });

  it('should return false for invalid URL', () => {
    expect(isValidWebSocketUrl('not-a-url')).toBe(false);
  });
});

// isSecureUrl (4 tests)
describe('isSecureUrl', () => {
  it('should return true for https URL', () => {
    expect(isSecureUrl('https://secure.example.com')).toBe(true);
  });

  it('should return true for wss URL', () => {
    expect(isSecureUrl('wss://secure.example.com')).toBe(true);
  });

  it('should return false for http URL', () => {
    expect(isSecureUrl('http://example.com')).toBe(false);
  });

  it('should return false for ws URL', () => {
    expect(isSecureUrl('ws://example.com')).toBe(false);
  });
});

// normalizeUrl (5 tests)
describe('normalizeUrl', () => {
  it('should remove trailing slash', () => {
    expect(normalizeUrl('http://example.com/')).toBe('http://example.com');
  });

  it('should preserve path without trailing slash', () => {
    expect(normalizeUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('should remove trailing slash from path', () => {
    expect(normalizeUrl('http://example.com/path/')).toBe('http://example.com/path');
  });

  it('should normalize protocol case', () => {
    expect(normalizeUrl('HTTP://EXAMPLE.COM')).toBe('http://example.com');
  });

  it('should return invalid URL as-is', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

// httpToWs / wsToHttp (6 tests)
describe('httpToWs', () => {
  it('should convert http to ws', () => {
    expect(httpToWs('http://example.com')).toBe('ws://example.com/');
  });

  it('should convert https to wss', () => {
    expect(httpToWs('https://example.com')).toBe('wss://example.com/');
  });

  it('should not change ws URL', () => {
    expect(httpToWs('ws://example.com')).toBe('ws://example.com/');
  });
});

describe('wsToHttp', () => {
  it('should convert ws to http', () => {
    expect(wsToHttp('ws://example.com')).toBe('http://example.com/');
  });

  it('should convert wss to https', () => {
    expect(wsToHttp('wss://example.com')).toBe('https://example.com/');
  });

  it('should not change http URL', () => {
    expect(wsToHttp('http://example.com')).toBe('http://example.com/');
  });
});

// getHostname / getPort / getPath (8 tests)
describe('getHostname', () => {
  it('should extract hostname from URL', () => {
    expect(getHostname('http://example.com/path')).toBe('example.com');
  });

  it('should extract hostname from URL with port', () => {
    expect(getHostname('http://localhost:3000')).toBe('localhost');
  });

  it('should return empty string for invalid URL', () => {
    expect(getHostname('not-a-url')).toBe('');
  });
});

describe('getPort', () => {
  it('should extract port number', () => {
    expect(getPort('http://localhost:3000')).toBe(3000);
  });

  it('should return null when no port specified', () => {
    expect(getPort('http://example.com')).toBeNull();
  });

  it('should return null for invalid URL', () => {
    expect(getPort('not-a-url')).toBeNull();
  });
});

describe('getPath', () => {
  it('should extract path from URL', () => {
    expect(getPath('http://example.com/api/v1')).toBe('/api/v1');
  });

  it('should return / for URL without path', () => {
    expect(getPath('http://example.com')).toBe('/');
  });
});

// buildWebSocketUrl (4 tests)
describe('buildWebSocketUrl', () => {
  it('should build WebSocket URL from http base', () => {
    expect(buildWebSocketUrl('http://example.com')).toBe('ws://example.com');
  });

  it('should build WebSocket URL with path', () => {
    expect(buildWebSocketUrl('http://example.com', '/ws')).toBe('ws://example.com/ws');
  });

  it('should build WebSocket URL from https base with path', () => {
    expect(buildWebSocketUrl('https://example.com', '/socket')).toBe('wss://example.com/socket');
  });

  it('should handle path without leading slash', () => {
    expect(buildWebSocketUrl('http://example.com', 'ws')).toBe('ws://example.com/ws');
  });
});

// isLocalhost (4 tests)
describe('isLocalhost', () => {
  it('should return true for localhost', () => {
    expect(isLocalhost('http://localhost:3000')).toBe(true);
  });

  it('should return true for 127.0.0.1', () => {
    expect(isLocalhost('http://127.0.0.1:8080')).toBe(true);
  });

  it('should return true for ::1', () => {
    expect(isLocalhost('http://[::1]:3000')).toBe(true);
  });

  it('should return false for remote host', () => {
    expect(isLocalhost('http://example.com')).toBe(false);
  });
});

// isTrycloudflareUrl (3 tests)
describe('isTrycloudflareUrl', () => {
  it('should return true for trycloudflare.com subdomain', () => {
    expect(isTrycloudflareUrl('https://my-tunnel.trycloudflare.com')).toBe(true);
  });

  it('should return false for non-trycloudflare URL', () => {
    expect(isTrycloudflareUrl('https://example.com')).toBe(false);
  });

  it('should return false for invalid URL', () => {
    expect(isTrycloudflareUrl('not-a-url')).toBe(false);
  });
});
