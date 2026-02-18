import { describe, it, expect } from 'vitest';
import {
  isValidClientMessage,
  isValidServerMessage,
  isPromptMessage,
  isInterruptMessage,
  isPingMessage,
  isOpenFileMessage,
  isStreamMessage,
  isToolStartMessage,
  isToolEndMessage,
  isDoneMessage,
  isErrorMessage,
  isPongMessage,
  isFileOpenedMessage,
  validateMessageId,
  validatePromptContent,
  parseClientMessage,
  parseServerMessage,
} from '../message-validator.js';

// --- isValidClientMessage (8 tests) ---

describe('isValidClientMessage', () => {
  it('returns true for a valid prompt message', () => {
    expect(isValidClientMessage({ type: 'prompt', content: 'hello', id: '1' })).toBe(true);
  });

  it('returns true for a valid interrupt message', () => {
    expect(isValidClientMessage({ type: 'interrupt', id: '2' })).toBe(true);
  });

  it('returns true for a valid ping message', () => {
    expect(isValidClientMessage({ type: 'ping' })).toBe(true);
  });

  it('returns true for a valid open_file message', () => {
    expect(isValidClientMessage({ type: 'open_file', path: '/foo.ts', id: '3' })).toBe(true);
  });

  it('returns false for an invalid type', () => {
    expect(isValidClientMessage({ type: 'unknown', id: '4' })).toBe(false);
  });

  it('returns false when required fields are missing', () => {
    expect(isValidClientMessage({ type: 'prompt' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidClientMessage(null)).toBe(false);
  });

  it('returns false for a non-object value', () => {
    expect(isValidClientMessage('hello')).toBe(false);
  });
});

// --- isValidServerMessage (8 tests) ---

describe('isValidServerMessage', () => {
  it('returns true for a valid stream message', () => {
    expect(isValidServerMessage({ type: 'stream', content: 'data', id: '1' })).toBe(true);
  });

  it('returns true for a valid tool_start message', () => {
    expect(isValidServerMessage({ type: 'tool_start', tool: 'grep', detail: 'searching', id: '2' })).toBe(true);
  });

  it('returns true for a valid tool_end message', () => {
    expect(isValidServerMessage({ type: 'tool_end', tool: 'grep', status: 'success', id: '3' })).toBe(true);
  });

  it('returns true for a valid done message', () => {
    expect(isValidServerMessage({ type: 'done', id: '4' })).toBe(true);
  });

  it('returns true for a valid error message', () => {
    expect(isValidServerMessage({ type: 'error', message: 'fail', id: '5' })).toBe(true);
  });

  it('returns true for a valid pong message', () => {
    expect(isValidServerMessage({ type: 'pong' })).toBe(true);
  });

  it('returns true for a valid file_opened message', () => {
    expect(isValidServerMessage({ type: 'file_opened', path: '/a.ts', success: true, id: '6' })).toBe(true);
  });

  it('returns false for an invalid server message', () => {
    expect(isValidServerMessage({ type: 'nonsense' })).toBe(false);
  });
});

// --- Individual type guards (10 tests) ---

describe('individual type guards', () => {
  it('isPromptMessage accepts valid prompt', () => {
    expect(isPromptMessage({ type: 'prompt', content: 'hi', id: '1' })).toBe(true);
  });

  it('isPromptMessage rejects missing content', () => {
    expect(isPromptMessage({ type: 'prompt', id: '1' })).toBe(false);
  });

  it('isInterruptMessage accepts valid interrupt', () => {
    expect(isInterruptMessage({ type: 'interrupt', id: '1' })).toBe(true);
  });

  it('isInterruptMessage rejects missing id', () => {
    expect(isInterruptMessage({ type: 'interrupt' })).toBe(false);
  });

  it('isPingMessage accepts valid ping', () => {
    expect(isPingMessage({ type: 'ping' })).toBe(true);
  });

  it('isOpenFileMessage rejects missing path', () => {
    expect(isOpenFileMessage({ type: 'open_file', id: '1' })).toBe(false);
  });

  it('isStreamMessage accepts valid stream', () => {
    expect(isStreamMessage({ type: 'stream', content: 'x', id: '1' })).toBe(true);
  });

  it('isToolStartMessage rejects missing detail', () => {
    expect(isToolStartMessage({ type: 'tool_start', tool: 'grep', id: '1' })).toBe(false);
  });

  it('isToolEndMessage rejects invalid status', () => {
    expect(isToolEndMessage({ type: 'tool_end', tool: 'grep', status: 'unknown', id: '1' })).toBe(false);
  });

  it('isFileOpenedMessage rejects non-boolean success', () => {
    expect(isFileOpenedMessage({ type: 'file_opened', path: '/a', success: 'yes', id: '1' })).toBe(false);
  });
});

// --- validateMessageId (5 tests) ---

describe('validateMessageId', () => {
  it('returns true for a non-empty string', () => {
    expect(validateMessageId('abc')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(validateMessageId('')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(validateMessageId(42)).toBe(false);
  });

  it('returns false for null', () => {
    expect(validateMessageId(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateMessageId(undefined)).toBe(false);
  });
});

// --- validatePromptContent (7 tests) ---

describe('validatePromptContent', () => {
  it('returns valid for a normal string', () => {
    expect(validatePromptContent('hello')).toEqual({ valid: true });
  });

  it('returns error for non-string input', () => {
    const result = validatePromptContent(123);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('content must be a string');
  });

  it('returns error for empty string', () => {
    const result = validatePromptContent('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('content must not be empty');
  });

  it('returns error for content exceeding max length', () => {
    const result = validatePromptContent('a'.repeat(100_001));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });

  it('returns valid for content exactly at max length', () => {
    expect(validatePromptContent('a'.repeat(100_000))).toEqual({ valid: true });
  });

  it('returns error for null', () => {
    expect(validatePromptContent(null).valid).toBe(false);
  });

  it('returns error for an array', () => {
    expect(validatePromptContent(['hello']).valid).toBe(false);
  });
});

// --- parseClientMessage (6 tests) ---

describe('parseClientMessage', () => {
  it('parses valid prompt JSON', () => {
    const raw = JSON.stringify({ type: 'prompt', content: 'hi', id: '1' });
    const result = parseClientMessage(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message.type).toBe('prompt');
  });

  it('returns error for invalid JSON', () => {
    const result = parseClientMessage('{bad json}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid JSON');
  });

  it('parses valid ping message', () => {
    const result = parseClientMessage(JSON.stringify({ type: 'ping' }));
    expect(result.ok).toBe(true);
  });

  it('returns error for valid JSON but invalid message', () => {
    const result = parseClientMessage(JSON.stringify({ type: 'bad' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid client message');
  });

  it('returns error for empty string', () => {
    const result = parseClientMessage('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('empty string');
  });

  it('parses message with nested objects in extra fields', () => {
    const raw = JSON.stringify({ type: 'prompt', content: 'hi', id: '1', meta: { foo: 'bar' } });
    const result = parseClientMessage(raw);
    expect(result.ok).toBe(true);
  });
});

// --- parseServerMessage (6 tests) ---

describe('parseServerMessage', () => {
  it('parses valid stream JSON', () => {
    const raw = JSON.stringify({ type: 'stream', content: 'data', id: '1' });
    const result = parseServerMessage(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.message.type).toBe('stream');
  });

  it('returns error for invalid JSON', () => {
    const result = parseServerMessage('not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid JSON');
  });

  it('parses valid pong message', () => {
    const result = parseServerMessage(JSON.stringify({ type: 'pong' }));
    expect(result.ok).toBe(true);
  });

  it('returns error for valid JSON but invalid message', () => {
    const result = parseServerMessage(JSON.stringify({ type: 'nope' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid server message');
  });

  it('returns error for empty string', () => {
    const result = parseServerMessage('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('empty string');
  });

  it('parses message with extra nested fields', () => {
    const raw = JSON.stringify({ type: 'done', id: '1', extra: { nested: true } });
    const result = parseServerMessage(raw);
    expect(result.ok).toBe(true);
  });
});
