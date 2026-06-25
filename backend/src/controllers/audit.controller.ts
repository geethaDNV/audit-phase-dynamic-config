import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Audit Controller
 * 
 * Handles CRUD operations for audits themselves (not steps).
 * Provides basic audit management functionality.
 */
export class AuditController {
  /**
   * GET /api/audits
   * List all audits
   */
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const audits = await prisma.audit.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              name: true,
              email: true,
              industry: true,
            },
          },
          phases: {
            select: {
              phaseId: true,
              phaseName: true,
              status: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: audits,
      });
    } catch (error: any) {
      console.error('Error listing audits:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve audits',
          details: error.message,
        },
      });
    }
  }

  /**
   * GET /api/audits/:id
   * Get single audit details
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.id, 10);

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

      const audit = await prisma.audit.findUnique({
        where: { id: auditId },
        include: {
          client: true,
          phases: {
            orderBy: { phaseId: 'asc' },
          },
        },
      });

      if (!audit) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Audit with id ${auditId} not found`,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: audit,
      });
    } catch (error: any) {
      console.error('Error getting audit:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve audit',
          details: error.message,
        },
      });
    }
  }

  /**
   * POST /api/audits
   * Create new audit
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Audit name is required',
          },
        });
        return;
      }

      const audit = await prisma.audit.create({
        data: {
          name,
          description,
          status: 'draft',
          phases: {
            create: [
              {
                phaseId: 1,
                phaseName: 'Client Assessment',
                status: 'pending',
              },
              {
                phaseId: 2,
                phaseName: 'Checklist Execution',
                status: 'pending',
              },
            ],
          },
        },
        include: {
          phases: true,
        },
      });

      res.status(201).json({
        success: true,
        data: audit,
        message: 'Audit created successfully',
      });
    } catch (error: any) {
      console.error('Error creating audit:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create audit',
          details: error.message,
        },
      });
    }
  }

  /**
   * PUT /api/audits/:id
   * Update audit
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.id, 10);
      const { name, description, status } = req.body;

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

      const audit = await prisma.audit.update({
        where: { id: auditId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
        },
      });

      res.json({
        success: true,
        data: audit,
        message: 'Audit updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating audit:', error);

      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Audit with id ${req.params.id} not found`,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update audit',
          details: error.message,
        },
      });
    }
  }

  /**
   * DELETE /api/audits/:id
   * Delete audit
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const auditId = parseInt(req.params.id, 10);

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

      await prisma.audit.delete({
        where: { id: auditId },
      });

      res.json({
        success: true,
        message: 'Audit deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting audit:', error);

      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Audit with id ${req.params.id} not found`,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete audit',
          details: error.message,
        },
      });
    }
  }
}

export const auditController = new AuditController();
