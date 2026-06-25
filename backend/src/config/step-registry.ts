import { StepConfig } from './types/step-config.types';
import { Phase1Step1Config } from './steps/phase1/step1.config';

/**
 * Step Registry
 * 
 * Central registry mapping phaseId-stepId combinations to their configurations.
 * This is the heart of the metadata-driven architecture - to add a new step,
 * simply import its config and add it to the registry.
 * 
 * Format: 'phaseId-stepId' => StepConfig
 * 
 * Example: '1-1' => Phase 1, Step 1 configuration
 */

type StepKey = `${number}-${number}`;

class StepRegistry {
  private configs: Map<StepKey, StepConfig> = new Map();

  constructor() {
    this.registerSteps();
  }

  /**
   * Register all step configurations
   * Adding a new step? Just import its config and call register()
   */
  private registerSteps(): void {
    // Phase 1: Client Assessment
    this.register(Phase1Step1Config);

    // Phase 2: Checklist Execution
    // More steps will be added in later phases

    console.log(`✅ Step Registry initialized with ${this.configs.size} step(s)`);
  }

  /**
   * Register a single step configuration
   */
  private register(config: StepConfig): void {
    const key = this.makeKey(config.phaseId, config.stepId);
    this.configs.set(key, config);
  }

  /**
   * Get configuration for a specific step
   * @throws Error if step not found
   */
  public getConfig(phaseId: number, stepId: number): StepConfig {
    const key = this.makeKey(phaseId, stepId);
    const config = this.configs.get(key);

    if (!config) {
      throw new Error(`Step configuration not found for Phase ${phaseId}, Step ${stepId}`);
    }

    return config;
  }

  /**
   * Check if a step exists
   */
  public hasStep(phaseId: number, stepId: number): boolean {
    const key = this.makeKey(phaseId, stepId);
    return this.configs.has(key);
  }

  /**
   * Get all steps for a specific phase
   */
  public getPhaseSteps(phaseId: number): StepConfig[] {
    const steps: StepConfig[] = [];

    for (const [, config] of this.configs.entries()) {
      if (config.phaseId === phaseId) {
        steps.push(config);
      }
    }

    return steps.sort((a, b) => a.stepId - b.stepId);
  }

  /**
   * Get all registered steps
   */
  public getAllSteps(): StepConfig[] {
    return Array.from(this.configs.values()).sort((a, b) => {
      if (a.phaseId !== b.phaseId) {
        return a.phaseId - b.phaseId;
      }
      return a.stepId - b.stepId;
    });
  }

  /**
   * Create a unique key for phaseId-stepId combination
   */
  private makeKey(phaseId: number, stepId: number): StepKey {
    return `${phaseId}-${stepId}`;
  }
}

// Export singleton instance
export const stepRegistry = new StepRegistry();
