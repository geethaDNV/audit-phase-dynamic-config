import { stepRegistry } from '../config/step-registry';
import { StepConfig } from '../config/types/step-config.types';

/**
 * Metadata Registry Service
 * 
 * Provides access to step configurations from TypeScript files.
 * In a future enhancement, this could also sync configurations to the database
 * via the StepConfiguration model for runtime updates.
 * 
 * For this POC, we load from TypeScript files for simplicity and type safety.
 */
export class MetadataRegistryService {
  /**
   * Get configuration for a specific step
   * @throws Error if step not found
   */
  public getConfig(phaseId: number, stepId: number): StepConfig {
    return stepRegistry.getConfig(phaseId, stepId);
  }

  /**
   * Check if a step exists
   */
  public hasStep(phaseId: number, stepId: number): boolean {
    return stepRegistry.hasStep(phaseId, stepId);
  }

  /**
   * Get all steps for a phase
   */
  public getPhaseSteps(phaseId: number): StepConfig[] {
    return stepRegistry.getPhaseSteps(phaseId);
  }

  /**
   * Get all registered steps
   */
  public getAllSteps(): StepConfig[] {
    return stepRegistry.getAllSteps();
  }

  /**
   * Get form schema for a step (used by frontend)
   */
  public getFormSchema(phaseId: number, stepId: number) {
    const config = this.getConfig(phaseId, stepId);
    return {
      phaseId: config.phaseId,
      stepId: config.stepId,
      stepName: config.stepName,
      description: config.description,
      formSchema: config.formSchema,
    };
  }

  /**
   * Validate that a step exists before processing
   */
  public validateStep(phaseId: number, stepId: number): void {
    if (!this.hasStep(phaseId, stepId)) {
      throw new Error(`Invalid step: Phase ${phaseId}, Step ${stepId} does not exist`);
    }
  }
}

// Export singleton instance
export const metadataRegistry = new MetadataRegistryService();
