/**
 * Audit Models
 * Frontend models matching backend Prisma schema
 */

export interface Audit {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'in-progress' | 'completed';
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    name: string;
    email: string;
    industry: string;
  };
  phases?: AuditPhase[];
}

export interface AuditPhase {
  phaseId: number;
  phaseName: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: string;
}

export interface CreateAuditRequest {
  name: string;
  description?: string;
  status?: string;
}

export interface UpdateAuditRequest {
  name?: string;
  status?: string;
}
