import { PrismaClient } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import { StepContext, StepDataPayload } from '../../config/types/step-config.types';

export class FindingRepository extends BaseStepRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Implement abstract fetch method
   */
  async fetch(context: StepContext): Promise<StepDataPayload | null> {
    const findings = await this.fetchFindings(context.auditId);
    return { items: findings };
  }

  /**
   * Implement abstract save method
   * Handles bulk save operations for findings with nested evidence and recommendations
   */
  async save(data: any, context: StepContext, transaction?: any): Promise<StepDataPayload> {
    const prismaClient = transaction || this.prisma;
    const auditId = context.auditId;

    // Extract items array from payload
    const items = Array.isArray(data.items) ? data.items : [];

    // Delete all existing findings for this audit (cascade deletes evidence and recommendations)
    await prismaClient.finding.deleteMany({
      where: { auditId }
    });

    // If no items provided, return empty array
    if (items.length === 0) {
      return { items: [] };
    }

    // Create all new findings with their nested data
    const createdFindings = await Promise.all(
      items.map((item: any) => this.createFindingWithNested(auditId, item, prismaClient))
    );

    return { items: createdFindings };
  }

  /**
   * Create a single finding with evidence and recommendations in a transaction
   */
  private async createFindingWithNested(
    auditId: number, 
    data: any, 
    prismaClient: any
  ): Promise<any> {
    const { evidence = [], recommendations = [], ...findingData } = data;

    // Validate business rules
    this.validateFinding(findingData, evidence, recommendations);

    // Create the finding
    const finding = await prismaClient.finding.create({
      data: {
        auditId,
        title: findingData.title,
        description: findingData.description,
        severity: findingData.severity,
        category: findingData.category,
        status: findingData.status,
        assignedTo: findingData.assignedTo || null
      }
    });

    // Create evidence entries
    const createdEvidence = [];
    if (evidence && evidence.length > 0) {
      for (const evidenceItem of evidence) {
        const created = await prismaClient.evidence.create({
          data: {
            findingId: finding.id,
            description: evidenceItem.description,
            source: evidenceItem.source,
            documentPath: evidenceItem.documentPath || null
          }
        });
        createdEvidence.push(created);
      }
    }

    // Create recommendation entries
    const createdRecommendations = [];
    if (recommendations && recommendations.length > 0) {
      for (const recommendation of recommendations) {
        const created = await prismaClient.recommendation.create({
          data: {
            findingId: finding.id,
            description: recommendation.description,
            priority: recommendation.priority,
            targetDate: recommendation.targetDate ? new Date(recommendation.targetDate) : null,
            status: 'Pending'
          }
        });
        createdRecommendations.push(created);
      }
    }

    // Return complete finding with nested data
    return {
      ...finding,
      evidence: createdEvidence,
      recommendations: createdRecommendations
    };
  }

  /**
   * Fetch findings with all related data (evidence and recommendations)
   * Demonstrates complex query with nested relations
   */
  async fetchFindings(auditId: number): Promise<any[]> {
    const findings = await this.prisma.finding.findMany({
      where: { auditId },
      include: {
        evidence: {
          orderBy: { createdAt: 'asc' }
        },
        recommendations: {
          orderBy: { priority: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return findings;
  }

  /**
   * Fetch a single finding with all related data
   */
  async fetchFinding(id: number): Promise<any> {
    const finding = await this.prisma.finding.findUnique({
      where: { id },
      include: {
        evidence: {
          orderBy: { createdAt: 'asc' }
        },
        recommendations: {
          orderBy: { priority: 'desc' }
        }
      }
    });

    return finding;
  }

  /**
   * Update finding status
   */
  async updateStatus(id: number, status: string): Promise<any> {
    return this.prisma.finding.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete finding (cascade deletes evidence and recommendations)
   */
  async deleteFinding(id: number): Promise<any> {
    return this.prisma.finding.delete({
      where: { id }
    });
  }

  /**
   * Validate business rules for findings
   */
  private validateFinding(
    finding: any,
    evidence: any[],
    recommendations: any[]
  ): void {
    // Critical findings must have evidence and recommendations
    if (finding.severity === 'Critical') {
      if (!evidence || evidence.length === 0) {
        throw new Error('Critical findings must include at least one piece of evidence');
      }
      if (!recommendations || recommendations.length === 0) {
        throw new Error('Critical findings must include at least one recommendation');
      }
    }

    // Resolved or Closed findings must have recommendations
    if (finding.status === 'Resolved' || finding.status === 'Closed') {
      if (!recommendations || recommendations.length === 0) {
        throw new Error('Resolved or Closed findings must include recommendations');
      }
    }

    // Validate target dates are in the future
    if (recommendations && recommendations.length > 0) {
      const now = new Date();
      for (const rec of recommendations) {
        if (rec.targetDate) {
          const targetDate = new Date(rec.targetDate);
          if (targetDate < now) {
            console.warn(
              `Warning: Target date ${rec.targetDate} is in the past for recommendation: ${rec.description.substring(0, 50)}...`
            );
          }
        }
      }
    }
  }
}
