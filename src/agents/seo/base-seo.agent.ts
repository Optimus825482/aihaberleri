/**
 * Base SEO Agent
 *
 * Tüm SEO agent'ları için ortak fonksiyonalite:
 * 1. Metrics tracking
 * 2. Error handling
 * 3. Retry logic
 * 4. Logging
 */

export abstract class BaseSEOAgent {
  protected metrics = {
    startTime: 0,
    endTime: 0,
    duration: 0,
    apiCalls: 0,
    retries: 0,
    success: false,
  };

  protected agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;
  }

  /**
   * Start tracking
   */
  protected start(): void {
    this.metrics.startTime = Date.now();
    console.log(`🚀 ${this.agentName} başlatıldı`);
  }

  /**
   * Complete tracking
   */
  protected complete(success: boolean): void {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    this.metrics.success = success;

    if (success) {
      console.log(
        `✅ ${this.agentName} tamamlandı (${this.metrics.duration}ms, ${this.metrics.apiCalls} API calls, ${this.metrics.retries} retries)`,
      );
    } else {
      console.error(
        `❌ ${this.agentName} başarısız (${this.metrics.duration}ms, ${this.metrics.apiCalls} API calls, ${this.metrics.retries} retries)`,
      );
    }
  }

  /**
   * Get metrics
   */
  public getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Increment API call counter
   */
  protected incrementApiCalls(): void {
    this.metrics.apiCalls++;
  }

  /**
   * Increment retry counter
   */
  protected incrementRetries(): void {
    this.metrics.retries++;
  }

  /**
   * Retry with exponential backoff
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.incrementRetries();
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(
            `⏳ ${this.agentName} retry ${attempt}/${maxRetries} (${delay}ms delay)`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `❌ ${this.agentName} attempt ${attempt + 1}/${maxRetries} failed:`,
          lastError.message,
        );

        // Don't retry on certain errors
        if (
          lastError.message.includes("not found") ||
          lastError.message.includes("invalid")
        ) {
          throw lastError;
        }
      }
    }

    throw (
      lastError ||
      new Error(`${this.agentName} failed after ${maxRetries} retries`)
    );
  }

  /**
   * Execute with error handling
   */
  protected async executeWithErrorHandling<T>(
    fn: () => Promise<T>,
    errorMessage: string,
  ): Promise<T> {
    try {
      const result = await fn();
      this.complete(true);
      return result;
    } catch (error) {
      this.complete(false);
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ ${this.agentName} error:`, {
        message: err.message,
        stack: err.stack,
      });
      throw new Error(`${errorMessage}: ${err.message}`);
    }
  }
}

export default BaseSEOAgent;
