import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';

const router = Router();

/**
 * Audit Routes
 * 
 * Basic CRUD operations for audits
 */

router.get('/', (req, res) => auditController.list(req, res));
router.get('/:id/metadata', (req, res) => auditController.getMetadata(req, res));
router.get('/:id', (req, res) => auditController.getById(req, res));
router.post('/', (req, res) => auditController.create(req, res));
router.put('/:id', (req, res) => auditController.update(req, res));
router.delete('/:id', (req, res) => auditController.delete(req, res));

export default router;
