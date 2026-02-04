/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascade failures in the AI news pipeline by temporarily
 * blocking requests to failing services (DeepSeek, Gemini, Pollinations, SearXNG).
 *
 * @example
 * const breaker = CircuitBreaker.getCircuit('deepseek');
 * const result = await breaker.execute(() => deepseekApi.call());
 *
 * // Or use the wrapper
 * const result = await withCircuitBreaker('deepseek', () => api.call());
 */

import { EventEmitter } from "events";

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum CircuitState {
  CLOSED = "CLOSED", // Normal operation, requests flow through
  OPEN = "OPEN", // Circuit tripped, requests blocked
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting recovery (default: 60000) */
  resetTimeout: number;
  /** Successes needed in HALF_OPEN to close circuit (default: 2) */
  halfOpenSuccessThreshold: number;
  /** Optional callback on state change */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export interface CircuitMetrics {
  /** Total successful executions */
  totalSuccesses: number;
  /** Total failed executions */
  totalFailures: number;
  /** Consecutive failures (resets on success) */
  consecutiveFailures: number;
  /** Consecutive successes in HALF_OPEN state */
  halfOpenSuccesses: number;
  /** Number of times circuit opened */
  totalOpens: number;
  /** Current state */
  state: CircuitState;
  /** Last failure timestamp */
  lastFailureTime: number | null;
  /** Last success timestamp */
  lastSuccessTime: number | null;
  /** Time when circuit opened (for OPEN state) */
  openedAt: number | null;
  /** Circuit name */
  name: string;
}

export interface StateTransition {
  from: CircuitState;
  to: CircuitState;
  timestamp: number;
  reason: string;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly circuitName: string,
    public readonly state: CircuitState,
    public readonly metrics: CircuitMetrics,
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

// ============================================================================
// Circuit Breaker Events
// ============================================================================

export interface CircuitBreakerEvents {
  stateChange: (transition: StateTransition) => void;
  success: (circuitName: string, duration: number) => void;
  failure: (circuitName: string, error: Error, duration: number) => void;
  rejected: (circuitName: string) => void;
  reset: (circuitName: string) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 60_000, // 60 seconds
  halfOpenSuccessThreshold: 2,
};

// Service-specific defaults
export const SERVICE_CONFIGS: Record<string, Partial<CircuitBreakerOptions>> = {
  deepseek: {
    failureThreshold: 3,
    resetTimeout: 120_000, // 2 minutes - AI API needs more recovery time
    halfOpenSuccessThreshold: 2,
  },
  gemini: {
    failureThreshold: 3,
    resetTimeout: 120_000,
    halfOpenSuccessThreshold: 2,
  },
  pollinations: {
    failureThreshold: 5,
    resetTimeout: 60_000,
    halfOpenSuccessThreshold: 3,
  },
  searxng: {
    failureThreshold: 5,
    resetTimeout: 30_000, // Faster recovery for search
    halfOpenSuccessThreshold: 2,
  },
  brave: {
    failureThreshold: 5,
    resetTimeout: 60_000,
    halfOpenSuccessThreshold: 2,
  },
  unsplash: {
    failureThreshold: 5,
    resetTimeout: 60_000,
    halfOpenSuccessThreshold: 2,
  },
};

// ============================================================================
// Global Circuit Registry
// ============================================================================

class CircuitRegistry {
  private circuits: Map<string, CircuitBreaker> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  register(name: string, circuit: CircuitBreaker): void {
    this.circuits.set(name, circuit);
  }

  unregister(name: string): boolean {
    return this.circuits.delete(name);
  }

  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.circuits);
  }

  getAllMetrics(): Map<string, CircuitMetrics> {
    const metrics = new Map<string, CircuitMetrics>();
    this.circuits.forEach((circuit, name) => {
      metrics.set(name, circuit.getMetrics());
    });
    return metrics;
  }

  getHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    circuits: Array<{ name: string; state: CircuitState; failures: number }>;
  } {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    const circuits: Array<{
      name: string;
      state: CircuitState;
      failures: number;
    }> = [];

    this.circuits.forEach((circuit, name) => {
      const metrics = circuit.getMetrics();
      circuits.push({
        name,
        state: metrics.state,
        failures: metrics.consecutiveFailures,
      });

      switch (metrics.state) {
        case CircuitState.CLOSED:
          healthy++;
          break;
        case CircuitState.HALF_OPEN:
          degraded++;
          break;
        case CircuitState.OPEN:
          unhealthy++;
          break;
      }
    });

    return {
      total: this.circuits.size,
      healthy,
      degraded,
      unhealthy,
      circuits,
    };
  }

  resetAll(): void {
    this.circuits.forEach((circuit) => circuit.reset());
  }

  on<K extends keyof CircuitBreakerEvents>(
    event: K,
    listener: CircuitBreakerEvents[K],
  ): void {
    this.eventEmitter.on(event, listener as (...args: unknown[]) => void);
  }

  off<K extends keyof CircuitBreakerEvents>(
    event: K,
    listener: CircuitBreakerEvents[K],
  ): void {
    this.eventEmitter.off(event, listener as (...args: unknown[]) => void);
  }

  emit<K extends keyof CircuitBreakerEvents>(
    event: K,
    ...args: Parameters<CircuitBreakerEvents[K]>
  ): void {
    this.eventEmitter.emit(event, ...args);
  }
}

// Singleton registry
const globalRegistry = new CircuitRegistry();

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private options: CircuitBreakerOptions;
  private metrics: Omit<CircuitMetrics, "state" | "name">;
  private resetTimer: NodeJS.Timeout | null = null;
  private stateHistory: StateTransition[] = [];
  private readonly maxHistorySize = 100;

  constructor(
    private readonly name: string,
    options?: Partial<CircuitBreakerOptions>,
  ) {
    // Merge defaults with service-specific config and user options
    const serviceConfig = SERVICE_CONFIGS[name.toLowerCase()] || {};
    this.options = {
      ...DEFAULT_OPTIONS,
      ...serviceConfig,
      ...options,
    };

    this.metrics = {
      totalSuccesses: 0,
      totalFailures: 0,
      consecutiveFailures: 0,
      halfOpenSuccesses: 0,
      totalOpens: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      openedAt: null,
    };

    // Register with global registry
    globalRegistry.register(name, this);
  }

  // -------------------------------------------------------------------------
  // Core Execution
  // -------------------------------------------------------------------------

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit allows request
    if (!this.canExecute()) {
      globalRegistry.emit("rejected", this.name);
      throw new CircuitBreakerError(
        `Circuit breaker '${this.name}' is ${this.state}. Request rejected.`,
        this.name,
        this.state,
        this.getMetrics(),
      );
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(error as Error, Date.now() - startTime);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------

  private canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if timeout has elapsed
        if (this.shouldAttemptRecovery()) {
          this.transitionTo(CircuitState.HALF_OPEN, "Reset timeout elapsed");
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.metrics.openedAt) return false;
    return Date.now() - this.metrics.openedAt >= this.options.resetTimeout;
  }

  private onSuccess(duration: number): void {
    this.metrics.totalSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = Date.now();

    globalRegistry.emit("success", this.name, duration);

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        this.metrics.halfOpenSuccesses++;
        if (
          this.metrics.halfOpenSuccesses >=
          this.options.halfOpenSuccessThreshold
        ) {
          this.transitionTo(CircuitState.CLOSED, "Recovery successful");
        }
        break;

      case CircuitState.CLOSED:
        // Normal operation
        break;
    }
  }

  private onFailure(error: Error, duration: number): void {
    this.metrics.totalFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = Date.now();

    globalRegistry.emit("failure", this.name, error, duration);

    switch (this.state) {
      case CircuitState.CLOSED:
        if (this.metrics.consecutiveFailures >= this.options.failureThreshold) {
          this.transitionTo(
            CircuitState.OPEN,
            `Failure threshold reached (${this.metrics.consecutiveFailures})`,
          );
        }
        break;

      case CircuitState.HALF_OPEN:
        // Single failure in HALF_OPEN returns to OPEN
        this.transitionTo(CircuitState.OPEN, "Failure during recovery attempt");
        break;
    }
  }

  private transitionTo(newState: CircuitState, reason: string): void {
    const previousState = this.state;

    if (previousState === newState) return;

    this.state = newState;

    const transition: StateTransition = {
      from: previousState,
      to: newState,
      timestamp: Date.now(),
      reason,
    };

    // Update history
    this.stateHistory.push(transition);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // Handle state-specific logic
    switch (newState) {
      case CircuitState.OPEN:
        this.metrics.totalOpens++;
        this.metrics.openedAt = Date.now();
        this.metrics.halfOpenSuccesses = 0;
        this.scheduleRecoveryAttempt();
        break;

      case CircuitState.HALF_OPEN:
        this.metrics.halfOpenSuccesses = 0;
        break;

      case CircuitState.CLOSED:
        this.metrics.openedAt = null;
        this.metrics.consecutiveFailures = 0;
        this.clearRecoveryTimer();
        break;
    }

    // Emit events
    globalRegistry.emit("stateChange", transition);
    this.options.onStateChange?.(previousState, newState);

    // Log state change
    console.log(
      `[CircuitBreaker:${this.name}] ${previousState} → ${newState} (${reason})`,
    );
  }

  private scheduleRecoveryAttempt(): void {
    this.clearRecoveryTimer();

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionTo(CircuitState.HALF_OPEN, "Scheduled recovery attempt");
      }
    }, this.options.resetTimeout);
  }

  private clearRecoveryTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  getState(): CircuitState {
    // Check for automatic recovery if OPEN
    if (this.state === CircuitState.OPEN && this.shouldAttemptRecovery()) {
      this.transitionTo(CircuitState.HALF_OPEN, "Reset timeout elapsed");
    }
    return this.state;
  }

  getMetrics(): CircuitMetrics {
    return {
      ...this.metrics,
      state: this.getState(),
      name: this.name,
    };
  }

  getStateHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  getTimeUntilRecovery(): number | null {
    if (this.state !== CircuitState.OPEN || !this.metrics.openedAt) {
      return null;
    }
    const elapsed = Date.now() - this.metrics.openedAt;
    const remaining = this.options.resetTimeout - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  reset(): void {
    const previousState = this.state;

    this.state = CircuitState.CLOSED;
    this.metrics = {
      totalSuccesses: 0,
      totalFailures: 0,
      consecutiveFailures: 0,
      halfOpenSuccesses: 0,
      totalOpens: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      openedAt: null,
    };
    this.stateHistory = [];
    this.clearRecoveryTimer();

    globalRegistry.emit("reset", this.name);

    if (previousState !== CircuitState.CLOSED) {
      console.log(
        `[CircuitBreaker:${this.name}] Manually reset from ${previousState}`,
      );
    }
  }

  forceOpen(reason = "Manual intervention"): void {
    this.transitionTo(CircuitState.OPEN, reason);
  }

  forceClose(reason = "Manual intervention"): void {
    this.transitionTo(CircuitState.CLOSED, reason);
    this.metrics.consecutiveFailures = 0;
  }

  // -------------------------------------------------------------------------
  // Static Registry Methods
  // -------------------------------------------------------------------------

  static getCircuit(
    name: string,
    options?: Partial<CircuitBreakerOptions>,
  ): CircuitBreaker {
    const existing = globalRegistry.get(name);
    if (existing) {
      return existing;
    }
    return new CircuitBreaker(name, options);
  }

  static getAllCircuits(): Map<string, CircuitBreaker> {
    return globalRegistry.getAll();
  }

  static getAllMetrics(): Map<string, CircuitMetrics> {
    return globalRegistry.getAllMetrics();
  }

  static getHealthSummary(): ReturnType<CircuitRegistry["getHealthSummary"]> {
    return globalRegistry.getHealthSummary();
  }

  static resetAll(): void {
    globalRegistry.resetAll();
  }

  static on<K extends keyof CircuitBreakerEvents>(
    event: K,
    listener: CircuitBreakerEvents[K],
  ): void {
    globalRegistry.on(event, listener);
  }

  static off<K extends keyof CircuitBreakerEvents>(
    event: K,
    listener: CircuitBreakerEvents[K],
  ): void {
    globalRegistry.off(event, listener);
  }
}

// ============================================================================
// Convenience Wrapper
// ============================================================================

/**
 * Execute a function with circuit breaker protection.
 * Creates or retrieves an existing circuit by name.
 *
 * @example
 * const response = await withCircuitBreaker('deepseek', async () => {
 *   return await deepseekApi.generateContent(prompt);
 * });
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options?: Partial<CircuitBreakerOptions>,
): Promise<T> {
  const circuit = CircuitBreaker.getCircuit(name, options);
  return circuit.execute(fn);
}

/**
 * Decorator-style wrapper for class methods.
 *
 * @example
 * class DeepSeekService {
 *   generateContent = circuitBreakerWrap('deepseek', async (prompt: string) => {
 *     return await this.api.call(prompt);
 *   });
 * }
 */
export function circuitBreakerWrap<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options?: Partial<CircuitBreakerOptions>,
): (...args: TArgs) => Promise<TResult> {
  const circuit = CircuitBreaker.getCircuit(name, options);

  return async (...args: TArgs): Promise<TResult> => {
    return circuit.execute(() => fn(...args));
  };
}

// ============================================================================
// Fallback Helpers
// ============================================================================

export interface FallbackOptions<T> {
  /** Fallback value or function when circuit is open */
  fallback: T | (() => T | Promise<T>);
  /** Whether to use fallback on any error (not just circuit open) */
  fallbackOnError?: boolean;
}

/**
 * Execute with circuit breaker and fallback value.
 *
 * @example
 * const result = await withCircuitBreakerFallback(
 *   'deepseek',
 *   async () => await api.call(),
 *   { fallback: defaultValue, fallbackOnError: true }
 * );
 */
export async function withCircuitBreakerFallback<T>(
  name: string,
  fn: () => Promise<T>,
  options: FallbackOptions<T>,
): Promise<T> {
  const circuit = CircuitBreaker.getCircuit(name);

  try {
    return await circuit.execute(fn);
  } catch (error) {
    // Always use fallback for CircuitBreakerError (circuit is open)
    const isCircuitOpen = error instanceof CircuitBreakerError;

    if (isCircuitOpen || options.fallbackOnError) {
      const fallback = options.fallback;
      if (typeof fallback === "function") {
        return await (fallback as () => T | Promise<T>)();
      }
      return fallback;
    }

    throw error;
  }
}

// ============================================================================
// Monitoring & Logging Setup
// ============================================================================

/**
 * Setup default logging for circuit breaker events.
 * Call this once at application startup.
 */
export function setupCircuitBreakerLogging(): void {
  CircuitBreaker.on("stateChange", (transition) => {
    const emoji =
      transition.to === CircuitState.OPEN
        ? "🔴"
        : transition.to === CircuitState.HALF_OPEN
          ? "🟡"
          : "🟢";
    console.log(
      `${emoji} [CircuitBreaker] State change: ${transition.from} → ${transition.to} (${transition.reason})`,
    );
  });

  CircuitBreaker.on("rejected", (name) => {
    console.warn(
      `⛔ [CircuitBreaker:${name}] Request rejected - circuit is open`,
    );
  });

  CircuitBreaker.on("failure", (name, error, duration) => {
    console.error(
      `❌ [CircuitBreaker:${name}] Failure after ${duration}ms:`,
      error.message,
    );
  });
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  CircuitBreakerOptions,
  CircuitMetrics,
  StateTransition,
  CircuitBreakerEvents,
  FallbackOptions,
};
