import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTimestamp,
  formatDate,
  formatRelativeTime,
  truncatePreview,
  wordCount,
  charCount,
  extractCodeBlocks,
  detectLanguage,
  formatError,
  formatBytes,
  formatDuration,
  escapeHtml,
  unescapeHtml,
} from '../message-formatter.js';

// ── formatTimestamp (4 tests) ─────────────────────────────────────────────

describe('formatTimestamp', () => {
  it('formats midnight correctly', () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    expect(formatTimestamp(d.getTime())).toBe('00:00:00');
  });

  it('pads single-digit hours and minutes', () => {
    const d = new Date();
    d.setHours(9, 5, 3, 0);
    expect(formatTimestamp(d.getTime())).toBe('09:05:03');
  });

  it('formats afternoon time', () => {
    const d = new Date();
    d.setHours(14, 30, 45, 0);
    expect(formatTimestamp(d.getTime())).toBe('14:30:45');
  });

  it('formats end of day', () => {
    const d = new Date();
    d.setHours(23, 59, 59, 0);
    expect(formatTimestamp(d.getTime())).toBe('23:59:59');
  });
});

// ── formatDate (3 tests) ─────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a known date', () => {
    const d = new Date(2024, 0, 15); // Jan 15 2024
    expect(formatDate(d.getTime())).toBe('2024-01-15');
  });

  it('pads single-digit month and day', () => {
    const d = new Date(2023, 2, 5); // Mar 5 2023
    expect(formatDate(d.getTime())).toBe('2023-03-05');
  });

  it('handles December 31', () => {
    const d = new Date(2025, 11, 31); // Dec 31 2025
    expect(formatDate(d.getTime())).toBe('2025-12-31');
  });
});

// ── formatRelativeTime (6 tests) ─────────────────────────────────────────

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for < 60s ago', () => {
    expect(formatRelativeTime(Date.now() - 30_000)).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(formatRelativeTime(Date.now() - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(formatRelativeTime(Date.now() - 2 * 3_600_000)).toBe('2h ago');
  });

  it('returns days ago', () => {
    expect(formatRelativeTime(Date.now() - 3 * 86_400_000)).toBe('3d ago');
  });

  it('returns weeks ago', () => {
    expect(formatRelativeTime(Date.now() - 14 * 86_400_000)).toBe('2w ago');
  });

  it('returns months ago', () => {
    expect(formatRelativeTime(Date.now() - 60 * 86_400_000)).toBe('2mo ago');
  });
});

// ── truncatePreview (5 tests) ────────────────────────────────────────────

describe('truncatePreview', () => {
  it('returns short content unchanged', () => {
    expect(truncatePreview('hello')).toBe('hello');
  });

  it('returns content at exact maxLength unchanged', () => {
    const s = 'a'.repeat(80);
    expect(truncatePreview(s)).toBe(s);
  });

  it('truncates long content with ellipsis', () => {
    const s = 'a'.repeat(100);
    const result = truncatePreview(s);
    expect(result).toHaveLength(80);
    expect(result.endsWith('...')).toBe(true);
  });

  it('takes only the first line of multiline content', () => {
    expect(truncatePreview('first line\nsecond line')).toBe('first line');
  });

  it('returns empty string for empty input', () => {
    expect(truncatePreview('')).toBe('');
  });
});

// ── wordCount / charCount (5 tests) ──────────────────────────────────────

describe('wordCount', () => {
  it('counts words in a sentence', () => {
    expect(wordCount('hello world foo')).toBe(3);
  });

  it('returns 0 for empty string', () => {
    expect(wordCount('')).toBe(0);
  });

  it('handles extra whitespace', () => {
    expect(wordCount('  hello   world  ')).toBe(2);
  });
});

describe('charCount', () => {
  it('counts characters excluding whitespace', () => {
    expect(charCount('hello world')).toBe(10);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(charCount('   \n\t  ')).toBe(0);
  });
});

// ── extractCodeBlocks (6 tests) ──────────────────────────────────────────

describe('extractCodeBlocks', () => {
  it('extracts a single code block', () => {
    const md = '```js\nconsole.log("hi")\n```';
    const result = extractCodeBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('js');
    expect(result[0].code).toBe('console.log("hi")');
  });

  it('extracts multiple code blocks', () => {
    const md = '```js\na\n```\ntext\n```py\nb\n```';
    expect(extractCodeBlocks(md)).toHaveLength(2);
  });

  it('handles code block with language tag', () => {
    const md = '```typescript\nconst x = 1;\n```';
    const result = extractCodeBlocks(md);
    expect(result[0].language).toBe('typescript');
  });

  it('handles code block with no language', () => {
    const md = '```\nplain code\n```';
    const result = extractCodeBlocks(md);
    expect(result[0].language).toBe('');
    expect(result[0].code).toBe('plain code');
  });

  it('handles nested backticks inside code', () => {
    const md = '```js\nconst s = `hello`;\n```';
    const result = extractCodeBlocks(md);
    expect(result).toHaveLength(1);
    expect(result[0].code).toContain('`hello`');
  });

  it('returns empty array when no code blocks', () => {
    expect(extractCodeBlocks('just some text')).toEqual([]);
  });
});

// ── detectLanguage (5 tests) ─────────────────────────────────────────────

describe('detectLanguage', () => {
  it('detects javascript', () => {
    expect(detectLanguage('const x = () => 42;')).toBe('javascript');
  });

  it('detects python', () => {
    expect(detectLanguage('def hello():\n  print("hi")')).toBe('python');
  });

  it('detects bash', () => {
    expect(detectLanguage('#!/bin/bash\necho "hi"')).toBe('bash');
  });

  it('detects html', () => {
    expect(detectLanguage('<div class="foo">bar</div>')).toBe('html');
  });

  it('returns unknown for unrecognised code', () => {
    expect(detectLanguage('x := 42')).toBe('unknown');
  });
});

// ── formatError (4 tests) ────────────────────────────────────────────────

describe('formatError', () => {
  it('formats an Error object', () => {
    expect(formatError(new Error('boom'))).toBe('boom');
  });

  it('formats a string', () => {
    expect(formatError('something went wrong')).toBe('something went wrong');
  });

  it('handles null', () => {
    expect(formatError(null)).toBe('Unknown error');
  });

  it('handles a plain object', () => {
    expect(formatError({ code: 404 })).toBe('{"code":404}');
  });
});

// ── formatBytes (4 tests) ────────────────────────────────────────────────

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(2.1 * 1024 * 1024 * 1024)).toBe('2.1 GB');
  });
});

// ── formatDuration (4 tests) ─────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1200)).toBe('1.2s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(150_000)).toBe('2m 30s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(5_400_000)).toBe('1h 30m');
  });
});

// ── escapeHtml / unescapeHtml (4 tests) ──────────────────────────────────

describe('escapeHtml / unescapeHtml', () => {
  it('roundtrips correctly', () => {
    const original = '<script>alert("xss")</script>';
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });

  it('escapes all special characters', () => {
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
    expect(unescapeHtml('')).toBe('');
  });

  it('does not double-escape already escaped content', () => {
    const once = escapeHtml('a & b');
    const twice = escapeHtml(once);
    expect(unescapeHtml(unescapeHtml(twice))).toBe('a & b');
  });
});


