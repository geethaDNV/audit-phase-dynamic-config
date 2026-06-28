import { PrismaClient } from '@prisma/client';
import {
  StepContext,
  ValidationContext,
  StepDataPayload,
  StepDependencies,
  DependencyDataConfig,
  DependencyStrategy
} from '../config/types/step-config.types';

/**
 * Validation Context Service
 * 
 * ARCHITECTURE: Hybrid validation strategy
 * 
 * - Small datasets (< 100): Pre-load IDs into memory (fast, avoids N+1)
 * - Large datasets (>= 100): Direct DB queries (memory efficient)
 * - Simple ID checks: Foreign key validation (best performance)
 * 
 * Benefits:
 * - Optimal memory usage
 * - Fast validation
 * - Scalable to millions of records
 * - No data duplication
 */
export class ValidationContextService {
  private readonly DEFAULT_THRESHOLD = 100;
  
  constructor(private prisma: PrismaClient) {}
  
  /**
   * Pre-load all dependency data from DOMAIN TABLES with hybrid strategy
   * 
   * Strategy decisions:
   * - preload: Always pre-load (small datasets like Client)
   * - auto: Check count, pre-load if < threshold, else direct-db
   * - direct-db: Never pre-load, validators query DB
   * - foreign-key: Skip validation, let DB constraints handle it
   */
  async buildValidationContext(
    context: StepContext,
    dependencies?: StepDependencies
  ): Promise<ValidationContext> {
    const { auditId } = context;
    
    // If no dependencies, return basic context
    if (!dependencies) {
      return {
        ...context,
        dependencyData: new Map(),
        stepStatuses: new Map(),
        dependencyStrategies: new Map()
      };
    }
    
    // 1. Collect all step keys we need data from
    const stepKeysToLoad = new Set<string>();
    
    if (dependencies.requiredSteps) {
      dependencies.requiredSteps.forEach(key => stepKeysToLoad.add(key));
    }
    
    if (dependencies.optionalSteps) {
      dependencies.optionalSteps.forEach(key => stepKeysToLoad.add(key));
    }
    
    if (dependencies.dataReferences) {
      Object.keys(dependencies.dataReferences).forEach(key => stepKeysToLoad.add(key));
    }
    
    // If no dependencies to load, return early
    if (stepKeysToLoad.size === 0) {
      return {
        ...context,
        dependencyData: new Map(),
        stepStatuses: new Map(),
        dependencyStrategies: new Map()
      };
    }
    
    // 2. Load data from DOMAIN TABLES using hybrid strategy
    const { dependencyData, dependencyStrategies } = await this.loadDependencyDataFromDomainTables(
      auditId,
      Array.from(stepKeysToLoad),
      dependencies.dataReferences
    );
    
    // 3. Load step statuses in ONE query
    const stepStatusRecords = await this.prisma.auditStepStatus.findMany({
      where: {
        auditId,
        stepKey: { in: Array.from(stepKeysToLoad) }
      },
      select: {
        stepKey: true,
        status: true,
        completedAt: true
      }
    });
    
    // 4. Build lookup maps
    const stepStatuses = new Map<string, string>();
    stepStatusRecords.forEach(record => {
      stepStatuses.set(record.stepKey, record.status);
    });
    
    // 5. Validate required steps are completed
    const missingSteps: string[] = [];
    if (dependencies.requiredSteps) {
      dependencies.requiredSteps.forEach(stepKey => {
        const status = stepStatuses.get(stepKey);
        if (status !== 'completed') {
          missingSteps.push(stepKey);
        }
      });
    }
    
    if (missingSteps.length > 0) {
      throw new Error(
        `Cannot proceed. Required steps not completed: ${missingSteps.join(', ')}`
      );
    }
    
    // 6. Return enriched context with strategy metadata
    return {
      ...context,
      dependencyData,
      stepStatuses,
      dependencyStrategies
    };
  }
  
  /**
   * Load dependency data from DOMAIN TABLES using HYBRID STRATEGY
   * 
   * Decides for each step:
   * - Small datasets: Pre-load IDs (< 100 records)
   * - Large datasets: Mark for direct DB query (>= 100 records)
   * - Foreign key validation: Skip loading entirely
   * 
   * Step Key → Domain Model mapping:
   * - '1-1' → Client (always small, 1 record)
   * - '1-2' → Client.entities + Client.contacts (usually small)
   * - '1-3' → RiskAssessment (always small, 1 record)
   * - '2-1' → Document (can be large, use hybrid)
   * - '2-2' → ChecklistItem (can be large, use hybrid)
   * - '2-3' → Finding (can be large, use hybrid)
   */
  private async loadDependencyDataFromDomainTables(
    auditId: number,
    stepKeys: string[],
    dataReferences?: { [stepKey: string]: string[] | DependencyDataConfig }
  ): Promise<{
    dependencyData: Map<string, StepDataPayload>;
    dependencyStrategies: Map<string, DependencyStrategy>;
  }> {
    const dependencyData = new Map<string, StepDataPayload>();
    const dependencyStrategies = new Map<string, DependencyStrategy>();
    
    // Execute queries in parallel for better performance
    const queries = stepKeys.map(async (stepKey) => {
      let data: StepDataPayload | null = null;
      let strategy: DependencyStrategy = { strategy: 'preloaded' };
      
      // Parse config (backward compatible with string arrays)
      const config = dataReferences?.[stepKey];
      const dataConfig: DependencyDataConfig = Array.isArray(config)
        ? { fields: config, strategy: 'auto', threshold: this.DEFAULT_THRESHOLD }
        : { strategy: 'auto', threshold: this.DEFAULT_THRESHOLD, ...config };
      
      switch (stepKey) {
        case '1-1': // Client Basic Information (always 1 record)
          const client = await this.prisma.client.findUnique({
            where: { auditId },
            select: this.buildSelectFields(dataConfig.fields, {
              id: true,
              name: true,
              email: true,
              industry: true,
              phone: true,
              address: true,
              website: true,
              taxId: true,
              fiscalYearEnd: true
            })
          });
          if (client) data = client as StepDataPayload;
          strategy = { strategy: 'preloaded', count: 1 };
          break;
          
        case '1-2': // Entity Selection & Contacts (usually small)
          const clientWithRelations = await this.prisma.client.findUnique({
            where: { auditId },
            include: {
              entities: true,
              contacts: true
            }
          });
          if (clientWithRelations) {
            data = {
              selectedEntityId: clientWithRelations.selectedEntityId,
              entities: clientWithRelations.entities,
              contacts: clientWithRelations.contacts
            };
          }
          strategy = { strategy: 'preloaded', count: (clientWithRelations?.entities.length || 0) };
          break;
          
        case '1-3': // Risk Assessment (always 1 record)
          const riskAssessment = await this.prisma.riskAssessment.findUnique({
            where: { auditId },
            select: this.buildSelectFields(dataConfig.fields, {
              id: true,
              riskLevel: true,
              riskScore: true,
              previousRisk: true,
              justification: true,
              assessedAt: true
            })
          });
          if (riskAssessment) data = riskAssessment as StepDataPayload;
          strategy = { strategy: 'preloaded', count: 1 };
          break;
          
        case '2-1': // Document Upload (can be large - use hybrid)
          const docResult = await this.loadWithHybridStrategy(
            'document',
            auditId,
            dataConfig,
            async () => this.prisma.document.findMany({
              where: { auditId },
              select: { id: true, title: true },
              orderBy: { uploadedAt: 'desc' }
            }),
            async () => this.prisma.document.count({ where: { auditId } })
          );
          data = docResult.data;
          strategy = docResult.strategy;
          break;
          
        case '2-2': // Checklist Items (can be large - use hybrid)
          const checklistResult = await this.loadWithHybridStrategy(
            'checklistItem',
            auditId,
            dataConfig,
            async () => this.prisma.checklistItem.findMany({
              where: { auditId },
              select: { id: true, title: true },
              orderBy: { createdAt: 'asc' }
            }),
            async () => this.prisma.checklistItem.count({ where: { auditId } })
          );
          data = checklistResult.data;
          strategy = checklistResult.strategy;
          break;
          
        case '2-3': // Findings & Evidence (can be large - use hybrid)
          const findingsResult = await this.loadWithHybridStrategy(
            'finding',
            auditId,
            dataConfig,
            async () => this.prisma.finding.findMany({
              where: { auditId },
              select: { id: true, title: true, severity: true },
              orderBy: { createdAt: 'desc' }
            }),
            async () => this.prisma.finding.count({ where: { auditId } })
          );
          data = findingsResult.data;
          strategy = findingsResult.strategy;
          break;
          
        default:
          console.warn(`No domain model mapping defined for step ${stepKey}`);
          // Fall back to StepData for unmapped steps (backward compatibility)
          const stepData = await this.prisma.stepData.findUnique({
            where: {
              auditId_phaseId_stepId: {
                auditId,
                phaseId: parseInt(stepKey.split('-')[0]),
                stepId: parseInt(stepKey.split('-')[1])
              }
            }
          });
          if (stepData) data = stepData.data as StepDataPayload;
          strategy = { strategy: 'preloaded', count: 1 };
      }
      
      return { stepKey, data, strategy };
    });
    
    // Wait for all queries to complete
    const results = await Promise.all(queries);
    
    // Build the maps
    results.forEach(({ stepKey, data, strategy }) => {
      if (data) {
        dependencyData.set(stepKey, data);
      }
      dependencyStrategies.set(stepKey, strategy);
    });
    
    return { dependencyData, dependencyStrategies };
  }
  
  /**
   * Hybrid loading strategy: Check count first, then decide
   * 
   * - If count < threshold: Pre-load IDs
   * - If count >= threshold: Mark for direct DB validation
   * - If strategy = 'foreign-key': Skip loading
   */
  private async loadWithHybridStrategy(
    entityName: string,
    auditId: number,
    config: DependencyDataConfig,
    loadFn: () => Promise<any[]>,
    countFn: () => Promise<number>
  ): Promise<{ data: StepDataPayload; strategy: DependencyStrategy }> {
    
    // Check explicit strategy
    if (config.strategy === 'preload') {
      const items = await loadFn();
      return {
        data: { items },
        strategy: { strategy: 'preloaded', count: items.length }
      };
    }
    
    if (config.strategy === 'direct-db') {
      return {
        data: { _strategy: 'direct-db', _auditId: auditId },
        strategy: { strategy: 'direct-db', auditId }
      };
    }
    
    if (config.strategy === 'foreign-key') {
      return {
        data: { _strategy: 'foreign-key' },
        strategy: { strategy: 'foreign-key' }
      };
    }
    
    // Auto strategy: Check count
    const threshold = config.threshold || this.DEFAULT_THRESHOLD;
    const count = await countFn();
    
    if (count < threshold) {
      // Small dataset: Pre-load IDs only
      const items = await loadFn();
      console.log(`✅ Pre-loaded ${count} ${entityName}(s) for audit ${auditId}`);
      return {
        data: { items },
        strategy: { strategy: 'preloaded', count }
      };
    } else {
      // Large dataset: Use direct DB validation
      console.log(`⚡ Using direct DB validation for ${count} ${entityName}(s) (threshold: ${threshold})`);
      return {
        data: { _strategy: 'direct-db', _auditId: auditId },
        strategy: { strategy: 'direct-db', auditId, count }
      };
    }
  }
  
  /**
   * Build Prisma select object from field list
   */
  private buildSelectFields(
    requestedFields: string[] | undefined,
    defaultFields: Record<string, boolean>
  ): Record<string, boolean> {
    if (!requestedFields || requestedFields.length === 0) {
      return defaultFields;
    }
    
    return requestedFields.reduce((acc, field) => ({
      ...acc,
      [field]: true
    }), {} as Record<string, boolean>);
  }
  
  /**
   * Extract specific fields from dependency data
   * Used for populating select options in forms
   */
  extractDependencyFields(
    validationContext: ValidationContext,
    stepKey: string,
    fieldPath: string
  ): any {
    const data = validationContext.dependencyData.get(stepKey);
    if (!data) return null;
    
    // Handle nested paths like "items[].id"
    const parts = fieldPath.split('.');
    let current: any = data;
    
    for (const part of parts) {
      if (part.endsWith('[]')) {
        // Array access
        const arrayKey = part.replace('[]', '');
        current = current[arrayKey];
        if (!Array.isArray(current)) return null;
      } else {
        current = current[part];
      }
      
      if (current === undefined) return null;
    }
    
    return current;
  }
  
  /**
   * Check if all required steps are completed
   */
  areRequiredStepsCompleted(
    validationContext: ValidationContext,
    requiredSteps: string[]
  ): { completed: boolean; missing: string[] } {
    const missing: string[] = [];
    
    requiredSteps.forEach(stepKey => {
      const status = validationContext.stepStatuses.get(stepKey);
      if (status !== 'completed') {
        missing.push(stepKey);
      }
    });
    
    return {
      completed: missing.length === 0,
      missing
    };
  }
}
