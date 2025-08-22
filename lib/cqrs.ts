import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';
import { EventBus, EventHandler } from './event-bus';
import { DomainEvent } from './event-store';

// Command interfaces
export interface Command {
  id: string;
  type: string;
  aggregateId: string;
  payload: any;
  userId: string;
  timestamp: Date;
}

export interface CommandHandler {
  handle(command: Command): Promise<any>;
}

// Query interfaces
export interface Query {
  type: string;
  parameters: any;
}

export interface QueryHandler {
  handle(query: Query): Promise<any>;
}

// Read Model interfaces
export interface ReadModel {
  id: string;
  type: string;
  data: any;
  version: number;
  lastUpdated: Date;
}

// Command Bus
export class CommandBus {
  private handlers: Map<string, CommandHandler>;
  private logger: Logger;

  constructor(logger: Logger) {
    this.handlers = new Map();
    this.logger = logger;
  }

  register(commandType: string, handler: CommandHandler): void {
    this.handlers.set(commandType, handler);
    this.logger.info(`Command handler registered: ${commandType}`);
  }

  async execute(command: Command): Promise<any> {
    const handler = this.handlers.get(command.type);
    
    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    this.logger.info('Executing command', {
      commandId: command.id,
      commandType: command.type,
      aggregateId: command.aggregateId,
      userId: command.userId,
    });

    try {
      const result = await handler.handle(command);
      
      this.logger.info('Command executed successfully', {
        commandId: command.id,
        commandType: command.type,
      });

      return result;
    } catch (error) {
      this.logger.error('Command execution failed', error as Error, {
        commandId: command.id,
        commandType: command.type,
      });
      throw error;
    }
  }
}

// Query Bus
export class QueryBus {
  private handlers: Map<string, QueryHandler>;
  private logger: Logger;

  constructor(logger: Logger) {
    this.handlers = new Map();
    this.logger = logger;
  }

  register(queryType: string, handler: QueryHandler): void {
    this.handlers.set(queryType, handler);
    this.logger.info(`Query handler registered: ${queryType}`);
  }

  async execute(query: Query): Promise<any> {
    const handler = this.handlers.get(query.type);
    
    if (!handler) {
      throw new Error(`No handler registered for query: ${query.type}`);
    }

    this.logger.debug('Executing query', {
      queryType: query.type,
      parameters: query.parameters,
    });

    try {
      const result = await handler.handle(query);
      
      this.logger.debug('Query executed successfully', {
        queryType: query.type,
        resultCount: Array.isArray(result) ? result.length : 1,
      });

      return result;
    } catch (error) {
      this.logger.error('Query execution failed', error as Error, {
        queryType: query.type,
      });
      throw error;
    }
  }
}

// Read Model Manager
export class ReadModelManager implements EventHandler {
  private prisma: PrismaClient;
  private logger: Logger;
  private projections: Map<string, ReadModelProjection>;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
    this.projections = new Map();
  }

  // Event handler implementation
  async handle(event: DomainEvent): Promise<void> {
    for (const [name, projection] of Array.from(this.projections)) {
      if (projection.interestedEvents.includes(event.eventType)) {
        try {
          await projection.project(event);
          this.logger.debug('Read model updated', {
            projection: name,
            eventType: event.eventType,
            eventId: event.id,
          });
        } catch (error) {
          this.logger.error('Read model projection failed', error as Error, {
            projection: name,
            eventType: event.eventType,
            eventId: event.id,
          });
        }
      }
    }
  }

  registerProjection(name: string, projection: ReadModelProjection): void {
    this.projections.set(name, projection);
    this.logger.info(`Read model projection registered: ${name}`);
  }

  async getReadModel(type: string, id: string): Promise<ReadModel | null> {
    try {
      const readModel = await this.prisma.readModel.findUnique({
        where: {
          type_id: {
            type,
            id,
          },
        },
      });

      if (!readModel) {
        return null;
      }

      return {
        id: readModel.id,
        type: readModel.type,
        data: readModel.data,
        version: readModel.version,
        lastUpdated: readModel.lastUpdated,
      };
    } catch (error) {
      this.logger.error('Failed to get read model', error as Error, { type, id });
      return null;
    }
  }

  async saveReadModel(readModel: ReadModel): Promise<void> {
    try {
      await this.prisma.readModel.upsert({
        where: {
          type_id: {
            type: readModel.type,
            id: readModel.id,
          },
        },
        update: {
          data: JSON.stringify(readModel.data),
          version: readModel.version,
          lastUpdated: readModel.lastUpdated,
        },
        create: {
          id: readModel.id,
          type: readModel.type,
          data: JSON.stringify(readModel.data),
          version: readModel.version,
          lastUpdated: readModel.lastUpdated,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save read model', error as Error, {
        type: readModel.type,
        id: readModel.id,
      });
      throw error;
    }
  }

  async rebuildProjection(projectionName: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection not found: ${projectionName}`);
    }

    this.logger.info(`Rebuilding projection: ${projectionName}`);

    try {
      // Clear existing read models for this projection
      await this.prisma.readModel.deleteMany({
        where: { type: projection.readModelType },
      });

      // Replay all events
      const events = await this.prisma.event.findMany({
        where: {
          eventType: { in: projection.interestedEvents },
        },
        orderBy: { timestamp: 'asc' },
      });

      for (const eventRecord of events) {
        const event: DomainEvent = {
          id: eventRecord.id,
          aggregateId: eventRecord.aggregateId,
          aggregateType: eventRecord.aggregateType,
          eventType: eventRecord.eventType,
          eventData: eventRecord.eventData,
          eventVersion: eventRecord.version,
          occurredAt: eventRecord.timestamp,
          correlationId: (eventRecord.metadata as any)?.correlationId || null,
        };

        await projection.project(event);
      }

      this.logger.info(`Projection rebuilt successfully: ${projectionName}`, {
        eventsProcessed: events.length,
      });
    } catch (error) {
      this.logger.error('Failed to rebuild projection', error as Error, {
        projectionName,
      });
      throw error;
    }
  }
}

// Read Model Projection interface
export interface ReadModelProjection {
  readModelType: string;
  interestedEvents: string[];
  project(event: DomainEvent): Promise<void>;
}

// Dashboard Read Model Projections
export class DashboardStatsProjection implements ReadModelProjection {
  readModelType = 'dashboard_stats';
  interestedEvents = ['AttendanceRecorded', 'PayrollCalculated', 'EmployeeAdded', 'EmployeeUpdated'];

  constructor(
    private prisma: PrismaClient,
    private readModelManager: ReadModelManager,
    private logger: Logger
  ) {}

  async project(event: DomainEvent): Promise<void> {
    const today = new Date();
    const statsId = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    let stats = await this.readModelManager.getReadModel('dashboard_stats', statsId);
    
    if (!stats) {
      stats = {
        id: statsId,
        type: 'dashboard_stats',
        data: {
          date: today.toISOString().split('T')[0],
          totalEmployees: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
          totalPayroll: 0,
          avgWorkingHours: 0,
        },
        version: 0,
        lastUpdated: new Date(),
      };
    }

    switch (event.eventType) {
      case 'AttendanceRecorded':
        await this.updateAttendanceStats(stats, event);
        break;
      case 'PayrollCalculated':
        await this.updatePayrollStats(stats, event);
        break;
      case 'EmployeeAdded':
        stats.data.totalEmployees += 1;
        break;
      case 'EmployeeUpdated':
        // Handle employee status changes
        break;
    }

    stats.version += 1;
    stats.lastUpdated = new Date();
    
    await this.readModelManager.saveReadModel(stats);
  }

  private async updateAttendanceStats(stats: ReadModel, event: DomainEvent): Promise<void> {
    const attendanceData = event.eventData;
    const eventDate = new Date(attendanceData.timestamp);
    const today = new Date();
    
    // Only update if attendance is for today
    if (eventDate.toDateString() === today.toDateString()) {
      if (attendanceData.type === 'check_in') {
        stats.data.presentToday += 1;
        
        // Check if late
        const workStartTime = new Date(today);
        workStartTime.setHours(8, 0, 0, 0); // Assuming 8 AM start time
        
        if (eventDate > workStartTime) {
          stats.data.lateToday += 1;
        }
      }
    }
  }

  private async updatePayrollStats(stats: ReadModel, event: DomainEvent): Promise<void> {
    const payrollData = event.eventData;
    stats.data.totalPayroll += payrollData.totalAmount || 0;
  }
}

// Employee Performance Projection
export class EmployeePerformanceProjection implements ReadModelProjection {
  readModelType = 'employee_performance';
  interestedEvents = ['AttendanceRecorded', 'PayrollCalculated', 'PerformanceReviewed'];

  constructor(
    private prisma: PrismaClient,
    private readModelManager: ReadModelManager,
    private logger: Logger
  ) {}

  async project(event: DomainEvent): Promise<void> {
    const employeeId = event.eventData.employeeId;
    if (!employeeId) return;

    let performance = await this.readModelManager.getReadModel('employee_performance', employeeId);
    
    if (!performance) {
      performance = {
        id: employeeId,
        type: 'employee_performance',
        data: {
          employeeId,
          totalWorkingDays: 0,
          totalLateCount: 0,
          totalAbsentCount: 0,
          averageWorkingHours: 0,
          totalSalary: 0,
          performanceScore: 100,
          lastUpdated: new Date(),
        },
        version: 0,
        lastUpdated: new Date(),
      };
    }

    switch (event.eventType) {
      case 'AttendanceRecorded':
        await this.updateAttendancePerformance(performance, event);
        break;
      case 'PayrollCalculated':
        await this.updatePayrollPerformance(performance, event);
        break;
      case 'PerformanceReviewed':
        await this.updatePerformanceScore(performance, event);
        break;
    }

    performance.version += 1;
    performance.lastUpdated = new Date();
    
    await this.readModelManager.saveReadModel(performance);
  }

  private async updateAttendancePerformance(performance: ReadModel, event: DomainEvent): Promise<void> {
    const attendanceData = event.eventData;
    
    if (attendanceData.type === 'check_in') {
      performance.data.totalWorkingDays += 1;
      
      // Check if late
      const checkInTime = new Date(attendanceData.timestamp);
      const workStartTime = new Date(checkInTime);
      workStartTime.setHours(8, 0, 0, 0);
      
      if (checkInTime > workStartTime) {
        performance.data.totalLateCount += 1;
      }
    }
    
    // Calculate performance score
    this.calculatePerformanceScore(performance);
  }

  private async updatePayrollPerformance(performance: ReadModel, event: DomainEvent): Promise<void> {
    const payrollData = event.eventData;
    performance.data.totalSalary += payrollData.totalAmount || 0;
  }

  private async updatePerformanceScore(performance: ReadModel, event: DomainEvent): Promise<void> {
    const reviewData = event.eventData;
    performance.data.performanceScore = reviewData.score || performance.data.performanceScore;
  }

  private calculatePerformanceScore(performance: ReadModel): void {
    const { totalWorkingDays, totalLateCount, totalAbsentCount } = performance.data;
    
    if (totalWorkingDays === 0) {
      performance.data.performanceScore = 100;
      return;
    }
    
    const lateRate = totalLateCount / totalWorkingDays;
    const absentRate = totalAbsentCount / totalWorkingDays;
    
    // Simple scoring algorithm
    let score = 100;
    score -= (lateRate * 20); // -20 points for each late percentage
    score -= (absentRate * 50); // -50 points for each absent percentage
    
    performance.data.performanceScore = Math.max(0, Math.min(100, score));
  }
}

// CQRS Facade
export class CQRSFacade {
  constructor(
    public commandBus: CommandBus,
    public queryBus: QueryBus,
    public readModelManager: ReadModelManager,
    private logger: Logger
  ) {}

  async executeCommand(command: Command): Promise<any> {
    return await this.commandBus.execute(command);
  }

  async executeQuery(query: Query): Promise<any> {
    return await this.queryBus.execute(query);
  }

  async getReadModel(type: string, id: string): Promise<ReadModel | null> {
    return await this.readModelManager.getReadModel(type, id);
  }

  registerCommandHandler(commandType: string, handler: CommandHandler): void {
    this.commandBus.register(commandType, handler);
  }

  registerQueryHandler(queryType: string, handler: QueryHandler): void {
    this.queryBus.register(queryType, handler);
  }

  registerProjection(name: string, projection: ReadModelProjection): void {
    this.readModelManager.registerProjection(name, projection);
  }

  async rebuildProjection(projectionName: string): Promise<void> {
    await this.readModelManager.rebuildProjection(projectionName);
  }
}