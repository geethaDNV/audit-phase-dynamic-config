import { PrismaClient } from '@prisma/client';
import { BaseStepRepository } from '../base/base-step.repository';
import { StepContext } from '../../config/types/step-config.types';

export class Step3Repository extends BaseStepRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Implement abstract fetch method
   */
  async fetch(context: StepContext): Promise<any> {
    return this.fetchData(context);
  }

  /**
   * Implement abstract save method
   */
  async save(data: any, context: StepContext): Promise<any> {
    return this.saveData(context, data);
  }

  /**
   * Complex fetch using raw SQL to aggregate risk data from multiple sources
   * Demonstrates Pattern 3: Custom Query with $queryRaw
   */
  async fetchData(context: StepContext): Promise<any> {
    const { auditId } = context;

    try {
      // Use raw SQL to fetch aggregated risk data with related entity and client info
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT 
          ra.id,
          ra."auditId",
          ra."riskLevel",
          ra."riskScore",
          ra."previousRisk",
          ra.justification,
          ra."assessedAt",
          ra."createdAt",
          ra."updatedAt",
          -- Aggregate data from related tables
          COUNT(DISTINCT f.id) as "findingsCount",
          COUNT(DISTINCT d.id) as "documentsCount",
          AVG(CASE 
            WHEN f.severity = 'Critical' THEN 100
            WHEN f.severity = 'High' THEN 75
            WHEN f.severity = 'Medium' THEN 50
            WHEN f.severity = 'Low' THEN 25
            ELSE 0
          END) as "averageFindingSeverity"
        FROM "RiskAssessment" ra
        LEFT JOIN "Audit" a ON a.id = ra."auditId"
        LEFT JOIN "Finding" f ON f."auditId" = a.id
        LEFT JOIN "Document" d ON d."auditId" = a.id
        WHERE ra."auditId" = ${auditId}
        GROUP BY 
          ra.id, ra."auditId", ra."riskLevel", ra."riskScore",
          ra."previousRisk", ra.justification, ra."assessedAt", 
          ra."createdAt", ra."updatedAt"
        LIMIT 1
      `;

      if (result.length === 0) {
        // Return empty structure if no risk assessment exists yet
        return {
          riskLevel: '',
          riskScore: 0,
          previousRisk: null,
          justification: '',
          findingsCount: 0,
          documentsCount: 0,
          averageFindingSeverity: 0
        };
      }

      // Convert BigInt to Number for JSON serialization
      const data = result[0];
      return {
        ...data,
        findingsCount: Number(data.findingsCount || 0),
        documentsCount: Number(data.documentsCount || 0),
        averageFindingSeverity: Number(data.averageFindingSeverity || 0)
      };
    } catch (error) {
      console.error('Error fetching risk assessment data:', error);
      throw error;
    }
  }

  /**
   * Save risk assessment using upsert
   */
  async saveData(context: StepContext, data: any): Promise<any> {
    const { auditId } = context;

    const riskAssessment = await this.prisma.riskAssessment.upsert({
      where: { auditId },
      update: {
        riskLevel: data.riskLevel,
        riskScore: data.riskScore,
        previousRisk: data.previousRisk || null,
        justification: data.justification || null,
        assessedAt: new Date()
      },
      create: {
        auditId,
        riskLevel: data.riskLevel,
        riskScore: data.riskScore,
        previousRisk: data.previousRisk || null,
        justification: data.justification || null,
        assessedAt: new Date()
      }
    });

    return riskAssessment;
  }
}
