import prisma from '../../config/database';
import { Contact } from '@prisma/client';

/**
 * Domain Repository: Contact
 * Handles business logic specific to Contact records
 */
export class ContactRepository {
  /**
   * Find all contacts belonging to a specific client
   */
  async findByClientId(clientId: number): Promise<Contact[]> {
    return await prisma.contact.findMany({
      where: { clientId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Find all contacts for an audit (via client relationship)
   */
  async findByAuditId(auditId: number): Promise<Contact[]> {
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
   * Find contacts by role
   */
  async findByRole(clientId: number, role: string): Promise<Contact[]> {
    return await prisma.contact.findMany({
      where: {
        clientId,
        role,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find a specific contact by ID
   */
  async findById(id: number): Promise<Contact | null> {
    return await prisma.contact.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new contact for a client
   */
  async create(data: {
    clientId: number;
    name: string;
    email: string;
    role: string;
    phone?: string;
  }): Promise<Contact> {
    return await prisma.contact.create({
      data,
    });
  }

  /**
   * Update an existing contact
   */
  async update(id: number, data: Partial<Contact>): Promise<Contact> {
    return await prisma.contact.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a contact
   */
  async delete(id: number): Promise<Contact> {
    return await prisma.contact.delete({
      where: { id },
    });
  }

  /**
   * Validate that a contact belongs to a specific client
   */
  async validateOwnership(contactId: number, clientId: number): Promise<boolean> {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        clientId,
      },
    });

    return !!contact;
  }
}
