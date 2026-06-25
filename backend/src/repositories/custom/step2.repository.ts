import { PrismaClient, Entity, Contact } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import { ClientRepository } from '../domain/client.repository';
import { EntityRepository } from '../domain/entity.repository';
import { StepContext, StepDataPayload } from '../../config/types/step-config.types';
import prisma from '../../config/database';

/**
 * Custom Repository: Step 2 (Entity & Contact Selection)
 * Pattern 2: Multi-source Compose
 * 
 * Fetches data from multiple sources:
 * - Client data with selected entity
 * - Entities (from Entity table)
 * - Contacts (from Contact table)
 * 
 * Save strategy:
 * - Update client's selected entity
 * - Upsert contacts (bulk operation)
 */
export class Step2Repository extends BaseStepRepository {
  private clientRepository: ClientRepository;
  private entityRepository: EntityRepository;

  constructor(prismaClient?: PrismaClient) {
    super(prismaClient || prisma);
    this.clientRepository = new ClientRepository(this.prisma);
    this.entityRepository = new EntityRepository(this.prisma);
  }

  /**
   * Fetch composed data from multiple sources
   * Returns client data, entities, and contacts for selection
   */
  async fetch(context: StepContext): Promise<StepDataPayload> {
    const { auditId } = context;

    // Fetch client data with entities and contacts
    const clientData = await this.clientRepository.getFullClientData(auditId);

    if (!clientData) {
      return {
        selectedEntityId: null,
        entities: [],
        contacts: [],
      };
    }

    // Transform for frontend consumption
    return {
      selectedEntityId: clientData.client.selectedEntityId,
      clientName: clientData.client.name,
      entities: clientData.entities.map((entity: Entity) => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        description: entity.description,
        registrationNumber: entity.registrationNumber,
      })),
      contacts: clientData.contacts.map((contact: Contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        isPrimary: contact.isPrimary,
      })),
    };
  }

  /**
   * Save entity selection and contacts
   * Uses transaction to ensure atomicity
   */
  async save(
    data: StepDataPayload,
    context: StepContext,
    transaction?: unknown
  ): Promise<StepDataPayload> {
    const { auditId } = context;
    const { selectedEntityId, contacts } = data;

    const prismaClient = transaction || this.prisma;

    // Validate entity belongs to client (custom validator will also check this)
    if (selectedEntityId) {
      const isValid = await this.entityRepository.validateEntityOwnership(
        auditId,
        selectedEntityId
      );

      if (!isValid) {
        throw new Error('Selected entity does not belong to this client');
      }

      // Update client's selected entity
      await this.clientRepository.updateSelectedEntity(
        auditId,
        selectedEntityId,
        prismaClient
      );
    }

    // Upsert contacts if provided
    if (contacts && Array.isArray(contacts) && contacts.length > 0) {
      await this.clientRepository.upsertContacts(auditId, contacts, prismaClient);
    }

    return {
      success: true,
      selectedEntityId,
      contactsUpdated: contacts?.length || 0,
    };
  }
}
