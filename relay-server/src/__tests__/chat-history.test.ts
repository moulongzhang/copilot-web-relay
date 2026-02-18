import { describe, it, expect, beforeEach } from 'vitest';
import { ChatHistory } from '../chat-history.js';
import type { ChatMessage } from '../types.js';

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: overrides.id ?? `msg-${Math.random().toString(36).slice(2, 8)}`,
    role: overrides.role ?? 'user',
    content: overrides.content ?? 'hello',
    tools: overrides.tools ?? [],
    done: overrides.done ?? true,
    timestamp: overrides.timestamp ?? Date.now(),
  };
}

describe('ChatHistory', () => {
  let history: ChatHistory;

  beforeEach(() => {
    history = new ChatHistory();
  });

  // ── Constructor & defaults (3 tests) ──

  describe('constructor & defaults', () => {
    it('creates instance with default config', () => {
      const h = new ChatHistory();
      expect(h.getMessageCount()).toBe(0);
    });

    it('accepts custom maxMessages', () => {
      const h = new ChatHistory({ maxMessages: 5 });
      for (let i = 0; i < 10; i++) {
        h.addMessage(makeMsg({ id: `m${i}` }));
      }
      expect(h.getMessageCount()).toBe(5);
    });

    it('accepts custom maxContentLength and truncates content', () => {
      const h = new ChatHistory({ maxContentLength: 10 });
      h.addMessage(makeMsg({ id: 'long', content: 'a'.repeat(50) }));
      expect(h.getMessage('long')!.content.length).toBe(10);
    });
  });

  // ── addMessage & getMessage (6 tests) ──

  describe('addMessage & getMessage', () => {
    it('adds a message and retrieves it by id', () => {
      const msg = makeMsg({ id: 'a1' });
      history.addMessage(msg);
      expect(history.getMessage('a1')).toEqual(msg);
    });

    it('returns undefined for non-existent id', () => {
      expect(history.getMessage('nope')).toBeUndefined();
    });

    it('stores multiple messages', () => {
      history.addMessage(makeMsg({ id: 'x1' }));
      history.addMessage(makeMsg({ id: 'x2' }));
      expect(history.getMessageCount()).toBe(2);
    });

    it('overwrites message with same id', () => {
      history.addMessage(makeMsg({ id: 'dup', content: 'first' }));
      history.addMessage(makeMsg({ id: 'dup', content: 'second' }));
      expect(history.getMessage('dup')!.content).toBe('second');
    });

    it('preserves message fields', () => {
      const msg = makeMsg({
        id: 'f1',
        role: 'assistant',
        content: 'hi',
        tools: [{ tool: 't', detail: 'd', status: 'success' }],
        done: false,
        timestamp: 1000,
      });
      history.addMessage(msg);
      const stored = history.getMessage('f1')!;
      expect(stored.role).toBe('assistant');
      expect(stored.tools).toHaveLength(1);
      expect(stored.done).toBe(false);
      expect(stored.timestamp).toBe(1000);
    });

    it('increments message count on add', () => {
      expect(history.getMessageCount()).toBe(0);
      history.addMessage(makeMsg({ id: 'c1' }));
      expect(history.getMessageCount()).toBe(1);
      history.addMessage(makeMsg({ id: 'c2' }));
      expect(history.getMessageCount()).toBe(2);
    });
  });

  // ── getMessages / getMessagesByRole (5 tests) ──

  describe('getMessages / getMessagesByRole', () => {
    it('returns all messages in insertion order', () => {
      history.addMessage(makeMsg({ id: 'o1' }));
      history.addMessage(makeMsg({ id: 'o2' }));
      history.addMessage(makeMsg({ id: 'o3' }));
      const ids = history.getMessages().map((m) => m.id);
      expect(ids).toEqual(['o1', 'o2', 'o3']);
    });

    it('returns empty array when no messages', () => {
      expect(history.getMessages()).toEqual([]);
    });

    it('filters user messages only', () => {
      history.addMessage(makeMsg({ id: 'u1', role: 'user' }));
      history.addMessage(makeMsg({ id: 'a1', role: 'assistant' }));
      history.addMessage(makeMsg({ id: 'u2', role: 'user' }));
      const users = history.getMessagesByRole('user');
      expect(users).toHaveLength(2);
      expect(users.every((m) => m.role === 'user')).toBe(true);
    });

    it('filters assistant messages only', () => {
      history.addMessage(makeMsg({ id: 'u1', role: 'user' }));
      history.addMessage(makeMsg({ id: 'a1', role: 'assistant' }));
      const assistants = history.getMessagesByRole('assistant');
      expect(assistants).toHaveLength(1);
      expect(assistants[0].id).toBe('a1');
    });

    it('returns empty array when no messages match role', () => {
      history.addMessage(makeMsg({ id: 'u1', role: 'user' }));
      expect(history.getMessagesByRole('assistant')).toEqual([]);
    });
  });

  // ── getLastN (4 tests) ──

  describe('getLastN', () => {
    it('returns last N messages', () => {
      for (let i = 0; i < 5; i++) history.addMessage(makeMsg({ id: `n${i}` }));
      const last2 = history.getLastN(2);
      expect(last2.map((m) => m.id)).toEqual(['n3', 'n4']);
    });

    it('returns all messages if N exceeds count', () => {
      history.addMessage(makeMsg({ id: 'only' }));
      expect(history.getLastN(10)).toHaveLength(1);
    });

    it('returns empty array for N=0', () => {
      history.addMessage(makeMsg({ id: 'z' }));
      expect(history.getLastN(0)).toEqual([]);
    });

    it('returns empty array for negative N', () => {
      history.addMessage(makeMsg({ id: 'z' }));
      expect(history.getLastN(-1)).toEqual([]);
    });
  });

  // ── search (5 tests) ──

  describe('search', () => {
    it('finds messages containing query substring', () => {
      history.addMessage(makeMsg({ id: 's1', content: 'hello world' }));
      history.addMessage(makeMsg({ id: 's2', content: 'goodbye' }));
      const results = history.search('hello');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('s1');
    });

    it('is case-insensitive', () => {
      history.addMessage(makeMsg({ id: 'ci', content: 'Hello World' }));
      expect(history.search('hello world')).toHaveLength(1);
    });

    it('returns empty array for no matches', () => {
      history.addMessage(makeMsg({ id: 'nm', content: 'abc' }));
      expect(history.search('xyz')).toEqual([]);
    });

    it('returns empty array for empty query', () => {
      history.addMessage(makeMsg({ id: 'eq', content: 'abc' }));
      expect(history.search('')).toEqual([]);
    });

    it('finds multiple matching messages', () => {
      history.addMessage(makeMsg({ id: 'mm1', content: 'foo bar' }));
      history.addMessage(makeMsg({ id: 'mm2', content: 'bar baz' }));
      history.addMessage(makeMsg({ id: 'mm3', content: 'qux' }));
      expect(history.search('bar')).toHaveLength(2);
    });
  });

  // ── searchByTimeRange (4 tests) ──

  describe('searchByTimeRange', () => {
    it('finds messages within time range', () => {
      history.addMessage(makeMsg({ id: 't1', timestamp: 100 }));
      history.addMessage(makeMsg({ id: 't2', timestamp: 200 }));
      history.addMessage(makeMsg({ id: 't3', timestamp: 300 }));
      const results = history.searchByTimeRange(150, 250);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('t2');
    });

    it('includes boundary timestamps', () => {
      history.addMessage(makeMsg({ id: 'b1', timestamp: 100 }));
      history.addMessage(makeMsg({ id: 'b2', timestamp: 200 }));
      const results = history.searchByTimeRange(100, 200);
      expect(results).toHaveLength(2);
    });

    it('returns empty array for no matches', () => {
      history.addMessage(makeMsg({ id: 'tr', timestamp: 100 }));
      expect(history.searchByTimeRange(200, 300)).toEqual([]);
    });

    it('returns empty array when history is empty', () => {
      expect(history.searchByTimeRange(0, 1000)).toEqual([]);
    });
  });

  // ── updateMessage (4 tests) ──

  describe('updateMessage', () => {
    it('updates content of existing message', () => {
      history.addMessage(makeMsg({ id: 'up1', content: 'old' }));
      const result = history.updateMessage('up1', { content: 'new' });
      expect(result).toBe(true);
      expect(history.getMessage('up1')!.content).toBe('new');
    });

    it('returns false for non-existent id', () => {
      expect(history.updateMessage('nope', { content: 'x' })).toBe(false);
    });

    it('preserves id even if updates include different id', () => {
      history.addMessage(makeMsg({ id: 'keep' }));
      history.updateMessage('keep', { id: 'changed' } as Partial<ChatMessage>);
      expect(history.getMessage('keep')).toBeDefined();
      expect(history.getMessage('changed')).toBeUndefined();
    });

    it('can update multiple fields at once', () => {
      history.addMessage(makeMsg({ id: 'mu', content: 'a', done: false }));
      history.updateMessage('mu', { content: 'b', done: true });
      const msg = history.getMessage('mu')!;
      expect(msg.content).toBe('b');
      expect(msg.done).toBe(true);
    });
  });

  // ── deleteMessage (3 tests) ──

  describe('deleteMessage', () => {
    it('removes existing message', () => {
      history.addMessage(makeMsg({ id: 'del1' }));
      expect(history.deleteMessage('del1')).toBe(true);
      expect(history.getMessage('del1')).toBeUndefined();
      expect(history.getMessageCount()).toBe(0);
    });

    it('returns false for non-existent id', () => {
      expect(history.deleteMessage('nope')).toBe(false);
    });

    it('does not affect other messages', () => {
      history.addMessage(makeMsg({ id: 'd1' }));
      history.addMessage(makeMsg({ id: 'd2' }));
      history.deleteMessage('d1');
      expect(history.getMessageCount()).toBe(1);
      expect(history.getMessage('d2')).toBeDefined();
    });
  });

  // ── clear (2 tests) ──

  describe('clear', () => {
    it('removes all messages', () => {
      history.addMessage(makeMsg({ id: 'c1' }));
      history.addMessage(makeMsg({ id: 'c2' }));
      history.clear();
      expect(history.getMessageCount()).toBe(0);
      expect(history.getMessages()).toEqual([]);
    });

    it('is safe to call on empty history', () => {
      history.clear();
      expect(history.getMessageCount()).toBe(0);
    });
  });

  // ── exportJSON / importJSON (6 tests) ──

  describe('exportJSON / importJSON', () => {
    it('exports messages as JSON string', () => {
      history.addMessage(makeMsg({ id: 'e1', content: 'hi' }));
      const json = history.exportJSON();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('e1');
    });

    it('exports empty array for empty history', () => {
      expect(history.exportJSON()).toBe('[]');
    });

    it('imports valid JSON messages', () => {
      const msgs = [makeMsg({ id: 'i1' }), makeMsg({ id: 'i2' })];
      const result = history.importJSON(JSON.stringify(msgs));
      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(history.getMessageCount()).toBe(2);
    });

    it('reports errors for invalid messages in array', () => {
      const data = [makeMsg({ id: 'ok' }), { id: 'bad' }];
      const result = history.importJSON(JSON.stringify(data));
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('index 1');
    });

    it('handles invalid JSON gracefully', () => {
      const result = history.importJSON('not json{{{');
      expect(result.imported).toBe(0);
      expect(result.errors).toContain('Invalid JSON');
    });

    it('round-trips export and import', () => {
      const m1 = makeMsg({ id: 'rt1', content: 'round' });
      const m2 = makeMsg({ id: 'rt2', content: 'trip' });
      history.addMessage(m1);
      history.addMessage(m2);
      const json = history.exportJSON();
      const h2 = new ChatHistory();
      h2.importJSON(json);
      expect(h2.getMessageCount()).toBe(2);
      expect(h2.getMessage('rt1')!.content).toBe('round');
      expect(h2.getMessage('rt2')!.content).toBe('trip');
    });
  });

  // ── getStats (3 tests) ──

  describe('getStats', () => {
    it('returns zeroes for empty history', () => {
      const stats = history.getStats();
      expect(stats).toEqual({ total: 0, user: 0, assistant: 0, avgLength: 0 });
    });

    it('counts user and assistant messages', () => {
      history.addMessage(makeMsg({ id: 's1', role: 'user' }));
      history.addMessage(makeMsg({ id: 's2', role: 'assistant' }));
      history.addMessage(makeMsg({ id: 's3', role: 'user' }));
      const stats = history.getStats();
      expect(stats.total).toBe(3);
      expect(stats.user).toBe(2);
      expect(stats.assistant).toBe(1);
    });

    it('calculates average content length', () => {
      history.addMessage(makeMsg({ id: 'al1', content: 'abcd' }));    // 4
      history.addMessage(makeMsg({ id: 'al2', content: 'abcdef' }));  // 6
      const stats = history.getStats();
      expect(stats.avgLength).toBe(5);
    });
  });

  // ── trimToLimit (3 tests) ──

  describe('trimToLimit', () => {
    it('removes oldest messages beyond maxMessages', () => {
      const h = new ChatHistory({ maxMessages: 3 });
      for (let i = 0; i < 5; i++) h.addMessage(makeMsg({ id: `tr${i}` }));
      expect(h.getMessageCount()).toBe(3);
      expect(h.getMessage('tr0')).toBeUndefined();
      expect(h.getMessage('tr1')).toBeUndefined();
      expect(h.getMessage('tr4')).toBeDefined();
    });

    it('returns 0 when under limit', () => {
      const h = new ChatHistory({ maxMessages: 10 });
      h.addMessage(makeMsg({ id: 'x' }));
      const removed = h.trimToLimit();
      expect(removed).toBe(0);
    });

    it('trims automatically on addMessage', () => {
      const h = new ChatHistory({ maxMessages: 2 });
      h.addMessage(makeMsg({ id: 'a1' }));
      h.addMessage(makeMsg({ id: 'a2' }));
      h.addMessage(makeMsg({ id: 'a3' }));
      expect(h.getMessageCount()).toBe(2);
      expect(h.getMessage('a1')).toBeUndefined();
    });
  });

  // ── hasPendingMessages / getLatestMessage (2 tests) ──

  describe('hasPendingMessages / getLatestMessage', () => {
    it('detects pending messages', () => {
      history.addMessage(makeMsg({ id: 'p1', done: true }));
      expect(history.hasPendingMessages()).toBe(false);
      history.addMessage(makeMsg({ id: 'p2', done: false }));
      expect(history.hasPendingMessages()).toBe(true);
    });

    it('returns latest message or undefined', () => {
      expect(history.getLatestMessage()).toBeUndefined();
      history.addMessage(makeMsg({ id: 'l1' }));
      history.addMessage(makeMsg({ id: 'l2' }));
      expect(history.getLatestMessage()!.id).toBe('l2');
    });
  });
});
