import { Router } from 'express';
import { metadataController } from '../controllers/metadata.controller';

const router = Router();

/**
 * Metadata Routes
 * 
 * Provides form schemas and step information to the frontend
 */

// Get all phases
router.get(
  '/phases',
  (req, res) => metadataController.getAllPhases(req, res)
);

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

// Get audit progress (all steps with their statuses)
router.get(
  '/audits/:auditId/progress',
  (req, res) => metadataController.getAuditProgress(req, res)
);

// Update step status
router.post(
  '/audits/:auditId/steps/:stepKey/status',
  (req, res) => metadataController.updateStepStatus(req, res)
);

export default router;
