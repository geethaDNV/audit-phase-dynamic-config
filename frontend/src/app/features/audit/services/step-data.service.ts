/**
 * Step Data Service
 * Handles step data fetch/save for metadata-driven forms
 * 
 * Backend repositories return data matching FormSchema field names
 * Frontend renders forms dynamically based on metadata - no step-specific logic
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StepDataService {
  constructor(private http: HttpClient) {}

  /**
   * Get step data from backend
   * Backend repositories return data matching FormSchema field names
   */
  async getStepData(auditId: number, phaseId: number, stepId: number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: any }>(
          `${environment.apiUrl}/audits/${auditId}/phases/${phaseId}/steps/${stepId}`
        )
      );

      // Backend returns form-ready data - extract from wrapper
      return response.data;
    } catch (error: any) {
      // If no data exists yet, return null/empty
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save step data to backend
   * Backend handles pattern-specific save logic based on metadata configuration
   */
  async saveStepData(
    auditId: number,
    phaseId: number,
    stepId: number,
    formData: any
  ): Promise<any> {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; data: any }>(
        `${environment.apiUrl}/audits/${auditId}/phases/${phaseId}/steps/${stepId}`,
        formData
      )
    );
    return response.data;
  }
}
