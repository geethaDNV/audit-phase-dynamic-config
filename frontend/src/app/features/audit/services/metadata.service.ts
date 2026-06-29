/**
 * Metadata Service
 * Fetches and caches form schemas and phase/step metadata from backend
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StepConfig } from '../models/step-config.model';
import { environment } from '../../../../environments/environment';

export interface PhaseMetadata {
  phaseId: number;
  phaseKey: string;
  phaseName: string;
  description?: string;
  displayOrder: number;
  icon?: string;
  color?: string;
  steps: StepMetadata[];
}

export interface StepMetadata {
  stepId: number;
  stepKey: string;
  stepName: string;
  description?: string;
}

export interface StepProgress {
  stepKey: string;
  phaseId: number;
  stepId: number;
  stepName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'blocked';
  startedAt?: string;
  completedAt?: string;
  blockedBy?: string[];
  blockedReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetadataService {
  private cache = new Map<string, StepConfig>();
  private loading = signal(false);
  
  // ✅ NEW: Signals for phases and progress
  phases = signal<PhaseMetadata[]>([]);
  currentAuditProgress = signal<Map<string, StepProgress>>(new Map());

  constructor(private http: HttpClient) {}

  /**
   * ✅ NEW: Load all phases and steps from API
   * Called once on app initialization
   */
  async loadPhases(): Promise<void> {
    this.loading.set(true);
    
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: PhaseMetadata[] }>(
          `${environment.apiUrl}/metadata/phases`
        )
      );
      
      this.phases.set(response.data);
      console.log(`✅ Loaded ${response.data.length} phases from API`);
    } catch (error) {
      console.error('Failed to load phases:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
  
  /**
   * ✅ UPDATED: Load progress for a specific audit
   * Initializes step statuses if they don't exist
   */
  async loadAuditProgress(auditId: number): Promise<void> {
    this.loading.set(true);
    
    try {
      // First, ensure step statuses are initialized
      await this.initializeStepStatuses(auditId);
      
      // Then load the progress
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: StepProgress[] }>(
          `${environment.apiUrl}/metadata/audits/${auditId}/progress`
        )
      );
      
      // Convert to Map for O(1) lookup
      const progressMap = new Map<string, StepProgress>();
      response.data.forEach(step => {
        progressMap.set(step.stepKey, step);
      });
      
      this.currentAuditProgress.set(progressMap);
      console.log(`✅ Loaded progress for ${response.data.length} steps`);
    } catch (error) {
      console.error('Failed to load audit progress:', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
  
  /**
   * ✅ NEW: Initialize step statuses for an audit
   * Called automatically when loading audit progress
   */
  private async initializeStepStatuses(auditId: number): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ 
          success: boolean; 
          data: { initialized: number; existing: number; total: number } 
        }>(
          `${environment.apiUrl}/metadata/audits/${auditId}/initialize-steps`,
          {}
        )
      );
      
      if (response.data.initialized > 0) {
        console.log(`✅ Initialized ${response.data.initialized} step statuses`);
      }
    } catch (error) {
      console.error('Failed to initialize step statuses:', error);
      // Don't throw - continue even if initialization fails
    }
  }
  
  /**
   * ✅ NEW: Update step status
   */
  async updateStepStatus(
    auditId: number,
    stepKey: string,
    status: StepProgress['status'],
    blockedReason?: string
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/metadata/audits/${auditId}/steps/${stepKey}/status`,
          { status, blockedReason }
        )
      );
      
      // Reload progress
      await this.loadAuditProgress(auditId);
    } catch (error) {
      console.error('Failed to update step status:', error);
      throw error;
    }
  }
  
  /**
   * ✅ NEW: Get phase by ID
   */
  getPhase(phaseId: number): PhaseMetadata | undefined {
    return this.phases().find(p => p.phaseId === phaseId);
  }
  
  /**
   * ✅ NEW: Get step info by stepKey
   */
  getStep(stepKey: string): { phase: PhaseMetadata; step: StepMetadata } | null {
    for (const phase of this.phases()) {
      const step = phase.steps.find(s => s.stepKey === stepKey);
      if (step) {
        return { phase, step };
      }
    }
    return null;
  }
  
  /**
   * ✅ NEW: Get step progress
   */
  getStepProgress(stepKey: string): StepProgress | undefined {
    return this.currentAuditProgress().get(stepKey);
  }
  
  /**
   * ✅ FIXED: Check if step is available
   * A step is available if:
   * 1. All required steps are completed
   * 2. The step is not blocked
   * 3. Progress records exist (if missing, step is NOT available except first step)
   */
  isStepAvailable(stepKey: string): boolean {
    // Get step metadata to check dependencies
    const stepInfo = this.getStep(stepKey);
    if (!stepInfo) {
      console.warn(`[isStepAvailable] Step not found: ${stepKey}`);
      return false;
    }
    
    const [phaseIdStr, stepIdStr] = stepKey.split('-');
    const phaseId = parseInt(phaseIdStr);
    const stepId = parseInt(stepIdStr);
    
    // First step of first phase is always available
    if (phaseId === 1 && stepId === 1) return true;
    
    // Get progress for this step
    const progress = this.getStepProgress(stepKey);
    
    // ✅ FIX: If no progress record exists (undefined), step is NOT available
    // This handles the case where phase 2 steps weren't initialized
    if (!progress) {
      console.warn(`[isStepAvailable] No progress record for ${stepKey} - step not available`);
      return false;
    }
    
    // If step is blocked, it's not available
    if (progress.status === 'blocked') {
      console.log(`[isStepAvailable] Step ${stepKey} is blocked: ${progress.blockedReason}`);
      return false;
    }
    
    // If step is already completed or in-progress, it's available
    if (progress.status === 'completed' || progress.status === 'in-progress') {
      return true;
    }
    
    // Step has 'pending' or 'skipped' status - check if dependencies are met
    
    // For steps 2+ in a phase, check if previous step is completed
    if (stepId > 1) {
      const previousStepKey = `${phaseId}-${stepId - 1}`;
      const previousProgress = this.getStepProgress(previousStepKey);
      
      // ✅ FIX: Previous step must exist AND be completed
      if (!previousProgress) {
        console.warn(`[isStepAvailable] Previous step ${previousStepKey} has no progress record`);
        return false;
      }
      
      if (previousProgress.status !== 'completed') {
        console.log(`[isStepAvailable] Previous step ${previousStepKey} not completed (status: ${previousProgress.status})`);
        return false;
      }
      
      return true;
    }
    
    // First step of other phases (e.g., 2-1) - check if ALL steps in previous phase are completed
    if (phaseId > 1 && stepId === 1) {
      const previousPhaseId = phaseId - 1;
      const previousPhase = this.phases().find(p => p.phaseId === previousPhaseId);
      
      if (!previousPhase) {
        console.warn(`[isStepAvailable] Previous phase ${previousPhaseId} not found`);
        return false;
      }
      
      // ✅ FIX: ALL steps in previous phase must exist AND be completed
      const allPreviousCompleted = previousPhase.steps.every(step => {
        const stepProgress = this.getStepProgress(step.stepKey);
        
        if (!stepProgress) {
          console.warn(`[isStepAvailable] Step ${step.stepKey} in previous phase has no progress record`);
          return false;
        }
        
        return stepProgress.status === 'completed';
      });
      
      if (!allPreviousCompleted) {
        console.log(`[isStepAvailable] Not all steps in phase ${previousPhaseId} are completed`);
      }
      
      return allPreviousCompleted;
    }
    
    // Default: not available
    console.warn(`[isStepAvailable] Unexpected case for step ${stepKey}`);
    return false;
  }


  /**
   * Get step metadata (form schema + data config)
   * Caches result to avoid redundant API calls
   */
  async getStepMetadata(phaseId: number, stepId: number): Promise<StepConfig> {
    const cacheKey = `${phaseId}-${stepId}`;

    // Return cached if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Fetch from API
    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: StepConfig }>(
          `${environment.apiUrl}/metadata/phases/${phaseId}/steps/${stepId}`
        )
      );

      const metadata = response.data;
      // Cache the result
      this.cache.set(cacheKey, metadata);
      return metadata;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Preload metadata for all steps in a phase
   */
  async preloadPhaseMetadata(phaseId: number, stepCount: number): Promise<void> {
    const promises = [];
    for (let stepId = 1; stepId <= stepCount; stepId++) {
      promises.push(this.getStepMetadata(phaseId, stepId));
    }
    await Promise.all(promises);
  }

  /**
   * Clear cache (useful for development/testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get loading state signal
   */
  isLoading() {
    return this.loading.asReadonly();
  }
}
