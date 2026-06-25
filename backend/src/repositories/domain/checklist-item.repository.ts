import prisma from '../../config/database';
import { ChecklistItem } from '@prisma/client';

/**
 * Domain Repository: ChecklistItem
 * Handles business logic specific to ChecklistItem records
 */
export class ChecklistItemRepository {
  /**
   * Find all checklist items for a specific audit
   */
  async findByAuditId(auditId: number): Promise<ChecklistItem[]> {
    return await prisma.checklistItem.findMany({
      where: { auditId },
      orderBy: [
        { category: 'asc' },
        { priority: 'desc' },
        { title: 'asc' },
      ],
    });
  }

  /**
   * Find checklist items by category
   */
  async findByCategory(auditId: number, category: string): Promise<ChecklistItem[]> {
    return await prisma.checklistItem.findMany({
      where: {
        auditId,
        category,
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Find checklist items by priority
   */
  async findByPriority(auditId: number, priority: string): Promise<ChecklistItem[]> {
    return await prisma.checklistItem.findMany({
      where: {
        auditId,
        priority,
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Find completed items
   */
  async findCompleted(auditId: number): Promise<ChecklistItem[]> {
    return await prisma.checklistItem.findMany({
      where: {
        auditId,
        isCompleted: true,
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Find incomplete items
   */
  async findIncomplete(auditId: number): Promise<ChecklistItem[]> {
    return await prisma.checklistItem.findMany({
      where: {
        auditId,
        isCompleted: false,
      },
      orderBy: [
        { priority: 'desc' },
        { title: 'asc' },
      ],
    });
  }

  /**
   * Find a specific checklist item by ID
   */
  async findById(id: number): Promise<ChecklistItem | null> {
    return await prisma.checklistItem.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new checklist item
   */
  async create(data: {
    auditId: number;
    title: string;
    description?: string;
    category: string;
    priority: string;
    isCompleted?: boolean;
  }): Promise<ChecklistItem> {
    return await prisma.checklistItem.create({
      data: {
        auditId: data.auditId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        isCompleted: data.isCompleted ?? false,
      },
    });
  }

  /**
   * Create multiple checklist items in bulk
   */
  async createMany(items: Array<{
    auditId: number;
    title: string;
    description?: string;
    category: string;
    priority: string;
    isCompleted?: boolean;
  }>): Promise<{ count: number }> {
    return await prisma.checklistItem.createMany({
      data: items.map(item => ({
        auditId: item.auditId,
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        isCompleted: item.isCompleted ?? false,
      })),
    });
  }

  /**
   * Update a checklist item
   */
  async update(id: number, data: Partial<ChecklistItem>): Promise<ChecklistItem> {
    return await prisma.checklistItem.update({
      where: { id },
      data,
    });
  }

  /**
   * Mark item as completed
   */
  async markCompleted(id: number): Promise<ChecklistItem> {
    return await prisma.checklistItem.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark item as incomplete
   */
  async markIncomplete(id: number): Promise<ChecklistItem> {
    return await prisma.checklistItem.update({
      where: { id },
      data: {
        isCompleted: false,
        completedAt: null,
      },
    });
  }

  /**
   * Delete a checklist item
   */
  async delete(id: number): Promise<ChecklistItem> {
    return await prisma.checklistItem.delete({
      where: { id },
    });
  }

  /**
   * Delete all checklist items for an audit
   */
  async deleteByAuditId(auditId: number): Promise<{ count: number }> {
    return await prisma.checklistItem.deleteMany({
      where: { auditId },
    });
  }

  /**
   * Get statistics for an audit's checklist
   */
  async getStatistics(auditId: number): Promise<{
    total: number;
    completed: number;
    incomplete: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const items = await this.findByAuditId(auditId);

    const stats = {
      total: items.length,
      completed: items.filter(item => item.isCompleted).length,
      incomplete: items.filter(item => !item.isCompleted).length,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    // Count by category
    items.forEach(item => {
      stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
    });

    return stats;
  }
}
