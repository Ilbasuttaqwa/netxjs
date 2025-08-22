import { Logger } from './logger';
import { performance } from 'perf_hooks';
import os from 'os';
import { EventEmitter } from 'events';

// Metrics interfaces
export interface Metric {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: Record<string, string>;
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  timestamp: Date;
}

export interface Trace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: TraceLog[];
  status: 'ok' | 'error' | 'timeout';
}

export interface TraceLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  fields?: Record<string, any>;
}

// Metrics Collector
export class MetricsCollector {
  private metrics: Map<string, Metric[]>;
  private logger: Logger;
  private eventEmitter: EventEmitter;
  private collectionInterval: NodeJS.Timeout;

  constructor(logger: Logger) {
    this.metrics = new Map();
    this.logger = logger;
    this.eventEmitter = new EventEmitter();
    
    // Collect system metrics every 30 seconds
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  // Record a metric
  record(metric: Omit<Metric, 'timestamp'>): void {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date(),
    };

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricHistory = this.metrics.get(metric.name)!;
    metricHistory.push(fullMetric);

    // Keep only last 1000 entries per metric
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // Emit metric event for real-time monitoring
    this.eventEmitter.emit('metric', fullMetric);

    this.logger.debug('Metric recorded', {
      name: metric.name,
      value: metric.value,
      type: metric.type,
      labels: metric.labels,
    });
  }

  // Increment counter
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.record({
      name,
      value,
      type: 'counter',
      labels,
    });
  }

  // Set gauge value
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record({
      name,
      value,
      type: 'gauge',
      labels,
    });
  }

  // Record histogram value
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.record({
      name,
      value,
      type: 'histogram',
      labels,
    });
  }

  // Get metrics by name
  getMetrics(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }

  // Get all metrics
  getAllMetrics(): Map<string, Metric[]> {
    return new Map(this.metrics);
  }

  // Get metric summary
  getMetricSummary(name: string, timeWindow?: number): any {
    const metrics = this.getMetrics(name);
    
    if (metrics.length === 0) {
      return null;
    }

    const now = Date.now();
    const windowMs = timeWindow || 300000; // 5 minutes default
    
    const recentMetrics = metrics.filter(
      m => now - m.timestamp.getTime() <= windowMs
    );

    if (recentMetrics.length === 0) {
      return null;
    }

    const values = recentMetrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate percentiles
    const sorted = values.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      name,
      count: recentMetrics.length,
      sum,
      avg,
      min,
      max,
      p50,
      p95,
      p99,
      timeWindow: windowMs,
    };
  }

  // Collect system metrics
  private collectSystemMetrics(): void {
    try {
      // CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });
      
      const cpuUsage = 100 - (totalIdle / totalTick) * 100;
      this.gauge('system.cpu.usage', cpuUsage, { unit: 'percent' });

      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsage = (usedMem / totalMem) * 100;
      
      this.gauge('system.memory.total', totalMem, { unit: 'bytes' });
      this.gauge('system.memory.used', usedMem, { unit: 'bytes' });
      this.gauge('system.memory.free', freeMem, { unit: 'bytes' });
      this.gauge('system.memory.usage', memUsage, { unit: 'percent' });

      // Process metrics
      const memUsageProcess = process.memoryUsage();
      this.gauge('process.memory.rss', memUsageProcess.rss, { unit: 'bytes' });
      this.gauge('process.memory.heap_used', memUsageProcess.heapUsed, { unit: 'bytes' });
      this.gauge('process.memory.heap_total', memUsageProcess.heapTotal, { unit: 'bytes' });
      this.gauge('process.memory.external', memUsageProcess.external, { unit: 'bytes' });

      // Uptime
      this.gauge('system.uptime', os.uptime(), { unit: 'seconds' });
      this.gauge('process.uptime', process.uptime(), { unit: 'seconds' });

      // Load average (Unix only)
      if (process.platform !== 'win32') {
        const loadAvg = os.loadavg();
        this.gauge('system.load.1m', loadAvg[0]);
        this.gauge('system.load.5m', loadAvg[1]);
        this.gauge('system.load.15m', loadAvg[2]);
      }
    } catch (error) {
      this.logger.error('Failed to collect system metrics', error as Error);
    }
  }

  // Subscribe to metric events
  onMetric(callback: (metric: Metric) => void): void {
    this.eventEmitter.on('metric', callback);
  }

  // Cleanup
  destroy(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    this.eventEmitter.removeAllListeners();
  }
}

// Distributed Tracing
export class TracingService {
  private traces: Map<string, Trace>;
  private logger: Logger;
  private metricsCollector: MetricsCollector;

  constructor(logger: Logger, metricsCollector: MetricsCollector) {
    this.traces = new Map();
    this.logger = logger;
    this.metricsCollector = metricsCollector;
  }

  // Start a new trace
  startTrace(operationName: string, parentSpanId?: string): Trace {
    const traceId = this.generateId();
    const spanId = this.generateId();
    
    const trace: Trace = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: performance.now(),
      tags: {},
      logs: [],
      status: 'ok',
    };

    this.traces.set(traceId, trace);
    
    this.logger.debug('Trace started', {
      traceId,
      spanId,
      operationName,
      parentSpanId,
    });

    return trace;
  }

  // Finish a trace
  finishTrace(traceId: string, status: 'ok' | 'error' | 'timeout' = 'ok'): void {
    const trace = this.traces.get(traceId);
    
    if (!trace) {
      this.logger.warn('Trace not found', { traceId });
      return;
    }

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;

    // Record metrics
    this.metricsCollector.histogram(
      'trace.duration',
      trace.duration,
      {
        operation: trace.operationName,
        status: trace.status,
      }
    );

    this.metricsCollector.increment(
      'trace.count',
      1,
      {
        operation: trace.operationName,
        status: trace.status,
      }
    );

    this.logger.info('Trace finished', {
      traceId,
      operationName: trace.operationName,
      duration: trace.duration,
      status: trace.status,
    });

    // Clean up old traces (keep only last 1000)
    if (this.traces.size > 1000) {
      const oldestTraceId = this.traces.keys().next().value;
      if (oldestTraceId) {
        this.traces.delete(oldestTraceId);
      }
    }
  }

  // Add tag to trace
  addTag(traceId: string, key: string, value: any): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.tags[key] = value;
    }
  }

  // Add log to trace
  addLog(traceId: string, level: 'info' | 'warn' | 'error' | 'debug', message: string, fields?: Record<string, any>): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.logs.push({
        timestamp: performance.now(),
        level,
        message,
        fields,
      });
    }
  }

  // Get trace
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  // Get all traces
  getAllTraces(): Trace[] {
    return Array.from(this.traces.values());
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Health Check Service
export class HealthCheckService {
  private checks: Map<string, () => Promise<HealthCheck>>;
  private logger: Logger;
  private metricsCollector: MetricsCollector;
  private lastResults: Map<string, HealthCheck>;

  constructor(logger: Logger, metricsCollector: MetricsCollector) {
    this.checks = new Map();
    this.logger = logger;
    this.metricsCollector = metricsCollector;
    this.lastResults = new Map();
  }

  // Register health check
  register(name: string, checkFunction: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFunction);
    this.logger.info(`Health check registered: ${name}`);
  }

  // Run all health checks
  async runAllChecks(): Promise<Map<string, HealthCheck>> {
    const results = new Map<string, HealthCheck>();
    
    for (const [name, checkFunction] of Array.from(this.checks)) {
      try {
        const startTime = performance.now();
        const result = await Promise.race([
          checkFunction(),
          new Promise<HealthCheck>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 10000)
          )
        ]);
        
        const responseTime = performance.now() - startTime;
        result.responseTime = responseTime;
        result.timestamp = new Date();
        
        results.set(name, result);
        this.lastResults.set(name, result);
        
        // Record metrics
        this.metricsCollector.histogram('health_check.response_time', responseTime, { check: name });
        this.metricsCollector.gauge('health_check.status', result.status === 'healthy' ? 1 : 0, { check: name });
        
      } catch (error) {
        const result: HealthCheck = {
          name,
          status: 'unhealthy',
          message: (error as Error).message,
          timestamp: new Date(),
        };
        
        results.set(name, result);
        this.lastResults.set(name, result);
        
        this.logger.error('Health check failed', error as Error, { checkName: name });
        this.metricsCollector.gauge('health_check.status', 0, { check: name });
      }
    }
    
    return results;
  }

  // Run specific health check
  async runCheck(name: string): Promise<HealthCheck | null> {
    const checkFunction = this.checks.get(name);
    
    if (!checkFunction) {
      return null;
    }
    
    try {
      const startTime = performance.now();
      const result = await checkFunction();
      result.responseTime = performance.now() - startTime;
      result.timestamp = new Date();
      
      this.lastResults.set(name, result);
      return result;
    } catch (error) {
      const result: HealthCheck = {
        name,
        status: 'unhealthy',
        message: (error as Error).message,
        timestamp: new Date(),
      };
      
      this.lastResults.set(name, result);
      return result;
    }
  }

  // Get overall system health
  getOverallHealth(): { status: 'healthy' | 'unhealthy' | 'degraded'; checks: HealthCheck[] } {
    const checks = Array.from(this.lastResults.values());
    
    if (checks.length === 0) {
      return { status: 'unhealthy', checks: [] };
    }
    
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    return { status: overallStatus, checks };
  }

  // Get last results
  getLastResults(): Map<string, HealthCheck> {
    return new Map(this.lastResults);
  }
}

// Performance monitoring decorator
export function Monitor(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const opName = operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const tracingService = (global as any).tracingService as TracingService;
      const metricsCollector = (global as any).metricsCollector as MetricsCollector;
      
      if (!tracingService || !metricsCollector) {
        return method.apply(this, args);
      }

      const trace = tracingService.startTrace(opName);
      const startTime = performance.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = performance.now() - startTime;
        
        tracingService.addTag(trace.traceId, 'success', true);
        tracingService.finishTrace(trace.traceId, 'ok');
        
        metricsCollector.histogram('operation.duration', duration, { operation: opName, status: 'success' });
        metricsCollector.increment('operation.count', 1, { operation: opName, status: 'success' });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        tracingService.addTag(trace.traceId, 'success', false);
        tracingService.addTag(trace.traceId, 'error', (error as Error).message);
        tracingService.addLog(trace.traceId, 'error', (error as Error).message);
        tracingService.finishTrace(trace.traceId, 'error');
        
        metricsCollector.histogram('operation.duration', duration, { operation: opName, status: 'error' });
        metricsCollector.increment('operation.count', 1, { operation: opName, status: 'error' });
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Observability Facade
export class ObservabilityService {
  public metrics: MetricsCollector;
  public tracing: TracingService;
  public healthCheck: HealthCheckService;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.metrics = new MetricsCollector(logger);
    this.tracing = new TracingService(logger, this.metrics);
    this.healthCheck = new HealthCheckService(logger, this.metrics);
    
    // Set global references for decorators
    (global as any).tracingService = this.tracing;
    (global as any).metricsCollector = this.metrics;
    
    this.setupDefaultHealthChecks();
  }

  private setupDefaultHealthChecks(): void {
    // Database health check
    this.healthCheck.register('database', async () => {
      try {
        // This would be replaced with actual database ping
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          name: 'database',
          status: 'healthy',
          message: 'Database connection is healthy',
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: `Database connection failed: ${(error as Error).message}`,
          timestamp: new Date(),
        };
      }
    });

    // Memory health check
    this.healthCheck.register('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      let message: string;
      
      if (usagePercent < 70) {
        status = 'healthy';
        message = `Memory usage is normal: ${usagePercent.toFixed(1)}%`;
      } else if (usagePercent < 90) {
        status = 'degraded';
        message = `Memory usage is high: ${usagePercent.toFixed(1)}%`;
      } else {
        status = 'unhealthy';
        message = `Memory usage is critical: ${usagePercent.toFixed(1)}%`;
      }
      
      return {
        name: 'memory',
        status,
        message,
        timestamp: new Date(),
      };
    });
  }

  // Get observability dashboard data
  getDashboardData(): any {
    const overallHealth = this.healthCheck.getOverallHealth();
    const systemMetrics = {
      cpu: this.metrics.getMetricSummary('system.cpu.usage'),
      memory: this.metrics.getMetricSummary('system.memory.usage'),
      uptime: this.metrics.getMetricSummary('process.uptime'),
    };
    
    const recentTraces = this.tracing.getAllTraces()
      .filter(t => t.endTime && (Date.now() - t.endTime) < 300000) // Last 5 minutes
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, 10);
    
    return {
      health: overallHealth,
      metrics: systemMetrics,
      traces: recentTraces,
      timestamp: new Date(),
    };
  }

  // Cleanup
  destroy(): void {
    this.metrics.destroy();
  }
}