export interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  context?: LogContext;
  error?: Error;
  metadata?: Record<string, any>;
}

export class Logger {
  private context: LogContext;
  private logLevel: string;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  private shouldLog(level: string): boolean {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level as keyof typeof levels] <= levels[this.logLevel as keyof typeof levels];
  }

  private formatLog(level: string, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(this.context).length > 0 ? JSON.stringify(this.context) : '';
    const metadataStr = metadata ? JSON.stringify(metadata) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${contextStr} ${metadataStr}`.trim();
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  error(message: string, error?: Error | LogContext, context?: LogContext): void {
    if (this.shouldLog('error')) {
      if (error instanceof Error) {
        const errorData = {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          ...context,
        };
        console.error(this.formatLog('error', message, errorData));
      } else {
        console.error(this.formatLog('error', message, error));
      }
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', message, context));
    }
  }

  // Structured logging for specific events
  logAttendanceEvent(eventType: string, employeeId: string, context?: LogContext): void {
    this.info(`Attendance event: ${eventType}`, {
      eventType,
      employeeId,
      category: 'attendance',
      ...context,
    });
  }

  logSecurityEvent(eventType: string, userId?: string, context?: LogContext): void {
    this.warn(`Security event: ${eventType}`, {
      eventType,
      userId,
      category: 'security',
      ...context,
    });
  }

  logPerformanceMetric(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance metric: ${operation}`, {
      operation,
      duration,
      category: 'performance',
      ...context,
    });
  }

  logBusinessEvent(eventType: string, context?: LogContext): void {
    this.info(`Business event: ${eventType}`, {
      eventType,
      category: 'business',
      ...context,
    });
  }

  // Create child logger with additional context
  child(context: LogContext): Logger {
    const mergedContext = { ...this.context, ...context };
    return new Logger(mergedContext);
  }
}

// Singleton instance
export const logger = new Logger();

// Performance monitoring decorator
export function LogPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = Date.now();
    const className = target.constructor.name;
    
    try {
      const result = await method.apply(this, args);
      const duration = Date.now() - start;
      
      logger.logPerformanceMetric(`${className}.${propertyName}`, duration, {
        args: args.length,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.logPerformanceMetric(`${className}.${propertyName}`, duration, {
        args: args.length,
        success: false,
        error: (error as Error).message,
      });
      
      throw error;
    }
  };

  return descriptor;
}