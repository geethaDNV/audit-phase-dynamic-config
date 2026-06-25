import { Router } from 'express';
import { stepController } from '../controllers/step.controller';

const router = Router();

/**
 * Step Routes
 * 
 * THE MAGIC PARAMETERIZED ROUTES!
 * 
 * These TWO routes handle ALL 80 steps:
 * - GET  - Fetch step data
 * - POST - Save step data
 * 
 * Same routes work for:
 * - /api/audits/1/phases/1/steps/1 (client info)
 * - /api/audits/1/phases/1/steps/2 (entity selection)
 * - /api/audits/1/phases/1/steps/3 (risk assessment)
 * - ... all 80 steps!
 */

// Fetch step data
router.get(
  '/:auditId/phases/:phaseId/steps/:stepId',
  (req, res) => stepController.getStepData(req, res)
);

// Save step data
router.post(
  '/:auditId/phases/:phaseId/steps/:stepId',
  (req, res) => stepController.saveStepData(req, res)
);

export default router;
