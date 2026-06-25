import { PrismaClient } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import {
  StepContext,
  StepDataPayload,
  SaveStrategy,
  StepConfig,
} from '../../config/types/step-config.types';

/**
 * Generic Step Repository
 * 
 * Handles Pattern 1 (Simple CRUD) and Pattern 4 (Array CRUD) using Prisma's generic operations.
 * This repository can handle ANY step that uses simple single-table or array operations
 * without custom business logic.
 * 
 * Supported Strategies:
 * - Fetch: prisma-simple (findUnique/findMany)
 * - Save: prisma-upsert, prisma-create (with bulk operations)
 * 
 * For complex queries or multi-table operations, use domain or custom repositories.
 */
export class GenericStepRepository extends BaseStepRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Fetch step data using simple Prisma query
   * Supports both single record and array queries
   */
  async fetch(_context: StepContext): Promise<StepDataPayload | null> {
    // This method is not used directly in generic repo
    // Instead, fetchSimple is called from step service
    return null;
  }

  /**
   * Generic save method (delegates to specific strategy)
   */
  async save(
    _data: StepDataPayload,
    _context: StepContext,
    _transaction?: any
  ): Promise<StepDataPayload> {
    throw new Error('Use saveWithStrategy instead');
  }

  /**
   * Fetch data using prisma-simple strategy
   * Reads from a single table based on auditId
   * Supports both single record (findUnique) and array (findMany)
   */
  async fetchSimple(config: StepConfig, context: StepContext): Promise<StepDataPayload | null> {
    const model = config.dataConfig.fetch.model;
    if (!model) {
      throw new Error('Model name required for prisma-simple fetch strategy');
    }

    const delegate = this.getPrismaDelegate(model);
    const returnArray = config.dataConfig.fetch.returnArray;

    try {
      if (returnArray) {
        // Fetch array of records
        const records = await delegate.findMany({
          where: { auditId: context.auditId },
        });
        return { items: records };
      } else {
        // Fetch single record by auditId
        const record = await delegate.findUnique({
          where: { auditId: context.auditId },
        });
        return record || null;
      }
    } catch (error) {
      console.error(`Error fetching ${model}:`, error);
      return returnArray ? { items: [] } : null;
    }
  }

  /**
   * Save data using strategy from configuration
   */
  async saveWithStrategy(
    saveStrategy: SaveStrategy,
    data: StepDataPayload,
    context: StepContext,
    transaction?: any
  ): Promise<StepDataPayload> {
    const prismaClient = transaction || this.prisma;

    switch (saveStrategy.strategy) {
      case 'prisma-upsert':
        return this.handleUpsert(saveStrategy, data, context, prismaClient);

      case 'prisma-create':
        return this.handleBulkCreate(saveStrategy, data, context, prismaClient);

      default:
        throw new Error(`Unsupported save strategy: ${saveStrategy.strategy}`);
    }
  }

  /**
   * Handle prisma-upsert strategy
   * Creates new record or updates existing based on auditId
   */
  private async handleUpsert(
    saveStrategy: SaveStrategy,
    data: StepDataPayload,
    context: StepContext,
    prismaClient: any
  ): Promise<StepDataPayload> {
    const model = saveStrategy.model;
    if (!model) {
      throw new Error('Model name required for prisma-upsert strategy');
    }

    const delegate = this.getPrismaDelegate(model, prismaClient);

    // Build data object from payload
    const saveData: Record<string, any> = {
      ...data,
      auditId: context.auditId,
    };

    // Remove undefined values
    Object.keys(saveData).forEach((key) => {
      if (saveData[key] === undefined) {
        delete saveData[key];
      }
    });

    try {
      const result = await delegate.upsert({
        where: { auditId: context.auditId },
        update: saveData,
        create: saveData,
      });

      return result;
    } catch (error: any) {
      console.error(`Error upserting ${model}:`, error);
      throw new Error(`Failed to save ${model}: ${error.message}`);
    }
  }

  /**
   * Handle prisma-create strategy (bulk operations)
   * Used for array fields - deletes existing and creates new
   */
  private async handleBulkCreate(
    saveStrategy: SaveStrategy,
    data: StepDataPayload,
    context: StepContext,
    prismaClient: any
  ): Promise<StepDataPayload> {
    const model = saveStrategy.model;
    if (!model) {
      throw new Error('Model name required for prisma-create strategy');
    }

    const delegate = this.getPrismaDelegate(model, prismaClient);

    // Delete existing records if configured
    if (saveStrategy.deleteExisting) {
      await delegate.deleteMany({
        where: this.buildAuditWhere(context.auditId),
      });
    }

    // Prepare bulk data
    // Handle different payload formats:
    // 1. Array directly: [{...}, {...}]
    // 2. Object with items property: { items: [{...}, {...}] }
    // 3. Single item object: {...}
    let items: any[];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else {
      items = [data];
    }

    const bulkData = items.map((item: any) => ({
      ...item,
      auditId: context.auditId,
    }));

    try {
      // Bulk create
      await delegate.createMany({
        data: bulkData,
      });

      // Fetch and return created records
      const created = await delegate.findMany({
        where: this.buildAuditWhere(context.auditId),
      });

      return { items: created };
    } catch (error: any) {
      console.error(`Error bulk creating ${model}:`, error);
      throw new Error(`Failed to save ${model}: ${error.message}`);
    }
  }

  /**
   * Get Prisma delegate for a model name
   * Handles dynamic model access with type safety
   */
  private getPrismaDelegate(modelName: string, prismaClient?: any): any {
    const client = prismaClient || this.prisma;
    const delegate = (client as any)[modelName];

    if (!delegate) {
      throw new Error(`Invalid model name: ${modelName}`);
    }

    return delegate;
  }
}
