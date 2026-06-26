/**
 * Audit Service
 * Handles CRUD operations for audits
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Audit, CreateAuditRequest, UpdateAuditRequest, AuditPhase } from '../models/audit.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private audits = signal<Audit[]>([]);
  private currentAudit = signal<Audit | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Get all audits
   */
  async getAudits(): Promise<Audit[]> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: Audit[] }>(`${environment.apiUrl}/audits`)
    );
    const audits = response.data || [];
    this.audits.set(audits);
    return audits;
  }

  /**
   * Get audit by ID
   */
  async getAudit(id: number): Promise<Audit> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: Audit }>(`${environment.apiUrl}/audits/${id}`)
    );
    const audit = response.data;
    this.currentAudit.set(audit);
    return audit;
  }

  /**
   * Create new audit
   */
  async createAudit(data: CreateAuditRequest): Promise<Audit> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: Audit }>(`${environment.apiUrl}/audits`, data)
    );
    const audit = response.data;
    
    // Update local state
    const current = this.audits();
    this.audits.set([...current, audit]);
    
    return audit;
  }

  /**
   * Update existing audit
   */
  async updateAudit(id: number, data: UpdateAuditRequest): Promise<Audit> {
    const response = await firstValueFrom(
      this.http.put<{ success: boolean; data: Audit }>(`${environment.apiUrl}/audits/${id}`, data)
    );
    const audit = response.data;
    
    // Update local state
    const current = this.audits();
    const index = current.findIndex(a => a.id === id);
    if (index !== -1) {
      current[index] = audit;
      this.audits.set([...current]);
    }
    
    if (this.currentAudit()?.id === id) {
      this.currentAudit.set(audit);
    }
    
    return audit;
  }

  /**
   * Delete audit
   */
  async deleteAudit(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/audits/${id}`)
    );
    
    // Update local state
    const current = this.audits();
    this.audits.set(current.filter(a => a.id !== id));
    
    if (this.currentAudit()?.id === id) {
      this.currentAudit.set(null);
    }
  }

  /**
   * Get phase statuses for an audit
   */
  async getPhaseStatuses(auditId: number): Promise<AuditPhase[]> {
    const response = await firstValueFrom(
      this.http.get<{ success: boolean; data: AuditPhase[] }>(
        `${environment.apiUrl}/audits/${auditId}/phases`
      )
    );
    return response.data || [];
  }

  /**
   * Mark phase as complete
   */
  async completePhase(auditId: number, phaseId: number): Promise<void> {
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/audits/${auditId}/phases/${phaseId}/complete`, {})
    );
  }

  /**
   * Get audits signal
   */
  getAuditsSignal() {
    return this.audits.asReadonly();
  }

  /**
   * Get current audit signal
   */
  getCurrentAuditSignal() {
    return this.currentAudit.asReadonly();
  }
}
