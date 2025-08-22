import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { Logger } from './logger';

export interface IdempotencyKey {
  key: string;
  requestHash: string;
  response?: any;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  expiresAt: Date;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  existingResponse?: any;
  idempotencyKey: string;
}

export class IdempotencyService {
  private prisma: PrismaClient;
  private logger: Logger;
  private defaultTtl: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  // Generate idempotency key from request data
  generateIdempotencyKey(
    deviceId: string,
    operation: string,
    requestData: any,
    userId?: string
  ): string {
    const dataString = JSON.stringify({
      deviceId,
      operation,
      requestData,
      userId,
    });
    
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Generate request hash for content comparison
  private generateRequestHash(requestData: any): string {
    const normalizedData = this.normalizeRequestData(requestData);
    return crypto.createHash('md5').update(JSON.stringify(normalizedData)).digest('hex');
  }

  // Normalize request data for consistent hashing
  private normalizeRequestData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.normalizeRequestData(item)).sort();
    }

    const normalized: any = {};
    const keys = Object.keys(data).sort();
    
    for (const key of keys) {
      // Skip timestamp fields for deduplication
      if (!['timestamp', 'createdAt', 'updatedAt'].includes(key)) {
        normalized[key] = this.normalizeRequestData(data[key]);
      }
    }

    return normalized;
  }

  // Check for duplicate request and handle idempotency
  async checkIdempotency(
    deviceId: string,
    operation: string,
    requestData: any,
    userId?: string,
    customTtl?: number
  ): Promise<DeduplicationResult> {
    const idempotencyKey = this.generateIdempotencyKey(deviceId, operation, requestData, userId);
    const requestHash = this.generateRequestHash(requestData);
    
    try {
      // Check if idempotency key exists
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing) {
        // Check if expired
        if (existing.expiresAt < new Date()) {
          await this.prisma.idempotencyKey.delete({
            where: { key: idempotencyKey },
          });
          
          this.logger.info('Expired idempotency key removed', {
            idempotencyKey,
            deviceId,
            operation,
          });
          
          return { isDuplicate: false, idempotencyKey };
        }

        // Check if request content is the same
        if (existing.requestHash === requestHash) {
          this.logger.warn('Duplicate request detected', {
            idempotencyKey,
            deviceId,
            operation,
            status: existing.status,
          });

          return {
            isDuplicate: true,
            existingResponse: existing.response || null,
            idempotencyKey,
          };
        } else {
          // Same key but different content - potential replay attack
          this.logger.logSecurityEvent('idempotency_key_collision', userId, {
            idempotencyKey,
            deviceId,
            operation,
            existingHash: existing.requestHash,
            newHash: requestHash,
          });
          
          throw new Error('Idempotency key collision detected');
        }
      }

      // Create new idempotency record
      const ttl = customTtl || this.defaultTtl;
      const expiresAt = new Date(Date.now() + ttl);
      
      await this.prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          requestHash,
          status: 'processing',
          expiresAt,
        },
      });

      this.logger.info('New idempotency key created', {
        idempotencyKey,
        deviceId,
        operation,
        expiresAt,
      });

      return { isDuplicate: false, idempotencyKey };
    } catch (error) {
      this.logger.error('Idempotency check failed', error as Error, {
        idempotencyKey,
        deviceId,
        operation,
      });
      throw error;
    }
  }

  // Mark idempotency key as completed with response
  async markCompleted(idempotencyKey: string, response: any): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { key: idempotencyKey },
        data: {
          status: 'completed',
          response: JSON.stringify(response),
        },
      });

      this.logger.info('Idempotency key marked as completed', {
        idempotencyKey,
      });
    } catch (error) {
      this.logger.error('Failed to mark idempotency key as completed', error as Error, {
        idempotencyKey,
      });
    }
  }

  // Mark idempotency key as failed
  async markFailed(idempotencyKey: string, error: any): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { key: idempotencyKey },
        data: {
          status: 'failed',
          response: JSON.stringify({ error: error.message }),
        },
      });

      this.logger.info('Idempotency key marked as failed', {
        idempotencyKey,
        error: error.message,
      });
    } catch (updateError) {
      this.logger.error('Failed to mark idempotency key as failed', updateError as Error, {
        idempotencyKey,
      });
    }
  }

  // Clean up expired idempotency keys
  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.prisma.idempotencyKey.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.info('Expired idempotency keys cleaned up', {
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired idempotency keys', error as Error);
      return 0;
    }
  }

  // Device-specific deduplication for attendance
  async checkAttendanceDeduplication(
    deviceId: string,
    employeeId: string,
    fingerprintData: string,
    timestamp: Date,
    windowMinutes: number = 5
  ): Promise<boolean> {
    const windowStart = new Date(timestamp.getTime() - (windowMinutes * 60 * 1000));
    const windowEnd = new Date(timestamp.getTime() + (windowMinutes * 60 * 1000));

    try {
      const existing = await this.prisma.attendanceDeduplication.findFirst({
        where: {
          deviceId,
          employeeId,
          fingerprintHash: crypto.createHash('sha256').update(fingerprintData).digest('hex'),
          timestamp: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
      });

      if (existing) {
        this.logger.warn('Duplicate attendance detected within time window', {
          deviceId,
          employeeId,
          timestamp,
          windowMinutes,
          existingTimestamp: existing.timestamp,
        });
        return true;
      }

      // Store deduplication record
      await this.prisma.attendanceDeduplication.create({
        data: {
          deviceId,
          employeeId,
          fingerprintHash: crypto.createHash('sha256').update(fingerprintData).digest('hex'),
          timestamp,
        },
      });

      return false;
    } catch (error) {
      this.logger.error('Attendance deduplication check failed', error as Error, {
        deviceId,
        employeeId,
        timestamp,
      });
      return false; // Allow processing on error
    }
  }

  // Get idempotency statistics
  async getStatistics(): Promise<any> {
    try {
      const [total, processing, completed, failed] = await Promise.all([
        this.prisma.idempotencyKey.count(),
      this.prisma.idempotencyKey.count({ where: { status: 'processing' } }),
      this.prisma.idempotencyKey.count({ where: { status: 'completed' } }),
      this.prisma.idempotencyKey.count({ where: { status: 'failed' } }),
      ]);

      return {
        total,
        processing,
        completed,
        failed,
        successRate: total > 0 ? (completed / total) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get idempotency statistics', error as Error);
      return null;
    }
  }
}