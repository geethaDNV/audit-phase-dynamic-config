import { PrismaClient, Entity, Contact } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import { ClientRepository } from '../domain/client.repository';
import { EntityRepository } from '../domain/entity.repository';
import { ContactRepository } from '../domain/contact.repository';
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
  private contactRepository: ContactRepository;

  constructor(prismaClient?: PrismaClient) {
    super(prismaClient || prisma);
    this.clientRepository = new ClientRepository(this.prisma);
    this.entityRepository = new EntityRepository(this.prisma);
    this.contactRepository = new ContactRepository();
  }

  /**
   * Fetch composed data from multiple sources
   * Returns:
   * - selectedEntityId: Currently selected entity for this audit (for pre-selection)
   * - entities: ALL available entities in the database (for dropdown options)
   * - contacts: ALL contacts in the database (for dropdown options)
   * - selectedContacts: Currently selected contact IDs for this audit (for pre-selection)
   */
  async fetch(context: StepContext): Promise<StepDataPayload> {
    const { auditId } = context;

    // Fetch client data (to get current selections)
    const clientData = await this.clientRepository.getFullClientData(auditId);

    if (!clientData) {
      return {
        selectedEntityId: null,
        selectedContacts: [],
        entities: [],
        contacts: [],
      };
    }

    // Fetch ALL entities from the database (not just those linked to this client)
    // This allows users to select any entity during the audit
    const allEntities = await this.entityRepository.getAllEntities();

    // Fetch ALL contacts from the database (not just those linked to this client)
    // This allows users to select any contact during the audit setup
    const allContacts = await this.contactRepository.getAllContacts();

    const currentClientId = clientData.client.id;

    // Deduplicate contacts by email (show each unique person once)
    // IMPORTANT: When deduplicating, prefer contacts from the current client
    // This ensures the contact IDs we return match the ones we want to pre-select
    const emailToContactMap = new Map<string, any>();
    
    for (const contact of allContacts) {
      const existingContact = emailToContactMap.get(contact.email);
      
      if (!existingContact) {
        // First contact with this email - add it
        emailToContactMap.set(contact.email, contact);
      } else if (contact.clientId === currentClientId && existingContact.clientId !== currentClientId) {
        // Replace with contact from current client (preferred)
        emailToContactMap.set(contact.email, contact);
      }
      // Otherwise, keep the existing contact
    }
    
    const uniqueContacts = Array.from(emailToContactMap.values());

    // Get IDs of contacts currently linked to this client with isPrimary=true
    // These will now match the IDs in uniqueContacts since we prioritized current client
    const primaryContactIds = clientData.contacts
      .filter((contact: Contact) => contact.isPrimary)
      .map((contact: Contact) => contact.id);

    // Transform for frontend consumption
    return {
      selectedEntityId: clientData.client.selectedEntityId, // Pre-select current choice
      selectedContacts: primaryContactIds, // Pre-select only contacts that belong to this client
      clientName: clientData.client.name,
      entities: allEntities.map((entity: Entity) => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        description: entity.description,
        registrationNumber: entity.registrationNumber,
      })),
      contacts: uniqueContacts.map((contact: any) => ({
        id: contact.id,
        name: contact.name,
        displayName: `${contact.name} - ${contact.role}`, // Show just name and role (no client since deduplicated)
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        isPrimary: contact.isPrimary,
        clientName: contact.client?.name, // Keep for internal reference
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
   * Update which contacts are linked to this audit's client
   * Strategy:
   * 1. For contacts from OTHER clients: Create copies linked to this client
   * 2. For contacts already linked to this client: Update isPrimary flag
   * 3. Unset isPrimary for contacts that were deselected
   */
  private async updateContactSelection(
    auditId: number,
    selectedContactIds: number[],
    prismaClient: any
  ): Promise<void> {
    // Get client for this audit
    const client = await prismaClient.client.findUnique({
      where: { auditId },
      include: { contacts: true },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    const clientId = client.id;
    const existingContactIds = client.contacts.map((c: Contact) => c.id);

    // Process each selected contact
    for (const contactId of selectedContactIds) {
      // Check if this contact already belongs to this client
      if (existingContactIds.includes(contactId)) {
        // Update existing contact: set isPrimary to true
        await prismaClient.contact.update({
          where: { id: contactId },
          data: { isPrimary: true },
        });
      } else {
        // Contact belongs to another client - copy it to this client
        const sourceContact = await prismaClient.contact.findUnique({
          where: { id: contactId },
        });

        if (sourceContact) {
          // Create a copy of this contact for this client
          await prismaClient.contact.create({
            data: {
              clientId: clientId,
              name: sourceContact.name,
              email: sourceContact.email,
              phone: sourceContact.phone,
              role: sourceContact.role,
              isPrimary: true, // Selected contacts are primary
            },
          });
        }
      }
    }

    // Remove contacts that are linked to this client but NOT selected
    // Since we copy contacts from other clients, we should delete them when deselected
    // to avoid cluttering the database with unused copies
    const contactsToRemove = client.contacts.filter(
      (c: Contact) => !selectedContactIds.includes(c.id)
    );

    for (const contact of contactsToRemove) {
      // Check if this contact was copied from another client
      // by checking if there's another contact with the same email in a different client
      const otherContactWithSameEmail = await prismaClient.contact.findFirst({
        where: {
          email: contact.email,
          clientId: { not: clientId },
        },
      });

      if (otherContactWithSameEmail) {
        // This was a copy - delete it
        await prismaClient.contact.delete({
          where: { id: contact.id },
        });
      } else {
        // This is an original contact - just unmark as primary
        await prismaClient.contact.update({
          where: { id: contact.id },
          data: { isPrimary: false },
        });
      }
    }
  }
}
