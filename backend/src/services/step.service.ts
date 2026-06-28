import { PrismaClient } from '@prisma/client';
import { MetadataRegistryService } from './metadata-registry.service';
import { ValidationService } from './validation.service';
import { StepMetadataService } from './step-metadata.service';
import { RepositoryRegistry } from '../repositories/repository-registry';
import {
  StepContext,
  StepDataPayload,
  StepConfig,
} from '../config/types/step-config.types';

// Type alias for Prisma transaction client
type PrismaTransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Step Service
 * 
 * ARCHITECTURE: Domain tables as single source of truth (no StepData duplication)
 * 
 * This is the core of the metadata-driven architecture:
 * 
 * 1. Loads step configuration from metadata registry
 * 2. Validates data using multi-layer validation (queries domain tables)
 * 3. Saves to DOMAIN TABLES (Client, Document, etc.) - NOT StepData
 * 4. Records metadata/audit trail separately (optional)
 * 5. Handles transactions for multi-table operations
 * 
 * Benefits:
 * - No data duplication
 * - Foreign keys enforce integrity
 * - Simpler architecture
 * - Domain tables queryable for reporting/analytics
 */
export class StepService {
  private repoRegistry: RepositoryRegistry;
  private validationService: ValidationService;
  private metadataService: StepMetadataService;

  constructor(
    private prisma: PrismaClient,
    private metadataRegistry: MetadataRegistryService
  ) {
    this.repoRegistry = new RepositoryRegistry(prisma);
    this.validationService = new ValidationService(prisma);
    this.metadataService = new StepMetadataService(prisma);
  }

  /**
   * Get step data based on configured fetch strategy
   */
  async getStepData(auditId: number, phaseId: number, stepId: number): Promise<StepDataPayload | null> {
    // Validate step exists
    this.metadataRegistry.validateStep(phaseId, stepId);

    const config = this.metadataRegistry.getConfig(phaseId, stepId);
    const context: StepContext = { auditId, phaseId, stepId };

    // Execute fetch strategy
    const data = await this.executeFetchStrategy(config, context);

    return data;
  }

  /**
   * Save step data based on configured save strategy
   * 
   * Flow:
   * 1. Validate payload (queries domain tables for dependencies)
   * 2. Save to DOMAIN TABLES (Client, Document, etc.)
   * 3. Record metadata/audit trail (optional)
   * 4. Update step status
   */
  async saveStepData(
    auditId: number,
    phaseId: number,
    stepId: number,
    payload: StepDataPayload
  ): Promise<StepDataPayload> {
    const stepKey = `${phaseId}-${stepId}`;
    
    // Validate step exists
    this.metadataRegistry.validateStep(phaseId, stepId);

    const config = this.metadataRegistry.getConfig(phaseId, stepId);
    const context: StepContext = { auditId, phaseId, stepId };

    try {
      // 1. VALIDATION - Queries domain tables for cross-step dependencies
      await this.validationService.validate(
        payload,
        config.formSchema,
        context,
        config.dependencies
      );
      
      // Record successful validation
      await this.metadataService.recordValidation(auditId, phaseId, stepId, 'passed');

      // 2. SAVE TO DOMAIN TABLES (not StepData)
      const result = await this.executeSaveStrategy(config, payload, context);
      
      // 3. Record metadata (submission info, audit trail)
      await this.metadataService.recordSubmission(auditId, phaseId, stepId, {
        stepKey,
        submittedAt: new Date(),
        validationStatus: 'passed',
        isDraft: false
      });
      
      // 4. Update step status to completed
      await this.updateStepStatus(auditId, phaseId, stepId, 'completed');

      return result;
      
    } catch (error: any) {
      // Record validation failure
      const errors = error.errors || [error.message];
      await this.metadataService.recordValidation(
        auditId,
        phaseId,
        stepId,
        'failed',
        errors
      );
      
      throw error;
    }
  }
  
  /**
   * Update step completion status
   */
  private async updateStepStatus(
    auditId: number,
    phaseId: number,
    stepId: number,
    status: string
  ): Promise<void> {
    const stepKey = `${phaseId}-${stepId}`;
    
    await this.prisma.auditStepStatus.upsert({
      where: {
        auditId_phaseId_stepId: { auditId, phaseId, stepId }
      },
      create: {
        auditId,
        phaseId,
        stepId,
        stepKey,
        status,
        completedAt: status === 'completed' ? new Date() : null
      },
      update: {
        status,
        completedAt: status === 'completed' ? new Date() : null
      }
    });
  }

  /**
   * Execute fetch strategy based on configuration
   */
  private async executeFetchStrategy(
    config: StepConfig,
    context: StepContext
  ): Promise<StepDataPayload | null> {
    const { strategy, repositoryClass } = config.dataConfig.fetch;

    // If a custom repository is specified, use it (handles all custom strategies)
    if (repositoryClass) {
      const repository = this.repoRegistry.getRepository(repositoryClass);
      return repository.fetch(context);
    }

    // Generic strategies that don't require custom repositories
    const genericRepo = this.repoRegistry.getGenericRepository();
    
    switch (strategy) {
      case 'prisma-simple':
        return genericRepo.fetchSimple(config, context);

      default:
        throw new Error(
          `Fetch strategy '${strategy}' requires a custom repositoryClass in the step configuration. ` +
          `Please add 'repositoryClass: "YourRepositoryName"' to the fetch config.`
        );
    }
  }

  /**
   * Execute save strategy based on configuration
   */
  private async executeSaveStrategy(
    config: StepConfig,
    payload: StepDataPayload,
    context: StepContext
  ): Promise<StepDataPayload> {
    const { transactional } = config.dataConfig.save;

    // If transactional, wrap in Prisma transaction
    if (transactional) {
      return this.prisma.$transaction(async (trx: PrismaTransactionClient) => {
        return this.executeSave(config, payload, context, trx);
      });
    } else {
      return this.executeSave(config, payload, context);
    }
  }

  /**
   * Execute the actual save operation
   */
  private async executeSave(
    config: StepConfig,
    payload: StepDataPayload,
    context: StepContext,
    transaction?: PrismaTransactionClient
  ): Promise<StepDataPayload> {
    const { strategy, repositoryClass } = config.dataConfig.save;

    // If a custom repository is specified, use it (handles all custom strategies)
    if (repositoryClass) {
      const repository = this.repoRegistry.getRepository(repositoryClass);
      return repository.save(payload, context, transaction);
    }

    // Generic strategies that don't require custom repositories
    const genericRepo = this.repoRegistry.getGenericRepository();

    switch (strategy) {
      case 'prisma-upsert':
      case 'prisma-create':
        return genericRepo.saveWithStrategy(
          config.dataConfig.save,
          payload,
          context,
          transaction
        );

      default:
        throw new Error(
          `Save strategy '${strategy}' requires a custom repositoryClass in the step configuration. ` +
          `Please add 'repositoryClass: "YourRepositoryName"' to the save config.`
        );
    }
  }
}
