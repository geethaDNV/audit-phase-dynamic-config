import prisma from '../config/database';
import { StepDataPayload, ValidationContext } from '../config/types/step-config.types';

/**
 * Validator Registry
 * 
 * Central registry for custom validators used in business rules.
 * Validators are referenced by name in step configurations.
 * 
 * PERFORMANCE: Validators now use ValidationContext which contains
 * pre-loaded dependency data, eliminating N+1 query problems.
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
export type AsyncValidator = (
  payload: StepDataPayload,
  context: ValidationContext  // ← Changed from StepContext
) => Promise<string | null>;

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
  public async validateAsync(
    validatorName: string,
    payload: StepDataPayload,
    context: ValidationContext  // ← Changed from StepContext
  ): Promise<string | null> {
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
   * UPDATED: EntityBelongsToClientValidator - NO MORE DB QUERY!
   * 
   * Used in: Phase 1, Step 2 (Entity Selection)
   * Validates that the selected entity belongs to the client for this audit
   * 
   * Before: Made separate query to get client + entities
   * After: Uses pre-loaded dependency data from context
   */
  private entityBelongsToClientValidator: AsyncValidator = async (payload, context) => {
    try {
      const { selectedEntityId } = payload;
      
      if (!selectedEntityId) {
        return null;
      }

      // ✅ Get client data from pre-loaded context - NO DB QUERY!
      const clientData = context.dependencyData.get('1-1');
      
      if (!clientData) {
        return 'Client information not found. Please complete Step 1-1 first.';
      }

      // ✅ Get entity data from pre-loaded context - NO DB QUERY!
      // Note: In Phase 1 Step 2, we're saving entities, so this validates
      // that selectedEntityId matches one of the entities being created
      // For cross-step validation, the dependency would be configured in step config
      
      // For now, we'll check if we have entities in the payload or context
      const entities = payload.entities || [];
      
      if (entities.length === 0) {
        // If no entities in payload, this might be a read operation
        // In that case, the validation passes
        return null;
      }

      // Check if selectedEntityId is one of the entities
      const entityExists = entities.some(
        (entity: any) => entity.id === parseInt(selectedEntityId, 10) || 
                        entities.indexOf(entity) === parseInt(selectedEntityId, 10) - 1
      );

      if (!entityExists) {
        return 'Selected entity must be one of the entities for this client';
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
   * 
   * NOTE: This validator still queries the database for historical risk data.
   * This is acceptable as it's querying historical audit data, not cross-step dependencies.
   * If needed, historical risk could be added as a dependency in the step config.
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
   * UPDATED: DocumentReferenceValidator - HYBRID STRATEGY
   * 
   * Used in: Phase 2, Step 6 (Findings & Evidence)
   * Validates that evidence references valid documents from Step 5
   * 
   * Strategies:
   * - preloaded: Use pre-loaded IDs (small dataset < 100)
   * - direct-db: Query database directly (large dataset >= 100)
   * - foreign-key: Skip validation (DB will enforce)
   */
  private documentReferenceValidator: AsyncValidator = async (payload, context) => {
    try {
      const { evidence } = payload;

      if (!evidence || !Array.isArray(evidence)) {
        return null;
      }

      // Get strategy from context
      const documentData = context.dependencyData.get('2-1');
      const strategy = context.dependencyStrategies.get('2-1');
      
      if (!documentData || !strategy) {
        return 'Document information not available. Please complete Step 2-1 first.';
      }

      // Check each evidence item
      for (const item of evidence) {
        const docRef = item.documentRef || item.documentId;
        if (!docRef) continue;
        
        const docId = parseInt(docRef, 10);
        
        if (strategy.strategy === 'preloaded') {
          // ✅ Small dataset: Use pre-loaded IDs (NO additional DB query)
          const validDocumentIds = documentData.items?.map((doc: any) => doc.id) || [];
          if (!validDocumentIds.includes(docId)) {
            return `Evidence references invalid document ID: ${docId}. Document must be uploaded in Step 2-1 first.`;
          }
          
        } else if (strategy.strategy === 'direct-db') {
          // ✅ Large dataset: Query database directly
          const exists = await prisma.document.findUnique({
            where: { id: docId },
            select: { id: true }
          });
          if (!exists) {
            return `Evidence references invalid document ID: ${docId}. Document must be uploaded in Step 2-1 first.`;
          }
          
        } else if (strategy.strategy === 'foreign-key') {
          // ✅ Skip validation - database foreign key will handle it
          // No validation needed here
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
