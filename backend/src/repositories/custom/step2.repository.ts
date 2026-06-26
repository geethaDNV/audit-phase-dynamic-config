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
 * - Client data with currently selected entity (for pre-selection)
 * - ALL entities in the database (for dropdown options)
 * - Contacts associated with this audit's client
 * 
 * Key Behavior:
 * - Shows ALL entities across all clients (not filtered by current client)
 * - Pre-selects the entity currently chosen for this audit (if any)
 * - Allows audits to select any entity, enabling cross-client entity assignments
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
   * Returns:
   * - selectedEntityId: Currently selected entity for this audit (for pre-selection)
   * - entities: ALL available entities in the database (for dropdown options)
   * - contacts: Contacts associated with this client's audit
   */
  async fetch(context: StepContext): Promise<StepDataPayload> {
    const { auditId } = context;

    // Fetch client data (to get current selection and contacts)
    const clientData = await this.clientRepository.getFullClientData(auditId);

    if (!clientData) {
      return {
        selectedEntityId: null,
        entities: [],
        contacts: [],
      };
    }

    // Fetch ALL entities from the database (not just those linked to this client)
    // This allows users to select any entity during the audit
    const allEntities = await this.entityRepository.getAllEntities();

    // Transform for frontend consumption
    return {
      selectedEntityId: clientData.client.selectedEntityId, // Pre-select current choice
      selectedContacts: clientData.contacts
        .filter((contact: Contact) => contact.isPrimary)
        .map((contact: Contact) => contact.id), // Pre-select primary contacts
      clientName: clientData.client.name,
      entities: allEntities.map((entity: Entity) => ({
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
    const { selectedEntityId, selectedContacts } = data;

    const prismaClient = transaction || this.prisma;

    // Update client's selected entity
    // Note: We no longer validate entity ownership since users can select ANY entity
    if (selectedEntityId) {
      // Verify the entity exists and is active
      const entity = await this.entityRepository.findById(selectedEntityId);
      
      if (!entity) {
        throw new Error('Selected entity not found');
      }

      if (!entity.isActive) {
        throw new Error('Selected entity is not active');
      }

      // Update client's selected entity
      await this.clientRepository.updateSelectedEntity(
        auditId,
        selectedEntityId,
        prismaClient
      );
    }

    // Update contact primary flags based on selection
    if (selectedContacts && Array.isArray(selectedContacts)) {
      await this.updateContactSelection(auditId, selectedContacts, prismaClient);
    }

    return {
      success: true,
      selectedEntityId,
      contactsUpdated: selectedContacts?.length || 0,
    };
  }

  /**
   * Update which contacts are marked as primary (selected) for this audit
   */
  private async updateContactSelection(
    auditId: number,
    selectedContactIds: number[],
    prismaClient: any
  ): Promise<void> {
    // Get client
    const client = await prismaClient.client.findUnique({
      where: { auditId },
      include: { contacts: true },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Update all contacts: set isPrimary based on selection
    const updatePromises = client.contacts.map((contact: Contact) => {
      return prismaClient.contact.update({
        where: { id: contact.id },
        data: { isPrimary: selectedContactIds.includes(contact.id) },
      });
    });

    await Promise.all(updatePromises);
  }
}
