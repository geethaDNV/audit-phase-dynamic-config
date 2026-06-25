import { BaseStepRepository } from '../base/base-step.repository';
import { EntityRepository } from '../domain/entity.repository';
import { ContactRepository } from '../domain/contact.repository';
import { StepContext } from '../../config/types/step-config.types';
import prisma from '../../config/database';

/**
 * Custom Repository: Step 2 (Entity & Contact Selection)
 * Pattern 2: Multi-source Compose
 * 
 * Fetches data from multiple sources:
 * - Entities (from Entity table)
 * - Contacts (from Contact table)
 * - Current selection (from Client table)
 */
export class Step2Repository extends BaseStepRepository {
  private entityRepository: EntityRepository;
  private contactRepository: ContactRepository;

  constructor() {
    super(prisma);
    this.entityRepository = new EntityRepository();
    this.contactRepository = new ContactRepository();
  }

  /**
   * Fetch composed data from multiple sources
   */
  async fetch(context: StepContext): Promise<any> {
    const { auditId } = context;

    // Get the client first to retrieve current selection
    const client = await prisma.client.findUnique({
      where: { auditId },
      select: {
        id: true,
        selectedEntityId: true,
      },
    });

    if (!client) {
      throw new Error(`Client not found for audit ${auditId}`);
    }

    // Fetch entities and contacts in parallel
    const [entities, contacts] = await Promise.all([
      this.entityRepository.findByClientId(client.id),
      this.contactRepository.findByClientId(client.id),
    ]);

    // Transform entities for dropdown options
    const entityOptions = entities.map((entity) => ({
      value: entity.id,
      label: entity.name,
      metadata: {
        type: entity.type,
        description: entity.description,
      },
    }));

    // Transform contacts for multi-select options
    const contactOptions = contacts.map((contact) => ({
      value: contact.id,
      label: `${contact.name} (${contact.role})`,
      metadata: {
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
      },
    }));

    return {
      // Form values
      formData: {
        selectedEntityId: client.selectedEntityId,
        selectedContacts: [], // TODO: Store selected contacts when we add a junction table
      },
      
      // Dropdown/select options
      options: {
        entities: entityOptions,
        contacts: contactOptions,
      },

      // Additional metadata
      metadata: {
        totalEntities: entities.length,
        totalContacts: contacts.length,
        clientId: client.id,
      },
    };
  }

  /**
   * Save the selected entity ID back to the Client record
   */
  async save(context: StepContext, data: any): Promise<any> {
    const { auditId } = context;
    const { selectedEntityId, selectedContacts } = data;

    // Validate that the entity exists and belongs to this client
    const client = await prisma.client.findUnique({
      where: { auditId },
      select: { id: true },
    });

    if (!client) {
      throw new Error(`Client not found for audit ${auditId}`);
    }

    if (selectedEntityId) {
      const isValid = await this.entityRepository.validateOwnership(
        selectedEntityId,
        client.id
      );

      if (!isValid) {
        throw new Error('Selected entity does not belong to this client');
      }
    }

    // Update the client with the selected entity
    const updatedClient = await prisma.client.update({
      where: { auditId },
      data: {
        selectedEntityId: selectedEntityId || null,
      },
    });

    // TODO: Store selected contacts in a junction table (AuditContact)
    // For now, we'll just return the selection
    
    return {
      success: true,
      data: {
        selectedEntityId: updatedClient.selectedEntityId,
        selectedContacts: selectedContacts || [],
      },
      message: 'Entity and contact selection saved successfully',
    };
  }
}
