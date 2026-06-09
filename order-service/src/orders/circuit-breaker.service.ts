import { Injectable, Logger } from '@nestjs/common';
import * as CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breaker: CircuitBreaker;

  constructor() {
    // Concept: Set up circuit breaker rules, timing thresholds, and reset delays
    const options = {
      timeout: 3000, // Timeout requests after 3 seconds
      errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
      resetTimeout: 10000, // Stay open for 10 seconds before transitioning to HALF-OPEN
    };

    // Concept: Wrap asynchronous execution function with circuit breaking policies
    this.breaker = new CircuitBreaker(async (fn: () => Promise<any>) => fn(), options);

    // Concept: Hook into lifecycle events to log state transitions (CLOSED, OPEN, HALF-OPEN)
    this.breaker.on('open', () => this.logger.error('=== CIRCUIT BREAKER OPENED: Failing fast on downstream calls ==='));
    this.breaker.on('halfOpen', () => this.logger.warn('=== CIRCUIT BREAKER HALF-OPEN: Testing downstream recovery ==='));
    this.breaker.on('close', () => this.logger.log('=== CIRCUIT BREAKER CLOSED: Connection recovered, normal operations active ==='));
  }

  // Concept: Execute downstream tasks safely wrapped by circuit breaking policies
  async fire<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.fire(fn) as Promise<T>;
  }

  // Concept: Get current state status of the circuit breaker for metrics/monitoring endpoints
  getBreakerState() {
    return {
      state: this.breaker.opened ? 'OPEN' : this.breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
    };
  }
}
