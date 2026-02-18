export interface RateLimiterConfig {
  maxTokens: number;
  refillRate: number;
  refillInterval?: number;
}

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;
  private lastRefillTime: number;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.refillInterval = config.refillInterval ?? 1000;
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = (elapsed / this.refillInterval) * this.refillRate;
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  tryConsume(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  canConsume(tokens: number = 1): boolean {
    this.refill();
    return this.tokens >= tokens;
  }

  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  getMaxTokens(): number {
    return this.maxTokens;
  }

  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  getWaitTime(tokens: number = 1): number {
    this.refill();
    if (this.tokens >= tokens) {
      return 0;
    }
    const deficit = tokens - this.tokens;
    return Math.ceil((deficit / this.refillRate) * this.refillInterval);
  }
}

interface ClientState {
  limiter: RateLimiter;
  lastAccess: number;
}

export class PerClientRateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly clients: Map<string, ClientState> = new Map();

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  private getOrCreate(clientId: string): ClientState {
    let state = this.clients.get(clientId);
    if (!state) {
      state = {
        limiter: new RateLimiter(this.config),
        lastAccess: Date.now(),
      };
      this.clients.set(clientId, state);
    }
    state.lastAccess = Date.now();
    return state;
  }

  tryConsume(clientId: string, tokens: number = 1): boolean {
    return this.getOrCreate(clientId).limiter.tryConsume(tokens);
  }

  canConsume(clientId: string, tokens: number = 1): boolean {
    return this.getOrCreate(clientId).limiter.canConsume(tokens);
  }

  getTokens(clientId: string): number {
    return this.getOrCreate(clientId).limiter.getTokens();
  }

  reset(clientId?: string): void {
    if (clientId !== undefined) {
      const state = this.clients.get(clientId);
      if (state) {
        state.limiter.reset();
      }
    } else {
      for (const state of this.clients.values()) {
        state.limiter.reset();
      }
    }
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  cleanup(maxIdleMs: number = 60000): void {
    const now = Date.now();
    for (const [id, state] of this.clients.entries()) {
      if (now - state.lastAccess >= maxIdleMs) {
        this.clients.delete(id);
      }
    }
  }
}
