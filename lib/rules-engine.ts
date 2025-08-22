import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';
import { EventBus, EventHandler } from './event-bus';
import { DomainEvent } from './event-store';

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  isActive: boolean;
  validFrom: Date;
  validTo?: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'between';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'deduction' | 'bonus' | 'notification' | 'approval_required' | 'block' | 'custom';
  parameters: any;
}

export interface RuleExecutionContext {
  employeeId: string;
  branchId?: string;
  departmentId?: string;
  positionId?: string;
  attendanceData?: any;
  payrollData?: any;
  timestamp: Date;
  [key: string]: any;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  executed: boolean;
  actions: ExecutedAction[];
  reason?: string;
  executionTime: number;
}

export interface ExecutedAction {
  type: string;
  parameters: any;
  result: any;
  success: boolean;
  error?: string;
}

export class RulesEngine implements EventHandler {
  private prisma: PrismaClient;
  private logger: Logger;
  private eventBus: EventBus;
  private rulesCache: Map<string, Rule[]>;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;

  constructor(prisma: PrismaClient, logger: Logger, eventBus: EventBus) {
    this.prisma = prisma;
    this.logger = logger;
    this.eventBus = eventBus;
    this.rulesCache = new Map();
  }

  // Event handler implementation
  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType === 'AttendanceRecorded') {
      await this.processAttendanceRules(event.eventData);
    } else if (event.eventType === 'PayrollCalculationStarted') {
      await this.processPayrollRules(event.eventData);
    }
  }

  // Load rules from database with caching
  private async loadRules(category?: string): Promise<Rule[]> {
    const cacheKey = category || 'all';
    const now = Date.now();

    // Check cache validity
    if (this.rulesCache.has(cacheKey) && (now - this.lastCacheUpdate) < this.cacheExpiry) {
      return this.rulesCache.get(cacheKey)!;
    }

    try {
      const rules = await this.prisma.businessRules.findMany({
        where: {
          isActive: true,
          validFrom: { lte: new Date() },
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ],
          ...(category && { category })
        },
        orderBy: { priority: 'desc' }
      });

      const parsedRules: Rule[] = rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        conditions: JSON.parse(rule.conditions as string),
        actions: JSON.parse(rule.actions as string),
        priority: rule.priority,
        isActive: rule.isActive,
        validFrom: rule.validFrom,
        validTo: rule.validTo || undefined,
        createdBy: rule.createdBy,
        updatedBy: rule.updatedBy,
        version: rule.version,
      }));

      this.rulesCache.set(cacheKey, parsedRules);
      this.lastCacheUpdate = now;

      this.logger.info(`Loaded ${parsedRules.length} rules for category: ${cacheKey}`);
      return parsedRules;
    } catch (error) {
      this.logger.error('Failed to load rules', error as Error, { category });
      return [];
    }
  }

  // Execute rules for given context
  async executeRules(category: string, context: RuleExecutionContext): Promise<RuleExecutionResult[]> {
    const startTime = Date.now();
    const rules = await this.loadRules(category);
    const results: RuleExecutionResult[] = [];

    this.logger.info('Executing rules', {
      category,
      ruleCount: rules.length,
      employeeId: context.employeeId,
    });

    for (const rule of rules) {
      const ruleStartTime = Date.now();
      
      try {
        const shouldExecute = await this.evaluateConditions(rule.conditions, context);
        
        if (shouldExecute) {
          const executedActions = await this.executeActions(rule.actions, context);
          
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            executed: true,
            actions: executedActions,
            executionTime: Date.now() - ruleStartTime,
          });

          // Log rule execution
          await this.logRuleExecution(rule.id, context, executedActions, true);
          
          this.logger.logBusinessEvent('rule_executed', {
            ruleId: rule.id,
            ruleName: rule.name,
            employeeId: context.employeeId,
            actionsCount: executedActions.length,
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            executed: false,
            actions: [],
            reason: 'Conditions not met',
            executionTime: Date.now() - ruleStartTime,
          });
        }
      } catch (error) {
        this.logger.error('Rule execution failed', error as Error, {
          ruleId: rule.id,
          ruleName: rule.name,
          employeeId: context.employeeId,
        });

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executed: false,
          actions: [],
          reason: (error as Error).message,
          executionTime: Date.now() - ruleStartTime,
        });
      }
    }

    const totalTime = Date.now() - startTime;
    this.logger.logPerformanceMetric('rules_execution', totalTime, {
      category,
      ruleCount: rules.length,
      executedCount: results.filter(r => r.executed).length,
    });

    return results;
  }

  // Evaluate rule conditions
  private async evaluateConditions(conditions: RuleCondition[], context: RuleExecutionContext): Promise<boolean> {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogicalOp = 'AND';

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, context);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (currentLogicalOp === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      // Set logical operator for next iteration
      if (condition.logicalOperator) {
        currentLogicalOp = condition.logicalOperator;
      }
    }

    return result;
  }

  // Evaluate single condition
  private evaluateCondition(condition: RuleCondition, context: RuleExecutionContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return fieldValue === conditionValue;
      case 'ne':
        return fieldValue !== conditionValue;
      case 'gt':
        return fieldValue > conditionValue;
      case 'gte':
        return fieldValue >= conditionValue;
      case 'lt':
        return fieldValue < conditionValue;
      case 'lte':
        return fieldValue <= conditionValue;
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'nin':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(conditionValue);
      case 'between':
        return Array.isArray(conditionValue) && 
               conditionValue.length === 2 && 
               fieldValue >= conditionValue[0] && 
               fieldValue <= conditionValue[1];
      default:
        return false;
    }
  }

  // Get field value from context
  private getFieldValue(field: string, context: RuleExecutionContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // Execute rule actions
  private async executeActions(actions: RuleAction[], context: RuleExecutionContext): Promise<ExecutedAction[]> {
    const executedActions: ExecutedAction[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        executedActions.push({
          type: action.type,
          parameters: action.parameters,
          result,
          success: true,
        });
      } catch (error) {
        executedActions.push({
          type: action.type,
          parameters: action.parameters,
          result: null,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return executedActions;
  }

  // Execute single action
  private async executeAction(action: RuleAction, context: RuleExecutionContext): Promise<any> {
    switch (action.type) {
      case 'deduction':
        return await this.applyDeduction(action.parameters, context);
      case 'bonus':
        return await this.applyBonus(action.parameters, context);
      case 'notification':
        return await this.sendNotification(action.parameters, context);
      case 'approval_required':
        return await this.requireApproval(action.parameters, context);
      case 'block':
        return await this.blockAction(action.parameters, context);
      case 'custom':
        return await this.executeCustomAction(action.parameters, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Apply salary deduction
  private async applyDeduction(parameters: any, context: RuleExecutionContext): Promise<any> {
    const { amount, type, reason } = parameters;
    
    // Create deduction record
    const deduction = await this.prisma.payrollDeductions.create({
      data: {
        employeeId: context.employeeId,
        amount: parseFloat(amount),
        type,
        reason,
        appliedDate: new Date(),
        status: 'applied',
      },
    });

    return { deductionId: deduction.id, amount: deduction.amount };
  }

  // Apply bonus
  private async applyBonus(parameters: any, context: RuleExecutionContext): Promise<any> {
    const { amount, type, reason } = parameters;
    
    const bonus = await this.prisma.payrollBonuses.create({
      data: {
        employeeId: context.employeeId,
        amount: parseFloat(amount),
        type,
        reason,
        appliedDate: new Date(),
        status: 'applied',
      },
    });

    return { bonusId: bonus.id, amount: bonus.amount };
  }

  // Send notification
  private async sendNotification(parameters: any, context: RuleExecutionContext): Promise<any> {
    const { message, type, recipients } = parameters;
    
    // Publish notification event
    await this.eventBus.publish({
      id: `notif-${Date.now()}`,
      aggregateId: context.employeeId,
      aggregateType: 'Employee',
      eventType: 'NotificationTriggered',
      eventData: {
        employeeId: context.employeeId,
        message,
        type,
        recipients,
      },
      eventVersion: 1,
      occurredAt: new Date(),
    });

    return { notificationSent: true, message };
  }

  // Require approval
  private async requireApproval(parameters: any, context: RuleExecutionContext): Promise<any> {
    const { approverRole, reason, data } = parameters;
    
    const approval = await this.prisma.approvalRequests.create({
      data: {
        employeeId: context.employeeId,
        approverRole,
        reason,
        requestData: JSON.stringify(data),
        status: 'pending',
        createdAt: new Date(),
      },
    });

    return { approvalId: approval.id, status: 'pending' };
  }

  // Block action
  private async blockAction(parameters: any, context: RuleExecutionContext): Promise<any> {
    const { reason, blockType } = parameters;
    
    // Log security event
    this.logger.logSecurityEvent('action_blocked', context.employeeId, {
      reason,
      blockType,
      context,
    });

    throw new Error(`Action blocked: ${reason}`);
  }

  // Execute custom action
  private async executeCustomAction(parameters: any, context: RuleExecutionContext): Promise<any> {
    // This can be extended to support custom business logic
    const { actionName, config } = parameters;
    
    this.logger.info('Custom action executed', {
      actionName,
      config,
      employeeId: context.employeeId,
    });

    return { customActionExecuted: true, actionName };
  }

  // Process attendance-specific rules
  private async processAttendanceRules(attendanceData: any): Promise<void> {
    const context: RuleExecutionContext = {
      employeeId: attendanceData.employeeId,
      branchId: attendanceData.branchId,
      attendanceData,
      timestamp: new Date(attendanceData.timestamp),
    };

    await this.executeRules('attendance', context);
  }

  // Process payroll-specific rules
  private async processPayrollRules(payrollData: any): Promise<void> {
    const context: RuleExecutionContext = {
      employeeId: payrollData.employeeId,
      branchId: payrollData.branchId,
      payrollData,
      timestamp: new Date(),
    };

    await this.executeRules('payroll', context);
  }

  // Log rule execution
  private async logRuleExecution(
    ruleId: string,
    context: RuleExecutionContext,
    actions: ExecutedAction[],
    success: boolean
  ): Promise<void> {
    try {
      await this.prisma.ruleExecutionLogs.create({
        data: {
          ruleId,
          employeeId: context.employeeId,
          executionContext: JSON.stringify(context),
          executedActions: JSON.stringify(actions),
          success,
          executedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log rule execution', error, { ruleId });
    }
  }

  // Clear rules cache
  clearCache(): void {
    this.rulesCache.clear();
    this.lastCacheUpdate = 0;
    this.logger.info('Rules cache cleared');
  }

  // Get rule execution statistics
  async getExecutionStatistics(period: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      const [totalExecutions, successfulExecutions, failedExecutions] = await Promise.all([
        this.prisma.ruleExecutionLogs.count({
          where: { executedAt: { gte: startDate } }
        }),
        this.prisma.ruleExecutionLogs.count({
          where: { executedAt: { gte: startDate }, success: true }
        }),
        this.prisma.ruleExecutionLogs.count({
          where: { executedAt: { gte: startDate }, success: false }
        }),
      ]);

      return {
        period,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get rule execution statistics', error);
      return null;
    }
  }
}