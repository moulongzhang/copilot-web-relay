import { timingSafeEqual, randomBytes, createHash } from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate a token against an expected value using timing-safe comparison.
 */
export function validateToken(token: string, expected: string): boolean {
  return constantTimeCompare(token, expected);
}

/**
 * Check if a token has a valid format: non-empty, min 16 chars, only hex/alphanumeric.
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || token.length < 16) {
    return false;
  }
  return /^[a-zA-Z0-9]+$/.test(token);
}

/**
 * Mask a token for display, showing only the first N characters.
 */
export function maskToken(token: string, visibleChars: number = 4): string {
  if (token.length === 0) {
    return '';
  }
  if (token.length <= visibleChars) {
    return token.slice(0, visibleChars) + '***';
  }
  return token.slice(0, visibleChars) + '***';
}

/**
 * Generate a random hex token.
 */
export function generateToken(length: number = 32): string {
  if (length <= 0) {
    return '';
  }
  return randomBytes(length).toString('hex');
}

/**
 * Extract a token from Sec-WebSocket-Protocol or Authorization header value.
 */
export function extractTokenFromHeader(header: string | string[] | undefined): string | null {
  if (header === undefined || header === null) {
    return null;
  }
  if (Array.isArray(header)) {
    const first = header[0];
    if (!first || first.trim().length === 0) {
      return null;
    }
    return first.trim();
  }
  const trimmed = header.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

/**
 * Extract bearer token from an Authorization header value.
 */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const match = header.match(/^bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

/**
 * Check if a token has expired based on issued time and max age.
 */
export function isExpiredToken(token: string, maxAgeMs: number, issuedAt: number): boolean {
  if (maxAgeMs <= 0) {
    return true;
  }
  return Date.now() - issuedAt >= maxAgeMs;
}

/**
 * SHA-256 hash of a token for safe storage or logging.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a safe representation of a token for logging.
 */
export function sanitizeForLog(token: string): string {
  if (token.length === 0) {
    return '[empty]';
  }
  if (token.length <= 4) {
    return `${token}...(${token.length} chars)`;
  }
  return `${token.slice(0, 4)}...(${token.length} chars)`;
}
