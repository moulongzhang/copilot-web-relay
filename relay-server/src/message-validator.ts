import type {
  ClientMessage,
  ServerMessage,
  PromptMessage,
  InterruptMessage,
  PingMessage,
  OpenFileMessage,
  StreamMessage,
  ToolStartMessage,
  ToolEndMessage,
  DoneMessage,
  ErrorMessage,
  PongMessage,
  FileOpenedMessage,
} from './types.js';

const MAX_PROMPT_LENGTH = 100_000;

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function validateMessageId(id: unknown): boolean {
  return typeof id === 'string' && id.length > 0;
}

export function validatePromptContent(content: unknown): { valid: boolean; error?: string } {
  if (typeof content !== 'string') {
    return { valid: false, error: 'content must be a string' };
  }
  if (content.length === 0) {
    return { valid: false, error: 'content must not be empty' };
  }
  if (content.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `content exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` };
  }
  return { valid: true };
}

export function isPromptMessage(msg: unknown): msg is PromptMessage {
  return isObject(msg) && msg.type === 'prompt' && typeof msg.content === 'string' && typeof msg.id === 'string';
}

export function isInterruptMessage(msg: unknown): msg is InterruptMessage {
  return isObject(msg) && msg.type === 'interrupt' && typeof msg.id === 'string';
}

export function isPingMessage(msg: unknown): msg is PingMessage {
  return isObject(msg) && msg.type === 'ping';
}

export function isOpenFileMessage(msg: unknown): msg is OpenFileMessage {
  return isObject(msg) && msg.type === 'open_file' && typeof msg.path === 'string' && typeof msg.id === 'string';
}

export function isStreamMessage(msg: unknown): msg is StreamMessage {
  return isObject(msg) && msg.type === 'stream' && typeof msg.content === 'string' && typeof msg.id === 'string';
}

export function isToolStartMessage(msg: unknown): msg is ToolStartMessage {
  return isObject(msg) && msg.type === 'tool_start' && typeof msg.tool === 'string' && typeof msg.detail === 'string' && typeof msg.id === 'string';
}

export function isToolEndMessage(msg: unknown): msg is ToolEndMessage {
  return isObject(msg) && msg.type === 'tool_end' && typeof msg.tool === 'string' && (msg.status === 'success' || msg.status === 'failure') && typeof msg.id === 'string';
}

export function isDoneMessage(msg: unknown): msg is DoneMessage {
  return isObject(msg) && msg.type === 'done' && typeof msg.id === 'string';
}

export function isErrorMessage(msg: unknown): msg is ErrorMessage {
  return isObject(msg) && msg.type === 'error' && typeof msg.message === 'string' && typeof msg.id === 'string';
}

export function isPongMessage(msg: unknown): msg is PongMessage {
  return isObject(msg) && msg.type === 'pong';
}

export function isFileOpenedMessage(msg: unknown): msg is FileOpenedMessage {
  return isObject(msg) && msg.type === 'file_opened' && typeof msg.path === 'string' && typeof msg.success === 'boolean' && typeof msg.id === 'string';
}

export function isValidClientMessage(msg: unknown): msg is ClientMessage {
  return isPromptMessage(msg) || isInterruptMessage(msg) || isPingMessage(msg) || isOpenFileMessage(msg);
}

export function isValidServerMessage(msg: unknown): msg is ServerMessage {
  return isStreamMessage(msg) || isToolStartMessage(msg) || isToolEndMessage(msg) || isDoneMessage(msg) || isErrorMessage(msg) || isPongMessage(msg) || isFileOpenedMessage(msg);
}

export function parseClientMessage(raw: string): { ok: true; message: ClientMessage } | { ok: false; error: string } {
  if (raw === '') {
    return { ok: false, error: 'empty string' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid JSON' };
  }
  if (isValidClientMessage(parsed)) {
    return { ok: true, message: parsed };
  }
  return { ok: false, error: 'invalid client message' };
}

export function parseServerMessage(raw: string): { ok: true; message: ServerMessage } | { ok: false; error: string } {
  if (raw === '') {
    return { ok: false, error: 'empty string' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid JSON' };
  }
  if (isValidServerMessage(parsed)) {
    return { ok: true, message: parsed };
  }
  return { ok: false, error: 'invalid server message' };
}
