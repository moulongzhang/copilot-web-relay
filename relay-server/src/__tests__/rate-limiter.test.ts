import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter, PerClientRateLimiter } from "../rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === Constructor & defaults (4 tests) ===
  describe("constructor & defaults", () => {
    it("1. initializes with maxTokens", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 1 });
      expect(rl.getMaxTokens()).toBe(10);
    });

    it("2. starts with full tokens", () => {
      const rl = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      expect(rl.getTokens()).toBe(5);
    });

    it("3. defaults refillInterval to 1000ms", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 2 });
      rl.tryConsume(10);
      vi.advanceTimersByTime(1000);
      expect(rl.getTokens()).toBe(2);
    });

    it("4. accepts custom refillInterval", () => {
      const rl = new RateLimiter({
        maxTokens: 10,
        refillRate: 5,
        refillInterval: 500,
      });
      rl.tryConsume(10);
      vi.advanceTimersByTime(500);
      expect(rl.getTokens()).toBe(5);
    });
  });

  // === tryConsume basic (6 tests) ===
  describe("tryConsume basic", () => {
    it("5. consumes 1 token by default", () => {
      const rl = new RateLimiter({ maxTokens: 3, refillRate: 1 });
      expect(rl.tryConsume()).toBe(true);
      expect(rl.getTokens()).toBe(2);
    });

    it("6. consumes specified number of tokens", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 1 });
      expect(rl.tryConsume(5)).toBe(true);
      expect(rl.getTokens()).toBe(5);
    });

    it("7. returns false when not enough tokens", () => {
      const rl = new RateLimiter({ maxTokens: 2, refillRate: 1 });
      expect(rl.tryConsume(3)).toBe(false);
    });

    it("8. does not consume tokens on failure", () => {
      const rl = new RateLimiter({ maxTokens: 2, refillRate: 1 });
      rl.tryConsume(3);
      expect(rl.getTokens()).toBe(2);
    });

    it("9. returns false after exhausting all tokens", () => {
      const rl = new RateLimiter({ maxTokens: 2, refillRate: 1 });
      rl.tryConsume(2);
      expect(rl.tryConsume()).toBe(false);
    });

    it("10. allows consuming exactly maxTokens", () => {
      const rl = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      expect(rl.tryConsume(5)).toBe(true);
      expect(rl.getTokens()).toBe(0);
    });
  });

  // === canConsume (4 tests) ===
  describe("canConsume", () => {
    it("11. returns true when enough tokens", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 1 });
      expect(rl.canConsume(5)).toBe(true);
    });

    it("12. returns false when not enough tokens", () => {
      const rl = new RateLimiter({ maxTokens: 3, refillRate: 1 });
      expect(rl.canConsume(5)).toBe(false);
    });

    it("13. does not consume tokens", () => {
      const rl = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      rl.canConsume(3);
      expect(rl.getTokens()).toBe(5);
    });

    it("14. defaults to checking 1 token", () => {
      const rl = new RateLimiter({ maxTokens: 1, refillRate: 1 });
      expect(rl.canConsume()).toBe(true);
      rl.tryConsume();
      expect(rl.canConsume()).toBe(false);
    });
  });

  // === Token refill over time (6 tests) ===
  describe("token refill over time", () => {
    it("15. refills tokens after interval", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 2 });
      rl.tryConsume(10);
      vi.advanceTimersByTime(1000);
      expect(rl.getTokens()).toBe(2);
    });

    it("16. refills proportionally over partial intervals", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 10 });
      rl.tryConsume(10);
      vi.advanceTimersByTime(500);
      expect(rl.getTokens()).toBe(5);
    });

    it("17. does not exceed maxTokens after refill", () => {
      const rl = new RateLimiter({ maxTokens: 5, refillRate: 10 });
      rl.tryConsume(1);
      vi.advanceTimersByTime(2000);
      expect(rl.getTokens()).toBe(5);
    });

    it("18. refills correctly over multiple intervals", () => {
      const rl = new RateLimiter({ maxTokens: 20, refillRate: 5 });
      rl.tryConsume(20);
      vi.advanceTimersByTime(1000);
      expect(rl.getTokens()).toBe(5);
      vi.advanceTimersByTime(1000);
      expect(rl.getTokens()).toBe(10);
    });

    it("19. refills with custom interval", () => {
      const rl = new RateLimiter({
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 200,
      });
      rl.tryConsume(10);
      vi.advanceTimersByTime(200);
      expect(rl.getTokens()).toBe(1);
    });

    it("20. allows consuming after refill", () => {
      const rl = new RateLimiter({ maxTokens: 5, refillRate: 5 });
      rl.tryConsume(5);
      expect(rl.tryConsume()).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(rl.tryConsume()).toBe(true);
    });
  });

  // === getWaitTime (4 tests) ===
  describe("getWaitTime", () => {
    it("21. returns 0 when enough tokens available", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 1 });
      expect(rl.getWaitTime(5)).toBe(0);
    });

    it("22. returns correct wait time for deficit", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 2 });
      rl.tryConsume(10);
      expect(rl.getWaitTime(4)).toBe(2000);
    });

    it("23. returns wait time for 1 token by default", () => {
      const rl = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      rl.tryConsume(5);
      expect(rl.getWaitTime()).toBe(1000);
    });

    it("24. returns correct wait time with custom interval", () => {
      const rl = new RateLimiter({
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 500,
      });
      rl.tryConsume(10);
      expect(rl.getWaitTime(2)).toBe(1000);
    });
  });

  // === Burst handling (4 tests) ===
  describe("burst handling", () => {
    it("25. allows burst up to maxTokens", () => {
      const rl = new RateLimiter({ maxTokens: 100, refillRate: 1 });
      expect(rl.tryConsume(100)).toBe(true);
    });

    it("26. rejects burst exceeding maxTokens", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 1 });
      expect(rl.tryConsume(11)).toBe(false);
    });

    it("27. allows multiple small bursts within capacity", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 1 });
      expect(rl.tryConsume(3)).toBe(true);
      expect(rl.tryConsume(3)).toBe(true);
      expect(rl.tryConsume(3)).toBe(true);
      expect(rl.tryConsume(2)).toBe(false);
    });

    it("28. recovers from burst after refill", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 10 });
      rl.tryConsume(10);
      expect(rl.tryConsume(1)).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(rl.tryConsume(10)).toBe(true);
    });
  });

  // === reset (2 tests) ===
  describe("reset", () => {
    it("29. resets tokens to maxTokens", () => {
      const rl = new RateLimiter({ maxTokens: 10, refillRate: 1 });
      rl.tryConsume(8);
      rl.reset();
      expect(rl.getTokens()).toBe(10);
    });

    it("30. allows consumption after reset", () => {
      const rl = new RateLimiter({ maxTokens: 5, refillRate: 1 });
      rl.tryConsume(5);
      expect(rl.tryConsume()).toBe(false);
      rl.reset();
      expect(rl.tryConsume(5)).toBe(true);
    });
  });
});

describe("PerClientRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === PerClientRateLimiter basic (6 tests) ===
  describe("basic operations", () => {
    it("31. creates new client on first access", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      expect(pcrl.getTokens("client-a")).toBe(5);
      expect(pcrl.getClientCount()).toBe(1);
    });

    it("32. tryConsume works per client", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      expect(pcrl.tryConsume("client-a", 3)).toBe(true);
      expect(pcrl.getTokens("client-a")).toBe(2);
    });

    it("33. canConsume works per client", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      expect(pcrl.canConsume("client-a", 5)).toBe(true);
      expect(pcrl.canConsume("client-a", 6)).toBe(false);
    });

    it("34. removeClient deletes client state", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      pcrl.tryConsume("client-a");
      pcrl.removeClient("client-a");
      expect(pcrl.getClientCount()).toBe(0);
    });

    it("35. getClientCount tracks active clients", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      pcrl.tryConsume("a");
      pcrl.tryConsume("b");
      pcrl.tryConsume("c");
      expect(pcrl.getClientCount()).toBe(3);
    });

    it("36. reset one client resets only that client", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 10, refillRate: 1 });
      pcrl.tryConsume("a", 5);
      pcrl.tryConsume("b", 8);
      pcrl.reset("a");
      expect(pcrl.getTokens("a")).toBe(10);
      expect(pcrl.getTokens("b")).toBe(2);
    });
  });

  // === PerClientRateLimiter isolation (4 tests) ===
  describe("client isolation", () => {
    it("37. clients have independent token pools", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      pcrl.tryConsume("a", 5);
      expect(pcrl.getTokens("a")).toBe(0);
      expect(pcrl.getTokens("b")).toBe(5);
    });

    it("38. exhausting one client does not affect others", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 3, refillRate: 1 });
      pcrl.tryConsume("a", 3);
      expect(pcrl.tryConsume("a")).toBe(false);
      expect(pcrl.tryConsume("b")).toBe(true);
    });

    it("39. refill is independent per client", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 10, refillRate: 5 });
      pcrl.tryConsume("a", 10);
      vi.advanceTimersByTime(500);
      pcrl.tryConsume("b", 10);
      vi.advanceTimersByTime(500);
      // a: 500ms + 500ms = 1000ms of refill = 5 tokens
      expect(pcrl.getTokens("a")).toBe(5);
      // b: 500ms of refill = 2.5 tokens
      expect(pcrl.getTokens("b")).toBe(2.5);
    });

    it("40. reset all clients resets everyone", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 10, refillRate: 1 });
      pcrl.tryConsume("a", 5);
      pcrl.tryConsume("b", 8);
      pcrl.reset();
      expect(pcrl.getTokens("a")).toBe(10);
      expect(pcrl.getTokens("b")).toBe(10);
    });
  });

  // === PerClientRateLimiter cleanup (4 tests) ===
  describe("cleanup", () => {
    it("41. removes idle clients", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      pcrl.tryConsume("a");
      vi.advanceTimersByTime(70000);
      pcrl.cleanup(60000);
      expect(pcrl.getClientCount()).toBe(0);
    });

    it("42. keeps active clients", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      pcrl.tryConsume("a");
      vi.advanceTimersByTime(30000);
      pcrl.tryConsume("a");
      vi.advanceTimersByTime(30000);
      pcrl.cleanup(60000);
      expect(pcrl.getClientCount()).toBe(1);
    });

    it("43. removes only idle clients, keeps active ones", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      pcrl.tryConsume("a");
      pcrl.tryConsume("b");
      vi.advanceTimersByTime(50000);
      pcrl.tryConsume("b"); // refresh b
      vi.advanceTimersByTime(20000);
      pcrl.cleanup(60000);
      expect(pcrl.getClientCount()).toBe(1);
      expect(pcrl.canConsume("b")).toBe(true);
    });

    it("44. uses default maxIdleMs of 60000", () => {
      const pcrl = new PerClientRateLimiter({ maxTokens: 5, refillRate: 1 });
      pcrl.tryConsume("a");
      vi.advanceTimersByTime(59999);
      pcrl.cleanup();
      expect(pcrl.getClientCount()).toBe(1);
      vi.advanceTimersByTime(1);
      pcrl.cleanup();
      expect(pcrl.getClientCount()).toBe(0);
    });
  });
});

// === Edge cases (6 tests) ===
describe("Edge cases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("45. tryConsume with zero tokens succeeds", () => {
    const rl = new RateLimiter({ maxTokens: 5, refillRate: 1 });
    expect(rl.tryConsume(0)).toBe(true);
    expect(rl.getTokens()).toBe(5);
  });

  it("46. getWaitTime for more than maxTokens returns large value", () => {
    const rl = new RateLimiter({ maxTokens: 5, refillRate: 1 });
    rl.tryConsume(5);
    // Asking for 10 tokens when max is 5 — wait time based on math
    const wait = rl.getWaitTime(10);
    expect(wait).toBe(10000);
  });

  it("47. handles very large maxTokens", () => {
    const rl = new RateLimiter({ maxTokens: 1_000_000, refillRate: 1 });
    expect(rl.tryConsume(999_999)).toBe(true);
    expect(rl.getTokens()).toBe(1);
  });

  it("48. handles very high refill rate", () => {
    const rl = new RateLimiter({ maxTokens: 100, refillRate: 1000 });
    rl.tryConsume(100);
    vi.advanceTimersByTime(100);
    expect(rl.getTokens()).toBe(100);
  });

  it("49. concurrent clients all start with full tokens", () => {
    const pcrl = new PerClientRateLimiter({ maxTokens: 10, refillRate: 1 });
    const clients = Array.from({ length: 50 }, (_, i) => `client-${i}`);
    for (const c of clients) {
      expect(pcrl.getTokens(c)).toBe(10);
    }
    expect(pcrl.getClientCount()).toBe(50);
  });

  it("50. removeClient allows re-creation with fresh tokens", () => {
    const pcrl = new PerClientRateLimiter({ maxTokens: 10, refillRate: 1 });
    pcrl.tryConsume("x", 10);
    expect(pcrl.getTokens("x")).toBe(0);
    pcrl.removeClient("x");
    expect(pcrl.getTokens("x")).toBe(10);
  });
});
