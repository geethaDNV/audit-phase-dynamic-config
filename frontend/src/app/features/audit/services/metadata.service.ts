/**
 * Metadata Service
 * Fetches and caches form schemas from backend
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StepConfig } from '../models/step-config.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {
  private cache = new Map<string, StepConfig>();
  private loading = signal(false);

  constructor(private http: HttpClient) {}

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
