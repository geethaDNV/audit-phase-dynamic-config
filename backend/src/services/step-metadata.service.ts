import { PrismaClient } from '@prisma/client';

/**
 * Step Metadata Service
 * 
 * Manages StepData table for metadata and audit trail ONLY.
 * 
 * IMPORTANT: This does NOT store actual form data (that's in domain tables).
 * Use this for:
 * - Recording submission metadata (who, when, validation status)
 * - Audit trail (tracking changes)
 * - Draft/autosave state
 * - UI state for dynamic steps
 */

export interface StepMetadata {
  stepKey: string;
  submittedAt?: Date;
  submittedBy?: string;
  validationStatus?: 'pending' | 'passed' | 'failed';
  validationErrors?: string[];
  timeSpent?: number; // seconds
  fieldsChanged?: string[];
  isDraft?: boolean;
  uiState?: Record<string, any>;
}

export class StepMetadataService {
  constructor(private prisma: PrismaClient) {}
  
  /**
   * Record step submission metadata
   */
  async recordSubmission(
    auditId: number,
    phaseId: number,
    stepId: number,
    metadata: StepMetadata
  ): Promise<void> {
    const stepKey = `${phaseId}-${stepId}`;
    
    await this.prisma.stepData.upsert({
      where: {
        auditId_phaseId_stepId: { auditId, phaseId, stepId }
      },
      create: {
        auditId,
        phaseId,
        stepId,
        stepKey,
        data: {
          ...metadata,
          submittedAt: metadata.submittedAt || new Date()
        } as any
      },
      update: {
        data: {
          ...metadata,
          lastModified: new Date()
        } as any
      }
    });
  }
  
  /**
   * Get step metadata
   */
  async getMetadata(
    auditId: number,
    phaseId: number,
    stepId: number
  ): Promise<StepMetadata | null> {
    const stepData = await this.prisma.stepData.findUnique({
      where: {
        auditId_phaseId_stepId: { auditId, phaseId, stepId }
      }
    });
    
    return stepData?.data as StepMetadata | null;
  }
  
  /**
   * Record validation result
   */
  async recordValidation(
    auditId: number,
    phaseId: number,
    stepId: number,
    status: 'passed' | 'failed',
    errors?: string[]
  ): Promise<void> {
    const existing = await this.getMetadata(auditId, phaseId, stepId);
    
    await this.recordSubmission(auditId, phaseId, stepId, {
      stepKey: `${phaseId}-${stepId}`,
      ...existing,
      validationStatus: status,
      validationErrors: errors,
      submittedAt: existing?.submittedAt || new Date()
    });
  }
  
  /**
   * Save draft state (for autosave)
   */
  async saveDraft(
    auditId: number,
    phaseId: number,
    stepId: number,
    draftData: any
  ): Promise<void> {
    await this.recordSubmission(auditId, phaseId, stepId, {
      stepKey: `${phaseId}-${stepId}`,
      isDraft: true,
      uiState: draftData,
      submittedAt: new Date()
    });
  }
  
  /**
   * Get audit trail for a step
   */
  async getAuditTrail(
    auditId: number,
    phaseId: number,
    stepId: number
  ): Promise<{
    submissions: number;
    lastSubmitted?: Date;
    validationAttempts: number;
    validationPassed: boolean;
  }> {
    const metadata = await this.getMetadata(auditId, phaseId, stepId);
    
    if (!metadata) {
      return {
        submissions: 0,
        validationAttempts: 0,
        validationPassed: false
      };
    }
    
    return {
      submissions: 1, // Could track this in metadata
      lastSubmitted: metadata.submittedAt,
      validationAttempts: metadata.validationErrors?.length || 0,
      validationPassed: metadata.validationStatus === 'passed'
    };
  }
}
