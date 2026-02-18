export interface RetryConfig {
  baseDelay?: number;
  maxDelay?: number;
  maxRetries?: number;
  backoffFactor?: number;
  jitter?: boolean;
  jitterRange?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  baseDelay: 1000,
  maxDelay: 30000,
  maxRetries: 10,
  backoffFactor: 2,
  jitter: true,
  jitterRange: 0.5,
};

export function calculateDelay(attempt: number, config: RetryConfig): number {
  const base = config.baseDelay ?? DEFAULT_CONFIG.baseDelay;
  const factor = config.backoffFactor ?? DEFAULT_CONFIG.backoffFactor;
  return base * Math.pow(factor, attempt);
}

export function addJitter(delay: number, range: number = 0.5): number {
  const jitterAmount = delay * range;
  return delay + (Math.random() * 2 - 1) * jitterAmount;
}

export function clampDelay(delay: number, max: number): number {
  return Math.min(Math.max(delay, 0), max);
}

export class RetryStrategy {
  private config: Required<RetryConfig>;
  private attempt: number = 0;
  private totalWaitTime: number = 0;

  constructor(config?: RetryConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  nextDelay(): number {
    const raw = calculateDelay(this.attempt, this.config);
    let delay = clampDelay(raw, this.config.maxDelay);
    if (this.config.jitter) {
      delay = clampDelay(addJitter(delay, this.config.jitterRange), this.config.maxDelay);
    }
    this.attempt++;
    this.totalWaitTime += delay;
    return delay;
  }

  peekDelay(): number {
    const raw = calculateDelay(this.attempt, this.config);
    return clampDelay(raw, this.config.maxDelay);
  }

  getAttempt(): number {
    return this.attempt;
  }

  shouldRetry(): boolean {
    if (this.config.maxRetries === -1) return true;
    return this.attempt < this.config.maxRetries;
  }

  reset(): void {
    this.attempt = 0;
    this.totalWaitTime = 0;
  }

  isExhausted(): boolean {
    return !this.shouldRetry();
  }

  getConfig(): Required<RetryConfig> {
    return { ...this.config };
  }

  getTotalWaitTime(): number {
    return this.totalWaitTime;
  }
}

export function createDefaultStrategy(): RetryStrategy {
  return new RetryStrategy();
}

export function createAggressiveStrategy(): RetryStrategy {
  return new RetryStrategy({
    baseDelay: 200,
    maxDelay: 5000,
    maxRetries: 20,
    backoffFactor: 1.5,
    jitter: true,
    jitterRange: 0.3,
  });
}

export function createConservativeStrategy(): RetryStrategy {
  return new RetryStrategy({
    baseDelay: 2000,
    maxDelay: 60000,
    maxRetries: 5,
    backoffFactor: 3,
    jitter: true,
    jitterRange: 0.5,
  });
}
