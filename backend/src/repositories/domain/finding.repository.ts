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
   */
  async save(data: any, context: StepContext, transaction?: any): Promise<StepDataPayload> {
    return this.saveWithTransaction(context.auditId, data, transaction);
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
   * Complex transaction to save finding with evidence and recommendations
   * Demonstrates Pattern 6: Complex Transaction Strategy
   */
  async saveWithTransaction(auditId: number, data: any, transaction?: any): Promise<any> {
    const { evidence = [], recommendations = [], ...findingData } = data;

    // Validate business rules
    this.validateFinding(findingData, evidence, recommendations);

    // If transaction is provided, use it directly; otherwise start a new one
    if (transaction) {
      return this.executeSave(auditId, data, findingData, evidence, recommendations, transaction);
    }

    try {
      // Use Prisma transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        return this.executeSave(auditId, data, findingData, evidence, recommendations, tx);
      });

      console.log(
        `Transaction complete: Created finding ${result.id} with ${result.evidence.length} evidence items and ${result.recommendations.length} recommendations`
      );

      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw new Error(`Failed to save finding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute the save operation within a transaction
   */
  private async executeSave(
    auditId: number,
    data: any,
    findingData: any,
    evidence: any[],
    recommendations: any[],
    tx: any
  ): Promise<any> {
        // 1. Create or update the finding
        let finding;
        if (data.id) {
          // Update existing finding
          finding = await tx.finding.update({
            where: { id: data.id },
            data: {
              title: findingData.title,
              description: findingData.description,
              severity: findingData.severity,
              category: findingData.category,
              status: findingData.status,
              assignedTo: findingData.assignedTo || null,
              updatedAt: new Date()
            }
          });

          // Delete existing evidence and recommendations (will recreate)
          await tx.evidence.deleteMany({
            where: { findingId: finding.id }
          });

          await tx.recommendation.deleteMany({
            where: { findingId: finding.id }
          });
        } else {
          // Create new finding
          finding = await tx.finding.create({
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
        }

        // 2. Create evidence entries
        const createdEvidence = [];
        if (evidence && evidence.length > 0) {
          for (const evidenceItem of evidence) {
            const created = await tx.evidence.create({
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

        // 3. Create recommendation entries
        const createdRecommendations = [];
        if (recommendations && recommendations.length > 0) {
          for (const recommendation of recommendations) {
            const created = await tx.recommendation.create({
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

        // 4. Return complete finding with nested data
        return {
          ...finding,
          evidence: createdEvidence,
          recommendations: createdRecommendations
        };
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
