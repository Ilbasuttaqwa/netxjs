import { EventEmitter } from 'events';
import { DomainEvent } from './event-store';
import { Logger } from './logger';

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}

export interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  retryCount?: number;
  deadLetterQueue?: boolean;
}

export class EventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EventHandler[]>;
  private logger: Logger;
  private retryAttempts: Map<string, number>;

  constructor(logger: Logger) {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.logger = logger;
    this.retryAttempts = new Map();
    this.emitter.setMaxListeners(100);
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    
    this.subscriptions.get(eventType)!.push(handler);
    
    this.emitter.on(eventType, async (event: DomainEvent) => {
      await this.handleEvent(event, handler);
    });

    this.logger.info(`Subscribed to event: ${eventType}`);
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      this.logger.info(`Publishing event: ${event.eventType}`, {
        eventId: event.id,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
      });

      // Emit to all subscribers
      this.emitter.emit(event.eventType, event);
      
      // Also emit to wildcard subscribers
      this.emitter.emit('*', event);

      this.logger.info(`Event published successfully: ${event.eventType}`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.eventType}`, error as Error);
      throw error;
    }
  }

  private async handleEvent(event: DomainEvent, handler: EventHandler): Promise<void> {
    const handlerKey = `${event.id}-${handler.constructor.name}`;
    
    try {
      await handler.handle(event);
      
      // Reset retry count on success
      this.retryAttempts.delete(handlerKey);
      
      this.logger.info(`Event handled successfully`, {
        eventId: event.id,
        eventType: event.eventType,
        handler: handler.constructor.name,
      });
    } catch (error) {
      const currentRetries = this.retryAttempts.get(handlerKey) || 0;
      const maxRetries = 3;

      this.logger.error(`Event handler failed`, {
        eventId: event.id,
        eventType: event.eventType,
        handler: handler.constructor.name,
        attempt: currentRetries + 1,
        error: (error as Error).message,
      });

      if (currentRetries < maxRetries) {
        this.retryAttempts.set(handlerKey, currentRetries + 1);
        
        // Exponential backoff retry
        const delay = Math.pow(2, currentRetries) * 1000;
        setTimeout(() => {
          this.handleEvent(event, handler);
        }, delay);
      } else {
        // Send to dead letter queue
        this.logger.error(`Event moved to dead letter queue after ${maxRetries} retries`, {
          eventId: event.id,
          eventType: event.eventType,
          handler: handler.constructor.name,
        });
        
        this.emitter.emit('dead-letter', {
          event,
          handler: handler.constructor.name,
          error: (error as Error).message,
        });
      }
    }
  }

  subscribeToAll(handler: EventHandler): void {
    this.emitter.on('*', async (event: DomainEvent) => {
      await this.handleEvent(event, handler);
    });
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscriptions.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.emitter.removeListener(eventType, handler.handle);
        this.logger.info(`Unsubscribed from event: ${eventType}`);
      }
    }
  }

  getSubscriptionCount(eventType: string): number {
    return this.subscriptions.get(eventType)?.length || 0;
  }

  getAllEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}