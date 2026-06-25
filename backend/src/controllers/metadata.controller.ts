import { Request, Response } from 'express';
import { metadataRegistry } from '../services/metadata-registry.service';

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
}

export const metadataController = new MetadataController();
