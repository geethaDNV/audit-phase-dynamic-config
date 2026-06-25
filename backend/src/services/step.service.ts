import { PrismaClient } from '@prisma/client';
import { MetadataRegistryService } from './metadata-registry.service';
import { GenericStepRepository } from '../repositories/generic/generic-step.repository';
import { Step2Repository } from '../repositories/custom/step2.repository';
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
 * 2. Executes appropriate fetch/save strategy
 * 3. Handles transactions for multi-table operations
 * 4. Provides consistent API regardless of step complexity
 * 
 * Adding a new step? Just create its config file - this service handles it automatically!
 */
export class StepService {
  private genericRepo: GenericStepRepository;
  private step2Repo: Step2Repository;

  constructor(
    private prisma: PrismaClient,
    private metadataRegistry: MetadataRegistryService
  ) {
    this.genericRepo = new GenericStepRepository(prisma);
    this.step2Repo = new Step2Repository();
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

    // TODO: Add validation here using config.formSchema
    // For Phase 3, we skip validation to focus on data flow

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
    const { strategy } = config.dataConfig.fetch;

    switch (strategy) {
      case 'prisma-simple':
        return this.genericRepo.fetchSimple(config, context);

      case 'prisma-compose':
        // Use custom repository for multi-source composition
        // For now, hardcoded to Step2Repository - can be made dynamic later
        if (config.phaseId === 1 && config.stepId === 2) {
          return this.step2Repo.fetch(context);
        }
        throw new Error(`No custom repository configured for step ${config.phaseId}-${config.stepId}`);

      case 'custom':
        // Will be implemented in Phase 6
        throw new Error('custom fetch strategy not yet implemented');

      default:
        throw new Error(`Unknown fetch strategy: ${strategy}`);
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
    const { strategy } = config.dataConfig.save;

    // Check if this step has a custom repository override
    if (config.phaseId === 1 && config.stepId === 2) {
      // Step 2 uses custom repository with validation
      return this.step2Repo.save(context, payload);
    }

    switch (strategy) {
      case 'prisma-upsert':
      case 'prisma-create':
        return this.genericRepo.saveWithStrategy(
          config.dataConfig.save,
          payload,
          context,
          transaction
        );

      case 'multi-table':
        // Will be implemented in Phase 5
        throw new Error('multi-table strategy not yet implemented');

      case 'custom':
        // Will be implemented in Phase 6
        throw new Error('custom save strategy not yet implemented');

      default:
        throw new Error(`Unknown save strategy: ${strategy}`);
    }
  }
}
