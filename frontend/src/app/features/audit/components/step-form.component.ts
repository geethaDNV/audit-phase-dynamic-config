/**
 * Step Form Component
 * Generic step container that handles ALL steps
 * Uses metadata to render the appropriate form dynamically
 */

import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MetadataService } from '../services/metadata.service';
import { StepDataService } from '../services/step-data.service';
import { StepConfig } from '../models/step-config.model';
import { DynamicFormComponent } from '../../../shared/components/dynamic-form/dynamic-form.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';

@Component({
  selector: 'app-step-form',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent, LoadingSpinnerComponent],
  template: `
    <div class="step-container max-w-4xl mx-auto p-6">
      @if (loading()) {
        <app-loading-spinner />
      } @else if (stepMetadata()) {
        <div class="bg-white rounded-lg shadow-md p-8">
          <!-- Step Header -->
          <div class="mb-6 pb-4 border-b">
            <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>Phase {{ phaseId }}</span>
              <span>•</span>
              <span>Step {{ stepId }}</span>
            </div>
            <h2 class="text-2xl font-bold text-gray-900">
              {{ stepMetadata()!.stepName }}
            </h2>
            @if (stepMetadata()!.description) {
              <p class="mt-2 text-gray-600">{{ stepMetadata()!.description }}</p>
            }
          </div>

          <!-- Dynamic Form -->
          <app-dynamic-form
            [formSchema]="stepMetadata()!.formSchema"
            [initialData]="stepData()"
            (formSubmit)="onSubmit($event)"
            (formCancel)="onCancel()"
          />
        </div>
      } @else {
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-800">Failed to load step metadata</p>
        </div>
      }
    </div>
  `
})
export class StepFormComponent implements OnInit {
  // Route parameters
  auditId!: number;
  phaseId!: number;
  stepId!: number;

  // State
  loading = signal(true);
  stepMetadata = signal<StepConfig | null>(null);
  stepData = signal<any>(null);

  private route = inject(ActivatedRoute);
  private metadataService = inject(MetadataService);
  private stepDataService = inject(StepDataService);
  private router = inject(Router);

  async ngOnInit() {
    // Get route parameters
    this.auditId = Number(this.route.snapshot.paramMap.get('auditId'));
    this.phaseId = Number(this.route.snapshot.paramMap.get('phaseId'));
    this.stepId = Number(this.route.snapshot.paramMap.get('stepId'));

    await this.loadStepMetadata();
    await this.loadStepData();
    this.loading.set(false);
  }

  /**
   * Load step metadata (form schema + data config)
   */
  private async loadStepMetadata() {
    try {
      const metadata = await this.metadataService.getStepMetadata(
        this.phaseId,
        this.stepId
      );
      this.stepMetadata.set(metadata);
    } catch (error) {
      console.error('Failed to load step metadata:', error);
    }
  }

  /**
   * Load existing step data (if any)
   */
  private async loadStepData() {
    try {
      const data = await this.stepDataService.getStepData(
        this.auditId,
        this.phaseId,
        this.stepId
      );
      this.stepData.set(data);
    } catch (error) {
      // No existing data - start with empty form
      this.stepData.set(null);
    }
  }

  /**
   * Handle form submission
   */
  async onSubmit(formValue: any) {
    this.loading.set(true);

    try {
      await this.stepDataService.saveStepData(
        this.auditId,
        this.phaseId,
        this.stepId,
        formValue
      );

      // Navigate back to wizard
      this.router.navigate(['/audits', this.auditId, 'wizard']);
    } catch (error: any) {
      console.error('Save failed:', error);
      
      // Show error message
      let message = 'Failed to save step data';
      if (error.error?.message) {
        message = error.error.message;
      }
      alert(message);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle form cancellation
   */
  onCancel() {
    this.router.navigate(['/audits', this.auditId, 'wizard']);
  }
}
