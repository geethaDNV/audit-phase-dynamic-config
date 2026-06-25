import prisma from '../config/database';
import { StepDataPayload, StepContext } from '../config/types/step-config.types';

/**
 * Validator Registry
 * 
 * Central registry for custom validators used in business rules.
 * Validators are referenced by name in step configurations.
 * 
 * Example usage in config:
 * ```typescript
 * validation: {
 *   customValidator: 'EntityBelongsToClientValidator'
 * }
 * ```
 */

// Type definitions for validators
export type SyncValidator = (value: unknown, fieldName: string) => string | null;
export type AsyncValidator = (payload: StepDataPayload, context: StepContext) => Promise<string | null>;

export class ValidatorRegistry {
  private syncValidators: Map<string, SyncValidator> = new Map();
  private asyncValidators: Map<string, AsyncValidator> = new Map();

  constructor() {
    this.registerValidators();
  }

  /**
   * Register all custom validators
   */
  private registerValidators(): void {
    // Sync validators (field-level)
    this.registerSync('DocumentExistsValidator', this.documentExistsValidator);

    // Async validators (cross-step, business rules)
    this.registerAsync('EntityBelongsToClientValidator', this.entityBelongsToClientValidator);
    this.registerAsync('RiskIncreasedValidator', this.riskIncreasedValidator);
    this.registerAsync('DocumentReferenceValidator', this.documentReferenceValidator);

    console.log(`✅ Validator Registry initialized with ${this.syncValidators.size + this.asyncValidators.size} validators`);
  }

  /**
   * Register a synchronous validator
   */
  private registerSync(name: string, validator: SyncValidator): void {
    this.syncValidators.set(name, validator);
  }

  /**
   * Register an asynchronous validator
   */
  private registerAsync(name: string, validator: AsyncValidator): void {
    this.asyncValidators.set(name, validator);
  }

  /**
   * Execute a synchronous validator
   * Returns error message or null if valid
   */
  public validateSync(validatorName: string, value: unknown, fieldName: string): string | null {
    const validator = this.syncValidators.get(validatorName);
    
    if (!validator) {
      console.warn(`Sync validator '${validatorName}' not found`);
      return null;
    }

    return validator(value, fieldName);
  }

  /**
   * Execute an asynchronous validator
   * Returns error message or null if valid
   */
  public async validateAsync(validatorName: string, payload: StepDataPayload, context: StepContext): Promise<string | null> {
    const validator = this.asyncValidators.get(validatorName);
    
    if (!validator) {
      console.warn(`Async validator '${validatorName}' not found`);
      return null;
    }

    return validator(payload, context);
  }

  // ========================================================================
  // CUSTOM VALIDATORS
  // ========================================================================

  /**
   * Validator: EntityBelongsToClientValidator
   * 
   * Used in: Phase 1, Step 2 (Entity Selection)
   * Validates that the selected entity belongs to the client for this audit
   */
  private entityBelongsToClientValidator: AsyncValidator = async (payload, context) => {
    try {
      const { selectedEntityId } = payload;
      const { auditId } = context;

      if (!selectedEntityId || !auditId) {
        return null; // Skip if no data provided
      }

      // Get the client for this audit
      const client = await prisma.client.findUnique({
        where: { auditId },
        include: { entities: true },
      });

      if (!client) {
        return 'No client found for this audit';
      }

      // Check if the selected entity belongs to this client
      const entityBelongsToClient = client.entities.some(
        (entity) => entity.id === parseInt(selectedEntityId, 10)
      );

      if (!entityBelongsToClient) {
        return 'Selected entity does not belong to the client for this audit';
      }

      return null; // Valid
    } catch (error) {
      console.error('EntityBelongsToClientValidator error:', error);
      return 'Failed to validate entity ownership';
    }
  };

  /**
   * Validator: RiskIncreasedValidator
   * 
   * Used in: Phase 1, Step 3 (Risk Assessment)
   * Validates that justification is provided when risk increases
   */
  private riskIncreasedValidator: AsyncValidator = async (payload, context) => {
    try {
      const { currentRiskLevel, previousRisk, justification } = payload;
      const { auditId } = context;

      // Risk severity levels in order
      const riskLevels = ['Low', 'Medium', 'High', 'Critical'];

      // Get previous risk assessment if not provided in payload
      let prevRisk = previousRisk;
      if (!prevRisk) {
        const prevAssessment = await prisma.riskAssessment.findFirst({
          where: { auditId },
          orderBy: { assessedAt: 'desc' },
        });
        prevRisk = prevAssessment?.riskLevel || 'Low';
      }

      // Check if risk increased
      const prevIndex = riskLevels.indexOf(prevRisk);
      const currentIndex = riskLevels.indexOf(currentRiskLevel);

      if (currentIndex > prevIndex) {
        // Risk increased - justification required
        if (!justification || justification.trim().length < 50) {
          return 'Risk level has increased. Please provide a detailed justification (minimum 50 characters)';
        }
      }

      return null; // Valid
    } catch (error) {
      console.error('RiskIncreasedValidator error:', error);
      return 'Failed to validate risk increase';
    }
  };

  /**
   * Validator: DocumentReferenceValidator
   * 
   * Used in: Phase 2, Step 6 (Findings & Evidence)
   * Validates that evidence references valid documents from Step 5
   */
  private documentReferenceValidator: AsyncValidator = async (payload, context) => {
    try {
      const { evidence } = payload;
      const { auditId } = context;

      if (!evidence || !Array.isArray(evidence)) {
        return null; // Skip if no evidence provided
      }

      // Get all documents for this audit
      const documents = await prisma.document.findMany({
        where: { auditId },
        select: { id: true },
      });

      const validDocumentIds = documents.map((doc) => doc.id);

      // Check each evidence item
      for (const item of evidence) {
        if (item.documentId) {
          const docId = parseInt(item.documentId, 10);
          if (!validDocumentIds.includes(docId)) {
            return `Evidence references invalid document ID: ${docId}. Document must be uploaded in Step 5 first.`;
          }
        }
      }

      return null; // Valid
    } catch (error) {
      console.error('DocumentReferenceValidator error:', error);
      return 'Failed to validate document references';
    }
  };

  /**
   * Validator: DocumentExistsValidator (Sync)
   * 
   * Simple field-level check (can be used in array items)
   */
  private documentExistsValidator: SyncValidator = (value, fieldName) => {
    // This is a lightweight check - actual DB check happens in DocumentReferenceValidator
    if (!value || typeof value !== 'string' || isNaN(parseInt(value, 10))) {
      return `${fieldName} must be a valid document ID`;
    }
    return null;
  };
}
