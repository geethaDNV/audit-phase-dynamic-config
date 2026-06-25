import prisma from '../../config/database';
import { Entity } from '@prisma/client';

/**
 * Domain Repository: Entity
 * Handles business logic specific to Entity records
 */
export class EntityRepository {
  /**
   * Find all entities belonging to a specific client
   */
  async findByClientId(clientId: number): Promise<Entity[]> {
    return await prisma.entity.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find all entities for an audit (via client relationship)
   */
  async findByAuditId(auditId: number): Promise<Entity[]> {
    const client = await prisma.client.findUnique({
      where: { auditId },
      select: { id: true },
    });

    if (!client) {
      return [];
    }

    return await this.findByClientId(client.id);
  }

  /**
   * Find a specific entity by ID
   */
  async findById(id: number): Promise<Entity | null> {
    return await prisma.entity.findUnique({
      where: { id },
    });
  }

  /**
   * Validate that an entity belongs to a specific client
   */
  async validateOwnership(entityId: number, clientId: number): Promise<boolean> {
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        clientId,
      },
    });

    return !!entity;
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
    return await prisma.entity.create({
      data,
    });
  }

  /**
   * Update an existing entity
   */
  async update(id: number, data: Partial<Entity>): Promise<Entity> {
    return await prisma.entity.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an entity
   */
  async delete(id: number): Promise<Entity> {
    return await prisma.entity.delete({
      where: { id },
    });
  }
}
