import { PrismaClient } from '@prisma/client';
import { MetadataRegistryService } from './metadata-registry.service';
import { ValidationService } from './validation.service';
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
 * Orchestrates step data operations using the strategy pattern.
 * This is the core of the metadata-driven architecture:
 * 
 * 1. Loads step configuration from metadata registry
 * 2. Validates data using multi-layer validation
 * 3. Executes appropriate fetch/save strategy
 * 4. Handles transactions for multi-table operations
 * 5. Provides consistent API regardless of step complexity
 * 
 * Adding a new step? Just create its config file - this service handles it automatically!
 */
export class StepService {
  private repoRegistry: RepositoryRegistry;
  private validationService: ValidationService;

  constructor(
    private prisma: PrismaClient,
    private metadataRegistry: MetadataRegistryService
  ) {
    this.repoRegistry = new RepositoryRegistry(prisma);
    this.validationService = new ValidationService();
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
   */
  async saveStepData(
    auditId: number,
    phaseId: number,
    stepId: number,
    payload: StepDataPayload
  ): Promise<StepDataPayload> {
    // Validate step exists
    this.metadataRegistry.validateStep(phaseId, stepId);

    const config = this.metadataRegistry.getConfig(phaseId, stepId);
    const context: StepContext = { auditId, phaseId, stepId };

    // ✅ VALIDATION - Multi-layer validation before saving
    await this.validationService.validate(payload, config.formSchema, context);

    // Execute save strategy
    const result = await this.executeSaveStrategy(config, payload, context);

    return result;
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
