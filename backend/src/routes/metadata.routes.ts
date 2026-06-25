import { Router } from 'express';
import { metadataController } from '../controllers/metadata.controller';

const router = Router();

/**
 * Metadata Routes
 * 
 * Provides form schemas and step information to the frontend
 */

// Get form schema for a specific step
router.get(
  '/phases/:phaseId/steps/:stepId',
  (req, res) => metadataController.getStepMetadata(req, res)
);

// Get all steps for a phase
router.get(
  '/phases/:phaseId/steps',
  (req, res) => metadataController.getPhaseSteps(req, res)
);

export default router;
