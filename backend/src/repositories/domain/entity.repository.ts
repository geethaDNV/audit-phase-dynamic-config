import { PrismaClient, Entity, Prisma } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import { StepContext, StepDataPayload } from '../../config/types/step-config.types';

/**
 * Entity Repository
 * 
 * Domain repository for Entity-related operations.
 * Used by Phase 1, Step 2 (Entity Selection) which needs to:
 * - Fetch entities for a client
 * - Update client's selected entity
 * 
 * Entities belong to Clients and represent legal entities
 * (corporations, LLCs, partnerships, etc.) associated with an audit.
 */
export class EntityRepository extends BaseStepRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Generic fetch (not used - specific methods below are called)
   */
  async fetch(_context: StepContext): Promise<StepDataPayload | null> {
    return null;
  }

  /**
   * Generic save (not used - specific methods below are called)
   */
  async save(
    _data: StepDataPayload,
    _context: StepContext,
    _transaction?: Prisma.TransactionClient
  ): Promise<StepDataPayload> {
    throw new Error('Use specific save methods instead');
  }

  /**
   * Get entities by client (via audit ID)
   * Used by: Step 2 fetch strategy (multi-source compose)
   */
  async getByClient(auditId: number): Promise<Entity[]> {
    try {
      // Get client first
      const client = await this.prisma.client.findUnique({
        where: { auditId },
        select: { id: true },
      });

      if (!client) {
        return [];
      }

      // Get all entities for this client
      const entities = await this.prisma.entity.findMany({
        where: {
          clientId: client.id,
          isActive: true, // Only active entities
        },
        orderBy: { name: 'asc' },
      });

      return entities;
    } catch (error) {
      console.error('Error fetching entities by client:', error);
      return [];
    }
  }

  /**
   * Update selected entity for a client
   * Used by: Step 2 save strategy (multi-table)
   */
  async updateSelection(
    auditId: number,
    entityId: number,
    transaction?: Prisma.TransactionClient
  ): Promise<void> {
    const prismaClient = (transaction as PrismaClient) || this.prisma;

    // Update client's selectedEntityId
    await prismaClient.client.update({
      where: { auditId },
      data: { selectedEntityId: entityId },
    });
  }

  /**
   * Find all entities belonging to a specific client
   */
  async findByClientId(clientId: number): Promise<Entity[]> {
    return await this.prisma.entity.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find all entities for an audit (via client relationship)
   */
  async findByAuditId(auditId: number): Promise<Entity[]> {
    const client = await this.prisma.client.findUnique({
      where: { auditId },
      select: { id: true },
    });

    if (!client) {
      return [];
    }

    return await this.findByClientId(client.id);
  }

  /**
   * Get entity by ID with validation
   */
  async findById(id: number): Promise<Entity | null> {
    try {
      const entity = await this.prisma.entity.findUnique({
        where: { id },
      });

      return entity;
    } catch (error) {
      console.error('Error fetching entity by ID:', error);
      return null;
    }
  }

  /**
   * Validate entity belongs to client
   */
  async validateOwnership(entityId: number, clientId: number): Promise<boolean> {
    const entity = await this.prisma.entity.findFirst({
      where: {
        id: entityId,
        clientId,
      },
    });

    return !!entity;
  }

  /**
   * Validate entity belongs to audit's client
   */
  async validateEntityOwnership(auditId: number, entityId: number): Promise<boolean> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { auditId },
        include: {
          entities: {
            where: { id: entityId },
          },
        },
      });

      return !!(client && client.entities.length > 0);
    } catch (error) {
      console.error('Error validating entity ownership:', error);
      return false;
    }
  }

  /**
   * Get ALL entities in the database
   * Used by: Step 2 to show all available entities for selection
   */
  async getAllEntities(): Promise<Entity[]> {
    try {
      const entities = await this.prisma.entity.findMany({
        where: {
          isActive: true, // Only active entities
        },
        orderBy: { name: 'asc' },
      });

      return entities;
    } catch (error) {
      console.error('Error fetching all entities:', error);
      return [];
    }
  }

  /**
   * Get selected entity for an audit
   */
  async getSelectedEntity(auditId: number): Promise<Entity | null> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { auditId },
        select: { selectedEntityId: true },
      });

      if (!client || !client.selectedEntityId) {
        return null;
      }

      const selectedEntity = await this.prisma.entity.findUnique({
        where: { id: client.selectedEntityId },
      });

      return selectedEntity;
    } catch (error) {
      console.error('Error fetching selected entity:', error);
      return null;
    }
  }

  /**
   * Create a new entity for a client
   */
  async create(data: {
    clientId: number;
    name: string;
    type: string;
    description?: string;
  }): Promise<Entity> {
    return await this.prisma.entity.create({
      data,
    });
  }

  /**
   * Update an existing entity
   */
  async update(id: number, data: Prisma.EntityUpdateInput): Promise<Entity> {
    return await this.prisma.entity.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an entity
   */
  async delete(id: number): Promise<Entity> {
    return await this.prisma.entity.delete({
      where: { id },
    });
  }
}
