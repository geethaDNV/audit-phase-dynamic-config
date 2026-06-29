import { Request, Response } from 'express';
import { metadataRegistry } from '../services/metadata-registry.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Metadata Controller
 * 
 * Provides form schemas and step metadata to the frontend.
 * The frontend uses this to dynamically build forms without hardcoded components.
 */
export class MetadataController {
  /**
   * GET /api/metadata/phases/:phaseId/steps/:stepId
   * 
   * Returns form schema and basic metadata for a step
   * Frontend uses this to build the dynamic form
   */
  async getStepMetadata(req: Request, res: Response): Promise<void> {
    try {
      const phaseId = parseInt(req.params.phaseId, 10);
      const stepId = parseInt(req.params.stepId, 10);

      // Validate parameters
      if (isNaN(phaseId) || isNaN(stepId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'phaseId and stepId must be valid numbers',
          },
        });
        return;
      }

      // Get form schema
      const schema = metadataRegistry.getFormSchema(phaseId, stepId);

      res.json({
        success: true,
        data: schema,
      });
    } catch (error: any) {
      console.error('Error getting step metadata:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STEP_NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve step metadata',
          details: error.message,
        },
      });
    }
  }

  /**
   * GET /api/metadata/phases/:phaseId/steps
   * 
   * Returns all steps for a phase
   */
  async getPhaseSteps(req: Request, res: Response): Promise<void> {
    try {
      const phaseId = parseInt(req.params.phaseId, 10);

      if (isNaN(phaseId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'phaseId must be a valid number',
          },
        });
        return;
      }

      const steps = metadataRegistry.getPhaseSteps(phaseId);

      res.json({
        success: true,
        data: steps.map((step) => ({
          phaseId: step.phaseId,
          stepId: step.stepId,
          stepName: step.stepName,
          description: step.description,
        })),
      });
    } catch (error: any) {
      console.error('Error getting phase steps:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve phase steps',
          details: error.message,
        },
      });
    }
  }

  /**
   * GET /api/metadata/phases
   * 
   * Returns all available phases with their steps from database
   * ✅ FULLY DYNAMIC - No hardcoded phases or steps!
   */
  async getAllPhases(_req: Request, res: Response): Promise<void> {
    try {
      // ✅ Load phase configurations from database (not hardcoded!)
      const phaseConfigs = await prisma.phaseConfiguration.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      });
      
      // ✅ Load step configurations from database (not from TypeScript registry!)
      const stepConfigs = await prisma.stepConfiguration.findMany({
        where: { isActive: true },
        select: {
          stepKey: true,
          phaseId: true,
          stepId: true,
          stepName: true,
          description: true
        },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });
      
      // Group steps by phase
      const stepsByPhase = new Map<number, any[]>();
      stepConfigs.forEach(step => {
        if (!stepsByPhase.has(step.phaseId)) {
          stepsByPhase.set(step.phaseId, []);
        }
        stepsByPhase.get(step.phaseId)!.push({
          stepId: step.stepId,
          stepKey: step.stepKey,
          stepName: step.stepName,
          description: step.description
        });
      });
      
      // Combine phase configs with their steps
      const result = phaseConfigs.map(phase => ({
        phaseId: phase.phaseId,
        phaseKey: phase.phaseKey,
        phaseName: phase.phaseName,
        description: phase.description,
        displayOrder: phase.displayOrder,
        icon: phase.icon,
        color: phase.color,
        steps: stepsByPhase.get(phase.phaseId) || []
      }));

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error getting all phases:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve phases',
          details: error.message,
        },
      });
    }
  }

  /**
   * GET /api/metadata/audits/:auditId/progress
   * 
   * Returns progress for all steps in an audit
   * ✅ Loads steps from database, not TypeScript registry
   */
  async getAuditProgress(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.auditId, 10);

      if (isNaN(auditId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'auditId must be a valid number',
          },
        });
        return;
      }

      // Get all step statuses for this audit
      const statuses = await prisma.auditStepStatus.findMany({
        where: { auditId },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });

      // ✅ Get all available steps from database (not registry!)
      const allSteps = await prisma.stepConfiguration.findMany({
        where: { isActive: true },
        select: {
          stepKey: true,
          phaseId: true,
          stepId: true,
          stepName: true
        },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });

      // Merge status with configuration
      const progress = allSteps.map(step => {
        const status = statuses.find(s => s.stepKey === step.stepKey);

        return {
          stepKey: step.stepKey,
          phaseId: step.phaseId,
          stepId: step.stepId,
          stepName: step.stepName,
          status: status?.status || 'pending',
          startedAt: status?.startedAt,
          completedAt: status?.completedAt,
          blockedBy: status?.blockedBy || [],
          blockedReason: status?.blockedReason
        };
      });

      res.json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      console.error('Error getting audit progress:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve audit progress',
          details: error.message,
        },
      });
    }
  }

  /**
   * POST /api/metadata/audits/:auditId/steps/:stepKey/status
   * 
   * Update step status (start, complete, skip, block)
   */
  async updateStepStatus(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.auditId, 10);
      const { stepKey } = req.params;
      const { status, blockedReason } = req.body;

      if (isNaN(auditId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'auditId must be a valid number',
          },
        });
        return;
      }

      // Validate status
      const validStatuses = ['pending', 'in-progress', 'completed', 'skipped', 'blocked'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
        });
        return;
      }

      // Parse stepKey to get phaseId and stepId
      const [phaseId, stepId] = stepKey.split('-').map(Number);

      if (isNaN(phaseId) || isNaN(stepId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STEP_KEY',
            message: 'stepKey must be in format "phaseId-stepId" (e.g., "1-1")',
          },
        });
        return;
      }

      // ✅ Verify step exists in database (not registry!)
      const stepExists = await prisma.stepConfiguration.findUnique({
        where: { stepKey }
      });

      if (!stepExists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STEP_NOT_FOUND',
            message: `Step ${stepKey} not found`,
          },
        });
        return;
      }

      // Update or create status
      const stepStatus = await prisma.auditStepStatus.upsert({
        where: {
          auditId_phaseId_stepId: {
            auditId,
            phaseId,
            stepId
          }
        },
        create: {
          auditId,
          phaseId,
          stepId,
          stepKey,
          status,
          startedAt: status === 'in-progress' ? new Date() : undefined,
          completedAt: status === 'completed' ? new Date() : undefined,
          blockedReason: status === 'blocked' ? blockedReason : undefined
        },
        update: {
          status,
          startedAt: status === 'in-progress' ? new Date() : undefined,
          completedAt: status === 'completed' ? new Date() : undefined,
          blockedReason: status === 'blocked' ? blockedReason : undefined
        }
      });

      res.json({
        success: true,
        data: stepStatus,
      });
    } catch (error: any) {
      console.error('Error updating step status:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update step status',
          details: error.message,
        },
      });
    }
  }

  /**
   * POST /api/metadata/audits/:auditId/initialize-steps
   * 
   * Initialize step statuses for an audit
   * Creates pending status records for all active steps
   */
  async initializeStepStatuses(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.auditId, 10);

      if (isNaN(auditId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'auditId must be a valid number',
          },
        });
        return;
      }

      // Verify audit exists
      const audit = await prisma.audit.findUnique({
        where: { id: auditId }
      });

      if (!audit) {
        res.status(404).json({
          success: false,
          error: {
            code: 'AUDIT_NOT_FOUND',
            message: `Audit ${auditId} not found`,
          },
        });
        return;
      }

      // Get all active steps from database
      const allSteps = await prisma.stepConfiguration.findMany({
        where: { isActive: true },
        select: {
          stepKey: true,
          phaseId: true,
          stepId: true
        },
        orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
      });

      // Check which steps already have status records
      const existingStatuses = await prisma.auditStepStatus.findMany({
        where: { auditId },
        select: { stepKey: true }
      });

      const existingStepKeys = new Set(existingStatuses.map(s => s.stepKey));

      // Create status records for steps that don't have them
      const newStatuses = allSteps
        .filter(step => !existingStepKeys.has(step.stepKey))
        .map(step => ({
          auditId,
          phaseId: step.phaseId,
          stepId: step.stepId,
          stepKey: step.stepKey,
          status: 'pending'
        }));

      if (newStatuses.length > 0) {
        await prisma.auditStepStatus.createMany({
          data: newStatuses
        });
      }

      res.json({
        success: true,
        data: {
          initialized: newStatuses.length,
          existing: existingStatuses.length,
          total: allSteps.length
        },
      });
    } catch (error: any) {
      console.error('Error initializing step statuses:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to initialize step statuses',
          details: error.message,
        },
      });
    }
  }
}

export const metadataController = new MetadataController();
