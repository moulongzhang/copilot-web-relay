import type { ChatMessage } from './types.js';

export interface ChatHistoryConfig {
  maxMessages?: number;
  maxContentLength?: number;
}

const DEFAULT_MAX_MESSAGES = 100;
const DEFAULT_MAX_CONTENT_LENGTH = 100000;

export class ChatHistory {
  private messages: Map<string, ChatMessage> = new Map();
  private orderedIds: string[] = [];
  private maxMessages: number;
  private maxContentLength: number;

  constructor(config?: ChatHistoryConfig) {
    this.maxMessages = config?.maxMessages ?? DEFAULT_MAX_MESSAGES;
    this.maxContentLength = config?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
  }

  addMessage(msg: ChatMessage): void {
    const content =
      msg.content.length > this.maxContentLength
        ? msg.content.slice(0, this.maxContentLength)
        : msg.content;
    const stored: ChatMessage = { ...msg, content };
    this.messages.set(msg.id, stored);
    this.orderedIds.push(msg.id);
    this.trimToLimit();
  }

  getMessage(id: string): ChatMessage | undefined {
    return this.messages.get(id);
  }

  getMessages(): ChatMessage[] {
    return this.orderedIds
      .map((id) => this.messages.get(id))
      .filter((m): m is ChatMessage => m !== undefined);
  }

  getMessagesByRole(role: 'user' | 'assistant'): ChatMessage[] {
    return this.getMessages().filter((m) => m.role === role);
  }

  getLastN(n: number): ChatMessage[] {
    if (n <= 0) return [];
    return this.getMessages().slice(-n);
  }

  getMessageCount(): number {
    return this.messages.size;
  }

  search(query: string): ChatMessage[] {
    if (!query) return [];
    const lower = query.toLowerCase();
    return this.getMessages().filter((m) =>
      m.content.toLowerCase().includes(lower),
    );
  }

  searchByTimeRange(start: number, end: number): ChatMessage[] {
    return this.getMessages().filter(
      (m) => m.timestamp >= start && m.timestamp <= end,
    );
  }

  updateMessage(id: string, updates: Partial<ChatMessage>): boolean {
    const existing = this.messages.get(id);
    if (!existing) return false;
    const updated = { ...existing, ...updates, id: existing.id };
    this.messages.set(id, updated);
    return true;
  }

  deleteMessage(id: string): boolean {
    if (!this.messages.has(id)) return false;
    this.messages.delete(id);
    this.orderedIds = this.orderedIds.filter((oid) => oid !== id);
    return true;
  }

  clear(): void {
    this.messages.clear();
    this.orderedIds = [];
  }

  exportJSON(): string {
    return JSON.stringify(this.getMessages());
  }

  importJSON(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { imported: 0, errors: ['Invalid JSON'] };
    }
    if (!Array.isArray(parsed)) {
      return { imported: 0, errors: ['Expected an array'] };
    }
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!isValidChatMessage(item)) {
        errors.push(`Invalid message at index ${i}`);
        continue;
      }
      this.addMessage(item as ChatMessage);
      imported++;
    }
    return { imported, errors };
  }

  getStats(): { total: number; user: number; assistant: number; avgLength: number } {
    const msgs = this.getMessages();
    const total = msgs.length;
    const user = msgs.filter((m) => m.role === 'user').length;
    const assistant = msgs.filter((m) => m.role === 'assistant').length;
    const avgLength =
      total === 0
        ? 0
        : msgs.reduce((sum, m) => sum + m.content.length, 0) / total;
    return { total, user, assistant, avgLength };
  }

  trimToLimit(): number {
    let removed = 0;
    while (this.messages.size > this.maxMessages && this.orderedIds.length > 0) {
      const oldestId = this.orderedIds.shift()!;
      this.messages.delete(oldestId);
      removed++;
    }
    return removed;
  }

  hasPendingMessages(): boolean {
    return this.getMessages().some((m) => !m.done);
  }

  getLatestMessage(): ChatMessage | undefined {
    if (this.orderedIds.length === 0) return undefined;
    return this.messages.get(this.orderedIds[this.orderedIds.length - 1]);
  }
}

function isValidChatMessage(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    (o.role === 'user' || o.role === 'assistant') &&
    typeof o.content === 'string' &&
    Array.isArray(o.tools) &&
    typeof o.done === 'boolean' &&
    typeof o.timestamp === 'number'
  );
}
