import { PrismaClient } from '@prisma/client';
import { StepContext, StepDataPayload } from '../../config/types/step-config.types';

/**
 * Base Step Repository
 * 
 * Abstract base class for all step repositories.
 * Provides common utilities and enforces a consistent interface.
 * 
 * Repository Pattern Benefits:
 * - Separation of concerns (data access logic isolated)
 * - Testability (easy to mock)
 * - Flexibility (can swap implementations)
 * - Type safety (TypeScript interfaces)
 */
export abstract class BaseStepRepository {
  constructor(protected prisma: PrismaClient) {}

  /**
   * Fetch data for a step
   * Must be implemented by derived classes
   */
  abstract fetch(context: StepContext): Promise<StepDataPayload | null>;

  /**
   * Save data for a step
   * Must be implemented by derived classes
   */
  abstract save(
    data: StepDataPayload,
    context: StepContext,
    transaction?: any
  ): Promise<StepDataPayload>;

  /**
   * Helper: Build where clause for audit-scoped queries
   */
  protected buildAuditWhere(auditId: number): { auditId: number } {
    return { auditId };
  }

  /**
   * Helper: Build where clause for step-scoped queries
   */
  protected buildStepWhere(context: StepContext) {
    return {
      auditId: context.auditId,
      phaseId: context.phaseId,
      stepId: context.stepId,
    };
  }

  /**
   * Helper: Extract model name from Prisma delegate
   */
  protected getModelName(model: string): string {
    return model.toLowerCase();
  }
}
