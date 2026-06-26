import { Request, Response } from 'express';
import { StepService } from '../services/step.service';
import { metadataRegistry } from '../services/metadata-registry.service';
import { ValidationError } from '../services/validation.service';
import prisma from '../config/database';

/**
 * Step Controller
 * 
 * THE MAGIC HAPPENS HERE!
 * 
 * This is the ONE controller that handles ALL 80 steps.
 * No hardcoded step logic - everything is driven by metadata.
 * 
 * Endpoints:
 * - GET  /api/audits/:auditId/phases/:phaseId/steps/:stepId - Fetch step data
 * - POST /api/audits/:auditId/phases/:phaseId/steps/:stepId - Save step data
 * 
 * The same routes work for:
 * - Step 1 (client info)
 * - Step 2 (entity selection)
 * - Step 3 (risk assessment)
 * - ... all 80 steps!
 */
export class StepController {
  private stepService: StepService;

  constructor() {
    this.stepService = new StepService(prisma, metadataRegistry);
  }

  /**
   * GET /api/audits/:auditId/phases/:phaseId/steps/:stepId
   * 
   * Fetch data for any step using configured fetch strategy
   */
  async getStepData(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.auditId, 10);
      const phaseId = parseInt(req.params.phaseId, 10);
      const stepId = parseInt(req.params.stepId, 10);

      // Validate parameters
      if (isNaN(auditId) || isNaN(phaseId) || isNaN(stepId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'auditId, phaseId, and stepId must be valid numbers',
          },
        });
        return;
      }

      // Fetch data using metadata-driven strategy
      const data = await this.stepService.getStepData(auditId, phaseId, stepId);

      res.json({
        success: true,
        data: data || {},
      });
    } catch (error: any) {
      console.error('Error fetching step data:', error);

      if (error.message.includes('not found') || error.message.includes('does not exist')) {
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
          message: 'Failed to fetch step data',
          details: error.message,
        },
      });
    }
  }

  /**
   * POST /api/audits/:auditId/phases/:phaseId/steps/:stepId
   * 
   * Save data for any step using configured save strategy
   */
  async saveStepData(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.auditId, 10);
      const phaseId = parseInt(req.params.phaseId, 10);
      const stepId = parseInt(req.params.stepId, 10);
      const payload = req.body;

      // Validate parameters
      if (isNaN(auditId) || isNaN(phaseId) || isNaN(stepId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'auditId, phaseId, and stepId must be valid numbers',
          },
        });
        return;
      }

      // Validate payload exists
      if (!payload || Object.keys(payload).length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_PAYLOAD',
            message: 'Request body cannot be empty',
          },
        });
        return;
      }

      // Save data using metadata-driven strategy
      const result = await this.stepService.saveStepData(auditId, phaseId, stepId, payload);

      res.json({
        success: true,
        data: result,
        message: 'Step data saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving step data:', error);

      // Handle ValidationError with field-specific errors
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            fieldErrors: error.fieldErrors,
            errors: error.errors,
          },
        });
        return;
      }

      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STEP_NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save step data',
          details: error.message,
        },
      });
    }
  }
}

export const stepController = new StepController();
