import { PrismaClient } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import { StepContext, StepDataPayload } from '../../config/types/step-config.types';

/**
 * Client Repository
 * 
 * Domain repository for Client-related operations.
 * Used by Phase 1, Step 2 (Entity Selection) which needs to:
 * - Fetch client data by audit
 * - Fetch contacts for a client
 * - Update client's selected entity
 * - Upsert contacts (bulk operation)
 * 
 * This demonstrates the "Domain Repository" pattern - shared logic
 * that multiple steps might need (vs. step-specific custom repos).
 */
export class ClientRepository extends BaseStepRepository {
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
    _transaction?: any
  ): Promise<StepDataPayload> {
    throw new Error('Use specific save methods instead');
  }

  /**
   * Get client by audit ID
   * Used by: Step 2 fetch strategy (multi-source compose)
   */
  async getByAudit(auditId: number): Promise<StepDataPayload | null> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { auditId },
        include: {
          entities: true,
        },
      });

      if (!client) {
        return null;
      }

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        industry: client.industry,
        phone: client.phone,
        selectedEntityId: client.selectedEntityId,
        entities: client.entities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          registrationNumber: entity.registrationNumber,
        })),
      };
    } catch (error) {
      console.error('Error fetching client by audit:', error);
      return null;
    }
  }

  /**
   * Get contacts for a client by audit ID
   * Used by: Step 2 fetch strategy (multi-source compose)
   */
  async getContacts(auditId: number): Promise<any[]> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { auditId },
        include: {
          contacts: true,
        },
      });

      if (!client) {
        return [];
      }

      return client.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        isPrimary: contact.isPrimary,
      }));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }

  /**
   * Update the selected entity ID for a client
   * Used by: Step 2 save strategy (multi-table)
   */
  async updateSelectedEntity(
    auditId: number,
    selectedEntityId: number,
    transaction?: any
  ): Promise<void> {
    const prismaClient = transaction || this.prisma;

    await prismaClient.client.update({
      where: { auditId },
      data: { selectedEntityId },
    });
  }

  /**
   * Upsert contacts for a client (bulk operation)
   * Used by: Step 2 save strategy (multi-table)
   * 
   * Strategy:
   * 1. Delete existing contacts
   * 2. Create new contacts from array
   */
  async upsertContacts(
    auditId: number,
    contacts: any[],
    transaction?: any
  ): Promise<void> {
    const prismaClient = transaction || this.prisma;

    // Get client ID
    const client = await prismaClient.client.findUnique({
      where: { auditId },
      select: { id: true },
    });

    if (!client) {
      throw new Error(`Client not found for audit ${auditId}`);
    }

    // Delete existing contacts
    await prismaClient.contact.deleteMany({
      where: { clientId: client.id },
    });

    // Create new contacts
    if (contacts && contacts.length > 0) {
      await prismaClient.contact.createMany({
        data: contacts.map((contact) => ({
          clientId: client.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone || null,
          role: contact.role || null,
          isPrimary: contact.isPrimary || false,
        })),
      });
    }
  }

  /**
   * Get client with full details (entities + contacts)
   * Convenience method for complex fetches
   */
  async getFullClientData(auditId: number): Promise<StepDataPayload | null> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { auditId },
        include: {
          entities: true,
          contacts: true,
        },
      });

      if (!client) {
        return null;
      }

      return {
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          industry: client.industry,
          phone: client.phone,
          selectedEntityId: client.selectedEntityId,
        },
        entities: client.entities,
        contacts: client.contacts,
      };
    } catch (error) {
      console.error('Error fetching full client data:', error);
      return null;
    }
  }
}
