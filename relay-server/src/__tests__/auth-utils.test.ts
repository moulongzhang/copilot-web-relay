import { describe, it, expect } from 'vitest';
import {
  constantTimeCompare,
  validateToken,
  isValidTokenFormat,
  maskToken,
  generateToken,
  extractTokenFromHeader,
  extractBearerToken,
  isExpiredToken,
  hashToken,
  sanitizeForLog,
} from '../auth-utils.js';

// --- constantTimeCompare (6 tests) ---
describe('constantTimeCompare', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeCompare('hello', 'hello')).toBe(true);
  });

  it('returns false for non-equal strings', () => {
    expect(constantTimeCompare('hello', 'world')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(constantTimeCompare('', '')).toBe(true);
  });

  it('returns false for strings of different lengths', () => {
    expect(constantTimeCompare('short', 'muchlonger')).toBe(false);
  });

  it('handles special characters correctly', () => {
    expect(constantTimeCompare('a!@#$%^&*()', 'a!@#$%^&*()')).toBe(true);
    expect(constantTimeCompare('a!@#$%^&*()', 'b!@#$%^&*()')).toBe(false);
  });

  it('handles unicode characters correctly', () => {
    expect(constantTimeCompare('héllo', 'héllo')).toBe(true);
    expect(constantTimeCompare('héllo', 'hëllo')).toBe(false);
  });
});

// --- validateToken (5 tests) ---
describe('validateToken', () => {
  it('returns true for a valid matching token', () => {
    expect(validateToken('mytoken123', 'mytoken123')).toBe(true);
  });

  it('returns false for a non-matching token', () => {
    expect(validateToken('mytoken123', 'wrongtoken')).toBe(false);
  });

  it('returns false when expected is empty but token is not', () => {
    expect(validateToken('sometoken', '')).toBe(false);
  });

  it('returns true when both are empty', () => {
    expect(validateToken('', '')).toBe(true);
  });

  it('is case sensitive', () => {
    expect(validateToken('Token', 'token')).toBe(false);
  });
});

// --- isValidTokenFormat (7 tests) ---
describe('isValidTokenFormat', () => {
  it('returns true for a valid hex string of sufficient length', () => {
    expect(isValidTokenFormat('abcdef0123456789')).toBe(true);
  });

  it('returns false for a string shorter than 16 characters', () => {
    expect(isValidTokenFormat('abc123')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidTokenFormat('')).toBe(false);
  });

  it('returns false for a string with special characters', () => {
    expect(isValidTokenFormat('abcdef01234!@#$%')).toBe(false);
  });

  it('returns true for alphanumeric strings of sufficient length', () => {
    expect(isValidTokenFormat('abcDEF0123456789')).toBe(true);
  });

  it('returns false for strings with spaces', () => {
    expect(isValidTokenFormat('abcdef 0123456789')).toBe(false);
  });

  it('returns false for null or undefined coerced to string', () => {
    // @ts-expect-error testing invalid input
    expect(isValidTokenFormat(undefined)).toBe(false);
    // @ts-expect-error testing invalid input
    expect(isValidTokenFormat(null)).toBe(false);
  });
});

// --- maskToken (5 tests) ---
describe('maskToken', () => {
  it('masks with default 4 visible characters', () => {
    expect(maskToken('abcdef0123456789')).toBe('abcd***');
  });

  it('masks with custom visible characters', () => {
    expect(maskToken('abcdef0123456789', 6)).toBe('abcdef***');
  });

  it('handles a short token shorter than visible chars', () => {
    expect(maskToken('ab', 4)).toBe('ab***');
  });

  it('returns empty string for empty input', () => {
    expect(maskToken('')).toBe('');
  });

  it('handles a single character token', () => {
    expect(maskToken('x')).toBe('x***');
  });
});

// --- generateToken (5 tests) ---
describe('generateToken', () => {
  it('generates a token of default length (64 hex chars)', () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
  });

  it('generates a token of custom byte length', () => {
    const token = generateToken(16);
    expect(token).toHaveLength(32);
  });

  it('generates unique tokens on each call', () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });

  it('generates only hex characters', () => {
    const token = generateToken();
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('returns empty string for zero length', () => {
    expect(generateToken(0)).toBe('');
  });
});

// --- extractTokenFromHeader (6 tests) ---
describe('extractTokenFromHeader', () => {
  it('extracts token from a plain string header', () => {
    expect(extractTokenFromHeader('my-token-value')).toBe('my-token-value');
  });

  it('extracts first token from an array header', () => {
    expect(extractTokenFromHeader(['token1', 'token2'])).toBe('token1');
  });

  it('returns null for undefined header', () => {
    expect(extractTokenFromHeader(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractTokenFromHeader('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(extractTokenFromHeader('   ')).toBeNull();
  });

  it('trims whitespace from array values', () => {
    expect(extractTokenFromHeader(['  spaced  ', 'other'])).toBe('spaced');
  });
});

// --- extractBearerToken (4 tests) ---
describe('extractBearerToken', () => {
  it('extracts token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer abc123token')).toBe('abc123token');
  });

  it('returns null when no Bearer prefix', () => {
    expect(extractBearerToken('abc123token')).toBeNull();
  });

  it('returns null for empty or undefined input', () => {
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('handles case insensitive Bearer prefix', () => {
    expect(extractBearerToken('bearer mytoken')).toBe('mytoken');
    expect(extractBearerToken('BEARER mytoken')).toBe('mytoken');
  });
});

// --- isExpiredToken (4 tests) ---
describe('isExpiredToken', () => {
  it('returns false for a non-expired token', () => {
    const now = Date.now();
    expect(isExpiredToken('token', 60000, now)).toBe(false);
  });

  it('returns true for an expired token', () => {
    const pastTime = Date.now() - 120000;
    expect(isExpiredToken('token', 60000, pastTime)).toBe(true);
  });

  it('returns true when exactly at expiry boundary', () => {
    const issuedAt = Date.now() - 60000;
    expect(isExpiredToken('token', 60000, issuedAt)).toBe(true);
  });

  it('returns true for zero maxAge', () => {
    expect(isExpiredToken('token', 0, Date.now())).toBe(true);
  });
});

// --- hashToken (4 tests) ---
describe('hashToken', () => {
  it('produces deterministic output for same input', () => {
    const hash1 = hashToken('mytoken');
    const hash2 = hashToken('mytoken');
    expect(hash1).toBe(hash2);
  });

  it('produces different output for different inputs', () => {
    const hash1 = hashToken('token1');
    const hash2 = hashToken('token2');
    expect(hash1).not.toBe(hash2);
  });

  it('hashes an empty string without error', () => {
    const hash = hashToken('');
    expect(hash).toHaveLength(64);
  });

  it('returns a valid 64-char hex string', () => {
    const hash = hashToken('test');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// --- sanitizeForLog (4 tests) ---
describe('sanitizeForLog', () => {
  it('shows first 4 chars and length for normal tokens', () => {
    expect(sanitizeForLog('abcdef0123456789')).toBe('abcd...(16 chars)');
  });

  it('shows full short token with length', () => {
    expect(sanitizeForLog('ab')).toBe('ab...(2 chars)');
  });

  it('returns [empty] for empty string', () => {
    expect(sanitizeForLog('')).toBe('[empty]');
  });

  it('handles long tokens correctly', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeForLog(long)).toBe('aaaa...(100 chars)');
  });
});
