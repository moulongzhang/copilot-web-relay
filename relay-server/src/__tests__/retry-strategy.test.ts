import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RetryStrategy,
  RetryConfig,
  calculateDelay,
  addJitter,
  clampDelay,
  createDefaultStrategy,
  createAggressiveStrategy,
  createConservativeStrategy,
} from '../retry-strategy.js';

// --- Constructor & defaults (4 tests) ---
describe('Constructor & defaults', () => {
  it('should use default config when no config provided', () => {
    const s = new RetryStrategy();
    const c = s.getConfig();
    expect(c.baseDelay).toBe(1000);
    expect(c.maxDelay).toBe(30000);
    expect(c.maxRetries).toBe(10);
    expect(c.backoffFactor).toBe(2);
    expect(c.jitter).toBe(true);
    expect(c.jitterRange).toBe(0.5);
  });

  it('should override specific config values', () => {
    const s = new RetryStrategy({ baseDelay: 500, maxRetries: 5 });
    const c = s.getConfig();
    expect(c.baseDelay).toBe(500);
    expect(c.maxRetries).toBe(5);
    expect(c.maxDelay).toBe(30000);
  });

  it('should start at attempt 0', () => {
    const s = new RetryStrategy();
    expect(s.getAttempt()).toBe(0);
  });

  it('should start with zero total wait time', () => {
    const s = new RetryStrategy();
    expect(s.getTotalWaitTime()).toBe(0);
  });
});

// --- nextDelay exponential growth (6 tests) ---
describe('nextDelay exponential growth', () => {
  it('should return baseDelay for first attempt when jitter disabled', () => {
    const s = new RetryStrategy({ jitter: false });
    expect(s.nextDelay()).toBe(1000);
  });

  it('should double delay on second attempt', () => {
    const s = new RetryStrategy({ jitter: false });
    s.nextDelay();
    expect(s.nextDelay()).toBe(2000);
  });

  it('should follow exponential pattern for multiple attempts', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 100, backoffFactor: 2 });
    expect(s.nextDelay()).toBe(100);
    expect(s.nextDelay()).toBe(200);
    expect(s.nextDelay()).toBe(400);
    expect(s.nextDelay()).toBe(800);
  });

  it('should increment attempt count after each nextDelay call', () => {
    const s = new RetryStrategy({ jitter: false });
    s.nextDelay();
    expect(s.getAttempt()).toBe(1);
    s.nextDelay();
    expect(s.getAttempt()).toBe(2);
  });

  it('should respect custom backoffFactor', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 100, backoffFactor: 3 });
    expect(s.nextDelay()).toBe(100);
    expect(s.nextDelay()).toBe(300);
    expect(s.nextDelay()).toBe(900);
  });

  it('should cap delay at maxDelay', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 1000, maxDelay: 5000 });
    s.nextDelay(); // 1000
    s.nextDelay(); // 2000
    s.nextDelay(); // 4000
    expect(s.nextDelay()).toBe(5000); // would be 8000, capped
  });
});

// --- peekDelay (3 tests) ---
describe('peekDelay', () => {
  it('should return the next delay without incrementing attempt', () => {
    const s = new RetryStrategy({ jitter: false });
    const peeked = s.peekDelay();
    expect(peeked).toBe(1000);
    expect(s.getAttempt()).toBe(0);
  });

  it('should return same value on consecutive peeks', () => {
    const s = new RetryStrategy({ jitter: false });
    expect(s.peekDelay()).toBe(s.peekDelay());
  });

  it('should reflect attempt changes from nextDelay', () => {
    const s = new RetryStrategy({ jitter: false });
    s.nextDelay(); // advance to attempt 1
    expect(s.peekDelay()).toBe(2000);
  });
});

// --- shouldRetry / isExhausted (5 tests) ---
describe('shouldRetry / isExhausted', () => {
  it('should allow retries when under maxRetries', () => {
    const s = new RetryStrategy({ maxRetries: 3 });
    expect(s.shouldRetry()).toBe(true);
    expect(s.isExhausted()).toBe(false);
  });

  it('should disallow retries when maxRetries reached', () => {
    const s = new RetryStrategy({ maxRetries: 2, jitter: false });
    s.nextDelay();
    s.nextDelay();
    expect(s.shouldRetry()).toBe(false);
    expect(s.isExhausted()).toBe(true);
  });

  it('should handle maxRetries of 0', () => {
    const s = new RetryStrategy({ maxRetries: 0 });
    expect(s.shouldRetry()).toBe(false);
    expect(s.isExhausted()).toBe(true);
  });

  it('should allow infinite retries with maxRetries -1', () => {
    const s = new RetryStrategy({ maxRetries: -1, jitter: false });
    for (let i = 0; i < 100; i++) s.nextDelay();
    expect(s.shouldRetry()).toBe(true);
    expect(s.isExhausted()).toBe(false);
  });

  it('isExhausted should be inverse of shouldRetry', () => {
    const s = new RetryStrategy({ maxRetries: 1, jitter: false });
    expect(s.isExhausted()).toBe(!s.shouldRetry());
    s.nextDelay();
    expect(s.isExhausted()).toBe(!s.shouldRetry());
  });
});

// --- reset (3 tests) ---
describe('reset', () => {
  it('should reset attempt count to 0', () => {
    const s = new RetryStrategy({ jitter: false });
    s.nextDelay();
    s.nextDelay();
    s.reset();
    expect(s.getAttempt()).toBe(0);
  });

  it('should reset total wait time to 0', () => {
    const s = new RetryStrategy({ jitter: false });
    s.nextDelay();
    s.nextDelay();
    s.reset();
    expect(s.getTotalWaitTime()).toBe(0);
  });

  it('should restore shouldRetry after exhaustion', () => {
    const s = new RetryStrategy({ maxRetries: 1, jitter: false });
    s.nextDelay();
    expect(s.isExhausted()).toBe(true);
    s.reset();
    expect(s.shouldRetry()).toBe(true);
    expect(s.isExhausted()).toBe(false);
  });
});

// --- Jitter (5 tests) ---
describe('Jitter', () => {
  it('should apply jitter when enabled', () => {
    const s = new RetryStrategy({ jitter: true, baseDelay: 1000, jitterRange: 0.5 });
    const delays = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const fresh = new RetryStrategy({ jitter: true, baseDelay: 1000, jitterRange: 0.5 });
      delays.add(fresh.nextDelay());
    }
    // With jitter, we should get varied results (very unlikely all 20 are the same)
    expect(delays.size).toBeGreaterThan(1);
  });

  it('should not apply jitter when disabled', () => {
    const delays: number[] = [];
    for (let i = 0; i < 10; i++) {
      const s = new RetryStrategy({ jitter: false, baseDelay: 1000 });
      delays.push(s.nextDelay());
    }
    expect(new Set(delays).size).toBe(1);
    expect(delays[0]).toBe(1000);
  });

  it('should keep jittered delay within expected range', () => {
    const base = 1000;
    const range = 0.5;
    for (let i = 0; i < 50; i++) {
      const s = new RetryStrategy({ jitter: true, baseDelay: base, jitterRange: range, maxDelay: 50000 });
      const delay = s.nextDelay();
      expect(delay).toBeGreaterThanOrEqual(base * (1 - range));
      expect(delay).toBeLessThanOrEqual(base * (1 + range));
    }
  });

  it('should respect jitterRange of 0 producing no jitter', () => {
    const delays: number[] = [];
    for (let i = 0; i < 10; i++) {
      const s = new RetryStrategy({ jitter: true, jitterRange: 0, baseDelay: 1000 });
      delays.push(s.nextDelay());
    }
    expect(new Set(delays).size).toBe(1);
    expect(delays[0]).toBe(1000);
  });

  it('should not produce negative delays with jitter', () => {
    for (let i = 0; i < 50; i++) {
      const s = new RetryStrategy({ jitter: true, baseDelay: 10, jitterRange: 0.5 });
      expect(s.nextDelay()).toBeGreaterThanOrEqual(0);
    }
  });
});

// --- maxDelay cap (4 tests) ---
describe('maxDelay cap', () => {
  it('should cap delay at maxDelay value', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 10000, maxDelay: 15000 });
    expect(s.nextDelay()).toBe(10000);
    expect(s.nextDelay()).toBe(15000); // 20000 capped
  });

  it('should cap all subsequent delays at maxDelay', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 1000, maxDelay: 5000, maxRetries: 20 });
    for (let i = 0; i < 10; i++) {
      expect(s.nextDelay()).toBeLessThanOrEqual(5000);
    }
  });

  it('should cap peekDelay at maxDelay', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 10000, maxDelay: 12000 });
    s.nextDelay(); // attempt 0: 10000
    expect(s.peekDelay()).toBe(12000); // attempt 1: 20000 capped
  });

  it('should cap jittered delay at maxDelay', () => {
    for (let i = 0; i < 50; i++) {
      const s = new RetryStrategy({ jitter: true, baseDelay: 5000, maxDelay: 5000 });
      expect(s.nextDelay()).toBeLessThanOrEqual(5000);
    }
  });
});

// --- getTotalWaitTime (3 tests) ---
describe('getTotalWaitTime', () => {
  it('should accumulate delays from nextDelay calls', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 100 });
    s.nextDelay(); // 100
    s.nextDelay(); // 200
    expect(s.getTotalWaitTime()).toBe(300);
  });

  it('should not change with peekDelay calls', () => {
    const s = new RetryStrategy({ jitter: false });
    s.nextDelay();
    const before = s.getTotalWaitTime();
    s.peekDelay();
    expect(s.getTotalWaitTime()).toBe(before);
  });

  it('should reset to 0 after reset()', () => {
    const s = new RetryStrategy({ jitter: false });
    s.nextDelay();
    s.nextDelay();
    expect(s.getTotalWaitTime()).toBeGreaterThan(0);
    s.reset();
    expect(s.getTotalWaitTime()).toBe(0);
  });
});

// --- calculateDelay utility (4 tests) ---
describe('calculateDelay utility', () => {
  it('should return baseDelay for attempt 0', () => {
    expect(calculateDelay(0, { baseDelay: 1000, backoffFactor: 2 })).toBe(1000);
  });

  it('should calculate exponential delay', () => {
    expect(calculateDelay(3, { baseDelay: 100, backoffFactor: 2 })).toBe(800);
  });

  it('should use default values for missing config', () => {
    expect(calculateDelay(0, {})).toBe(1000); // default baseDelay
  });

  it('should handle backoffFactor of 1 producing constant delay', () => {
    expect(calculateDelay(0, { baseDelay: 500, backoffFactor: 1 })).toBe(500);
    expect(calculateDelay(5, { baseDelay: 500, backoffFactor: 1 })).toBe(500);
    expect(calculateDelay(10, { baseDelay: 500, backoffFactor: 1 })).toBe(500);
  });
});

// --- addJitter utility (3 tests) ---
describe('addJitter utility', () => {
  it('should return delay within jitter range', () => {
    for (let i = 0; i < 50; i++) {
      const result = addJitter(1000, 0.5);
      expect(result).toBeGreaterThanOrEqual(500);
      expect(result).toBeLessThanOrEqual(1500);
    }
  });

  it('should return exact delay when range is 0', () => {
    expect(addJitter(1000, 0)).toBe(1000);
  });

  it('should use default range of 0.5', () => {
    for (let i = 0; i < 50; i++) {
      const result = addJitter(1000);
      expect(result).toBeGreaterThanOrEqual(500);
      expect(result).toBeLessThanOrEqual(1500);
    }
  });
});

// --- clampDelay utility (3 tests) ---
describe('clampDelay utility', () => {
  it('should return delay when under max', () => {
    expect(clampDelay(500, 1000)).toBe(500);
  });

  it('should clamp delay to max when over', () => {
    expect(clampDelay(2000, 1000)).toBe(1000);
  });

  it('should clamp negative delay to 0', () => {
    expect(clampDelay(-100, 1000)).toBe(0);
  });
});

// --- Factory functions (4 tests) ---
describe('Factory functions', () => {
  it('createDefaultStrategy should return strategy with default config', () => {
    const s = createDefaultStrategy();
    const c = s.getConfig();
    expect(c.baseDelay).toBe(1000);
    expect(c.maxDelay).toBe(30000);
    expect(c.maxRetries).toBe(10);
  });

  it('createAggressiveStrategy should have short delays and more retries', () => {
    const s = createAggressiveStrategy();
    const c = s.getConfig();
    expect(c.baseDelay).toBeLessThan(1000);
    expect(c.maxRetries).toBeGreaterThan(10);
    expect(c.maxDelay).toBeLessThan(30000);
  });

  it('createConservativeStrategy should have longer delays and fewer retries', () => {
    const s = createConservativeStrategy();
    const c = s.getConfig();
    expect(c.baseDelay).toBeGreaterThan(1000);
    expect(c.maxRetries).toBeLessThan(10);
    expect(c.maxDelay).toBeGreaterThan(30000);
  });

  it('factory functions should return independent instances', () => {
    const a = createDefaultStrategy();
    const b = createDefaultStrategy();
    a.nextDelay();
    expect(a.getAttempt()).toBe(1);
    expect(b.getAttempt()).toBe(0);
  });
});

// --- Edge cases (3 tests) ---
describe('Edge cases', () => {
  it('should handle infinite retries (-1) without exhaustion', () => {
    const s = new RetryStrategy({ maxRetries: -1, jitter: false, baseDelay: 1, maxDelay: 10 });
    for (let i = 0; i < 1000; i++) {
      expect(s.shouldRetry()).toBe(true);
      s.nextDelay();
    }
    expect(s.isExhausted()).toBe(false);
    expect(s.getAttempt()).toBe(1000);
  });

  it('should handle zero baseDelay', () => {
    const s = new RetryStrategy({ jitter: false, baseDelay: 0 });
    expect(s.nextDelay()).toBe(0);
    expect(s.nextDelay()).toBe(0);
    expect(s.nextDelay()).toBe(0);
  });

  it('should handle very large attempt numbers without errors', () => {
    const delay = calculateDelay(1100, { baseDelay: 1, backoffFactor: 2 });
    expect(delay).toBe(Infinity);
    // But clampDelay should handle it
    expect(clampDelay(delay, 30000)).toBe(30000);
  });
});
