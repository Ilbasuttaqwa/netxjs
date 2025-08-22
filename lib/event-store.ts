import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: any;
  eventVersion: number;
  occurredAt: Date;
  correlationId?: string;
  causationId?: string;
}

export interface EventMetadata {
  userId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class EventStore {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async saveEvent(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    eventData: any,
    expectedVersion: number,
    metadata?: EventMetadata
  ): Promise<DomainEvent> {
    const eventId = randomUUID();
    const event: DomainEvent = {
      id: eventId,
      aggregateId,
      aggregateType,
      eventType,
      eventData,
      eventVersion: expectedVersion + 1,
      occurredAt: new Date(),
      correlationId: metadata?.userId,
    };

    try {
      await this.prisma.event.create({
        data: {
          id: event.id,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          eventData: event.eventData,
          version: event.eventVersion,
          timestamp: event.occurredAt,
          userId: metadata?.userId,
          metadata: metadata as any || undefined,
        },
      });

      return event;
    } catch (error) {
      if ((error as any).code === 'P2002') {
        throw new Error('Concurrency conflict: Event version mismatch');
      }
      throw error;
    }
  }

  async getEvents(
    aggregateId: string,
    fromVersion?: number
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        aggregateId,
        ...(fromVersion && { version: { gte: fromVersion } }),
      },
      orderBy: { version: 'asc' },
    });

    return events.map(event => ({
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventData: event.eventData,
      eventVersion: event.version,
      occurredAt: event.timestamp,
      correlationId: event.userId || undefined,
    }));
  }

  async getAllEvents(
    fromTimestamp?: Date,
    limit: number = 100
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.event.findMany({
      where: fromTimestamp ? { timestamp: { gte: fromTimestamp } } : {},
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    return events.map(event => ({
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventData: event.eventData,
      eventVersion: event.version,
      occurredAt: event.timestamp,
      correlationId: event.userId || undefined,
    }));
  }

  async getLastEventVersion(aggregateId: string): Promise<number> {
    const lastEvent = await this.prisma.event.findFirst({
      where: { aggregateId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return lastEvent?.version || 0;
  }
}