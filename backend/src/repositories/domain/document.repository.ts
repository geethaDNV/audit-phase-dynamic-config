import { PrismaClient } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import { StepContext, StepDataPayload } from '../../config/types/step-config.types';

export class DocumentRepository extends BaseStepRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Implement abstract fetch method
   */
  async fetch(context: StepContext): Promise<StepDataPayload | null> {
    const documents = await this.findByAuditId(context.auditId);
    return { items: documents };
  }

  /**
   * Implement abstract save method
   * Handles bulk save operations for document arrays
   */
  async save(data: any, context: StepContext, transaction?: any): Promise<StepDataPayload> {
    const prismaClient = transaction || this.prisma;
    const auditId = context.auditId;

    // Extract items array from payload
    const items = Array.isArray(data.items) ? data.items : [];

    // Delete all existing documents for this audit
    await prismaClient.document.deleteMany({
      where: { auditId }
    });

    // If no items provided, return empty array
    if (items.length === 0) {
      return { items: [] };
    }

    // Create all new documents with validation and processing
    const createdDocuments = await Promise.all(
      items.map((item: any) => this.createDocumentWithValidation(auditId, item, prismaClient))
    );

    return { items: createdDocuments };
  }

  /**
   * Create a single document with conditional validation
   * Demonstrates Pattern 5: Conditional Save Strategy
   */
  private async createDocumentWithValidation(
    auditId: number, 
    data: any, 
    prismaClient: any
  ): Promise<any> {
    const { documentType, filePath, isConfidential, tags, ...rest } = data;

    // Validate file extension based on document type
    this.validateFileType(documentType, filePath);

    // Parse tags if provided - handle both string and array formats
    let parsedTags: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags.filter(Boolean);
      } else if (typeof tags === 'string' && tags.trim()) {
        parsedTags = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }

    // Extract fileName and fileType from filePath
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    // Conditional logic based on document type
    if (documentType === 'Financial Statement') {
      // Financial statements require PDF format
      if (!filePath.toLowerCase().endsWith('.pdf')) {
        throw new Error('Financial statements must be uploaded as PDF files');
      }
    }

    // Additional validation for confidential documents
    if (isConfidential) {
      // Could add encryption, access control, or audit trail logic here
      console.log(`Creating confidential document: ${rest.title}`);
    }

    // Create document with conditional metadata
    const document = await prismaClient.document.create({
      data: {
        auditId,
        title: rest.title,
        documentType,
        filePath,
        fileName,
        fileType,
        fileSize: rest.fileSize,
        description: rest.description || null,
        isConfidential: isConfidential || false,
        tags: parsedTags,
        uploadedAt: new Date()
      }
    });

    // If confidential, create audit trail entry (example of conditional post-save action)
    if (isConfidential) {
      console.log(`Audit trail: Confidential document ${document.id} created for audit ${auditId}`);
      // In a real system, you might create an audit log entry here
    }

    return document;
  }

  /**
   * Fetch all documents for an audit
   */
  async findByAuditId(auditId: number): Promise<any[]> {
    return this.prisma.document.findMany({
      where: { auditId },
      orderBy: { uploadedAt: 'desc' }
    });
  }

  /**
   * Update document metadata
   */
  async updateDocument(id: number, data: any): Promise<any> {
    const { tags, ...rest } = data;
    const parsedTags = tags ? tags.split(',').map((tag: string) => tag.trim()) : undefined;

    return this.prisma.document.update({
      where: { id },
      data: {
        ...rest,
        ...(parsedTags && { tags: parsedTags })
      }
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(id: number): Promise<any> {
    return this.prisma.document.delete({
      where: { id }
    });
  }

  /**
   * Validate file type based on document type
   */
  private validateFileType(documentType: string, filePath: string): void {
    const extension = filePath.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'docx', 'xlsx', 'txt'];

    if (!extension || !allowedExtensions.includes(extension)) {
      throw new Error(
        `Invalid file type. Allowed extensions: ${allowedExtensions.join(', ')}`
      );
    }

    // Additional type-specific validations
    const typeRestrictions: Record<string, string[]> = {
      'Financial Statement': ['pdf'],
      'Compliance Report': ['pdf', 'docx'],
      'Supporting Evidence': ['pdf', 'docx', 'xlsx']
    };

    if (typeRestrictions[documentType]) {
      if (!typeRestrictions[documentType].includes(extension)) {
        throw new Error(
          `${documentType} documents must be in ${typeRestrictions[documentType].join(' or ')} format`
        );
      }
    }
  }
}
