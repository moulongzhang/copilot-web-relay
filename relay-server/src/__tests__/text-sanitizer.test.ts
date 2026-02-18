import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  stripControlChars,
  normalizeWhitespace,
  normalizeLineEndings,
  truncate,
  truncateLines,
  filterUsageStats,
  sanitize,
  isEmpty,
  countLines,
  removeBlankLines,
  trimLines,
} from '../text-sanitizer.js';

// ─── stripAnsi (8 tests) ───────────────────────────────────────────────

describe('stripAnsi', () => {
  it('should remove color codes', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red');
  });

  it('should remove bold formatting', () => {
    expect(stripAnsi('\x1b[1mbold\x1b[22m')).toBe('bold');
  });

  it('should remove cursor movement codes', () => {
    expect(stripAnsi('\x1b[2Aup two lines')).toBe('up two lines');
  });

  it('should remove reset sequences', () => {
    expect(stripAnsi('\x1b[0mhello')).toBe('hello');
  });

  it('should remove nested ANSI codes', () => {
    expect(stripAnsi('\x1b[1m\x1b[31mbold red\x1b[0m')).toBe('bold red');
  });

  it('should return text unchanged when no ANSI codes present', () => {
    expect(stripAnsi('plain text')).toBe('plain text');
  });

  it('should handle empty string', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('should remove 256-color codes', () => {
    expect(stripAnsi('\x1b[38;5;196mcolored\x1b[0m')).toBe('colored');
  });
});

// ─── stripControlChars (5 tests) ────────────────────────────────────────

describe('stripControlChars', () => {
  it('should remove null bytes', () => {
    expect(stripControlChars('he\x00llo')).toBe('hello');
  });

  it('should preserve newlines', () => {
    expect(stripControlChars('line1\nline2')).toBe('line1\nline2');
  });

  it('should preserve tabs', () => {
    expect(stripControlChars('\tindented')).toBe('\tindented');
  });

  it('should preserve carriage returns', () => {
    expect(stripControlChars('line\r\n')).toBe('line\r\n');
  });

  it('should remove bell and backspace characters', () => {
    expect(stripControlChars('ab\x07c\x08d')).toBe('abcd');
  });
});

// ─── normalizeWhitespace (5 tests) ──────────────────────────────────────

describe('normalizeWhitespace', () => {
  it('should collapse multiple spaces to single space', () => {
    expect(normalizeWhitespace('a   b    c')).toBe('a b c');
  });

  it('should collapse tabs to single space', () => {
    expect(normalizeWhitespace('a\t\tb')).toBe('a b');
  });

  it('should trim leading and trailing whitespace per line', () => {
    expect(normalizeWhitespace('  hello  \n  world  ')).toBe('hello\nworld');
  });

  it('should normalize CRLF to LF', () => {
    expect(normalizeWhitespace('a\r\nb')).toBe('a\nb');
  });

  it('should handle empty string', () => {
    expect(normalizeWhitespace('')).toBe('');
  });
});

// ─── normalizeLineEndings (4 tests) ─────────────────────────────────────

describe('normalizeLineEndings', () => {
  it('should convert CRLF to LF', () => {
    expect(normalizeLineEndings('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('should convert standalone CR to LF', () => {
    expect(normalizeLineEndings('a\rb\rc')).toBe('a\nb\nc');
  });

  it('should leave LF unchanged', () => {
    expect(normalizeLineEndings('a\nb\nc')).toBe('a\nb\nc');
  });

  it('should handle mixed line endings', () => {
    expect(normalizeLineEndings('a\r\nb\rc\nd')).toBe('a\nb\nc\nd');
  });
});

// ─── truncate (6 tests) ─────────────────────────────────────────────────

describe('truncate', () => {
  it('should truncate long text with default suffix', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('should return text unchanged when exactly at max length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should return text unchanged when shorter than max length', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('should use custom suffix', () => {
    expect(truncate('hello world', 9, '…')).toBe('hello wo…');
  });

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('should handle zero max length', () => {
    expect(truncate('hello', 0)).toBe('');
  });
});

// ─── truncateLines (4 tests) ────────────────────────────────────────────

describe('truncateLines', () => {
  it('should keep only first N lines', () => {
    expect(truncateLines('a\nb\nc\nd', 2)).toBe('a\nb');
  });

  it('should return all lines when fewer than max', () => {
    expect(truncateLines('a\nb', 5)).toBe('a\nb');
  });

  it('should handle single line', () => {
    expect(truncateLines('hello', 1)).toBe('hello');
  });

  it('should return empty for zero lines', () => {
    expect(truncateLines('a\nb\nc', 0)).toBe('');
  });
});

// ─── filterUsageStats (5 tests) ─────────────────────────────────────────

describe('filterUsageStats', () => {
  it('should remove "Total usage est:" lines', () => {
    const input = 'output\nTotal usage est: 1234\ndone';
    expect(filterUsageStats(input)).toBe('output\ndone');
  });

  it('should remove "API time spent:" lines', () => {
    const input = 'result\nAPI time spent: 3s';
    expect(filterUsageStats(input)).toBe('result');
  });

  it('should remove model breakdown lines', () => {
    const input = 'hello\n  claude-3.5-sonnet\n  gpt-4o\nbye';
    expect(filterUsageStats(input)).toBe('hello\nbye');
  });

  it('should collapse excessive blank lines after filtering', () => {
    const input = 'start\n\n\nTotal usage est: 5\n\n\nend';
    expect(filterUsageStats(input)).toBe('start\n\nend');
  });

  it('should return text unchanged when no stats present', () => {
    const input = 'just normal output';
    expect(filterUsageStats(input)).toBe('just normal output');
  });
});

// ─── sanitize (4 tests) ─────────────────────────────────────────────────

describe('sanitize', () => {
  it('should strip ANSI and normalize whitespace', () => {
    expect(sanitize('\x1b[31mhello   world\x1b[0m')).toBe('hello world');
  });

  it('should remove control chars and normalize', () => {
    expect(sanitize('hello\x00  world')).toBe('hello world');
  });

  it('should handle combined ANSI, control chars, and irregular whitespace', () => {
    expect(sanitize('\x1b[1m\x00  spaced  \x07out  \x1b[0m')).toBe('spaced out');
  });

  it('should handle empty string', () => {
    expect(sanitize('')).toBe('');
  });
});

// ─── isEmpty (3 tests) ──────────────────────────────────────────────────

describe('isEmpty', () => {
  it('should return true for empty string', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('should return true for whitespace-only string', () => {
    expect(isEmpty('   \t\n  ')).toBe(true);
  });

  it('should return false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
  });
});

// ─── countLines / removeBlankLines / trimLines (6 tests) ────────────────

describe('countLines', () => {
  it('should count lines correctly', () => {
    expect(countLines('a\nb\nc')).toBe(3);
  });

  it('should return 0 for empty string', () => {
    expect(countLines('')).toBe(0);
  });
});

describe('removeBlankLines', () => {
  it('should collapse 3+ consecutive newlines to 2', () => {
    expect(removeBlankLines('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('should leave double newlines unchanged', () => {
    expect(removeBlankLines('a\n\nb')).toBe('a\n\nb');
  });
});

describe('trimLines', () => {
  it('should trim trailing whitespace from each line', () => {
    expect(trimLines('hello   \nworld  ')).toBe('hello\nworld');
  });

  it('should preserve leading whitespace', () => {
    expect(trimLines('  hello  \n  world  ')).toBe('  hello\n  world');
  });
});
