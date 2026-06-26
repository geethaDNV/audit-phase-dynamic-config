/**
 * Audit Wizard Component
 * Main wizard interface with phase/step navigation
 */

import { Component, signal, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuditService } from '../services/audit.service';
import { MetadataService } from '../services/metadata.service';
import { StepDataService } from '../services/step-data.service';
import { Audit } from '../models/audit.model';
import { StepConfig } from '../models/step-config.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { DynamicFormComponent } from '../../../shared/components/dynamic-form/dynamic-form.component';

interface Phase {
  id: number;
  name: string;
  stepCount: number;
}

@Component({
  selector: 'app-audit-wizard',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent, DynamicFormComponent],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <div class="bg-white shadow">
        <div class="container mx-auto px-4 py-4">
          <div class="flex justify-between items-center">
            <div>
              <button
                [routerLink]="['/audits']"
                class="text-blue-600 hover:text-blue-800 text-sm mb-1"
              >
                ← Back to Audits
              </button>
              <h1 class="text-2xl font-bold text-gray-900">
                {{ audit()?.name || 'Loading...' }}
              </h1>
            </div>
            @if (audit()) {
              <div class="text-right">
                <span class="text-sm text-gray-500">Status:</span>
                <span 
                  class="ml-2 px-3 py-1 text-sm rounded-full"
                  [class.bg-gray-200]="audit()!.status === 'draft'"
                  [class.bg-blue-200]="audit()!.status === 'in-progress'"
                  [class.bg-green-200]="audit()!.status === 'completed'"
                >
                  {{ audit()!.status }}
                </span>
              </div>
            }
          </div>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <!-- Main Content: Left Nav + Stepper -->
        <div class="flex">
          <!-- Left Navigation - Phases -->
          <div class="w-64 bg-white shadow-md min-h-screen">
            <div class="p-4">
              <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Phases
              </h2>
              <nav class="space-y-2">
                @for (phase of phases; track phase.id) {
                  <button
                    (click)="navigateToPhase(phase.id)"
                    class="w-full text-left px-4 py-3 rounded-lg transition-all"
                    [class.bg-blue-600]="phase.id === currentPhase()"
                    [class.text-white]="phase.id === currentPhase()"
                    [class.hover:bg-blue-700]="phase.id === currentPhase()"
                    [class.bg-gray-100]="phase.id !== currentPhase()"
                    [class.text-gray-700]="phase.id !== currentPhase()"
                    [class.hover:bg-gray-200]="phase.id !== currentPhase()"
                  >
                    <div class="flex items-center gap-3">
                      <div 
                        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                        [class.bg-white]="phase.id === currentPhase()"
                        [class.text-blue-600]="phase.id === currentPhase()"
                        [class.bg-gray-300]="phase.id !== currentPhase()"
                        [class.text-gray-600]="phase.id !== currentPhase()"
                      >
                        {{ phase.id }}
                      </div>
                      <div class="flex-1">
                        <div class="font-medium text-sm">
                          Phase {{ phase.id }}
                        </div>
                        <div class="text-xs opacity-90">
                          {{ phase.stepCount }} steps
                        </div>
                      </div>
                    </div>
                  </button>
                }
              </nav>
            </div>
          </div>

          <!-- Right Content - Horizontal Stepper + Form -->
          <div class="flex-1 bg-gray-50">
            @if (currentPhase()) {
              <div class="bg-white border-b px-8 py-6">
                <!-- Phase Title -->
                <h2 class="text-xl font-semibold text-gray-900 mb-6">
                  {{ getCurrentPhaseName() }}
                </h2>

                <!-- Horizontal Stepper -->
                <div class="flex items-center justify-between max-w-4xl">
                  @for (step of getStepsForCurrentPhase(); track step; let isLast = $last) {
                    <div class="flex items-center" [class.flex-1]="!isLast">
                      <!-- Step Circle -->
                      <button
                        (click)="goToStep(step)"
                        class="flex flex-col items-center gap-2"
                      >
                        <div 
                          class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                          [class.bg-blue-600]="step === currentStep()"
                          [class.text-white]="step === currentStep()"
                          [class.bg-gray-300]="step !== currentStep() && step > currentStep()"
                          [class.text-gray-600]="step !== currentStep() && step > currentStep()"
                          [class.bg-green-500]="step < currentStep()"
                          [class.text-white]="step < currentStep()"
                        >
                          @if (step < currentStep()) {
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                          } @else {
                            {{ step }}
                          }
                        </div>
                        <span 
                          class="text-xs font-medium whitespace-nowrap"
                          [class.text-blue-600]="step === currentStep()"
                          [class.text-gray-500]="step !== currentStep()"
                        >
                          {{ getStepName(currentPhase(), step) }}
                        </span>
                      </button>

                      <!-- Connecting Line -->
                      @if (!isLast) {
                        <div 
                          class="flex-1 h-0.5 mx-4"
                          [class.bg-green-500]="step < currentStep()"
                          [class.bg-gray-300]="step >= currentStep()"
                        ></div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Step Content Area -->
              <div class="p-8">
                <div class="max-w-4xl mx-auto">
                  @if (loadingStep()) {
                    <app-loading-spinner />
                  } @else if (stepMetadata()) {
                    <!-- Step Header -->
                    <div class="mb-6">
                      <h3 class="text-2xl font-bold text-gray-900 mb-2">
                        {{ stepMetadata()!.stepName }}
                      </h3>
                      @if (stepMetadata()!.description) {
                        <p class="text-gray-600">{{ stepMetadata()!.description }}</p>
                      }
                    </div>

                    <!-- Dynamic Form -->
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                      <app-dynamic-form
                        #dynamicForm
                        [formSchema]="stepMetadata()!.formSchema"
                        [initialData]="stepData()"
                        [hideButtons]="true"
                        (formSubmit)="onSubmit($event)"
                        (formCancel)="onCancel()"
                      />
                    </div>

                    <!-- Navigation Buttons -->
                    <div class="flex justify-between mt-6">
                      <button
                        (click)="previousStep()"
                        [disabled]="currentStep() === 1 || loadingStep()"
                        class="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        Previous
                      </button>
                      <button
                        (click)="saveAndNext()"
                        [disabled]="loadingStep()"
                        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        @if (loadingStep()) {
                          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        } @else {
                          @if (currentStep() === getStepsForCurrentPhase().length) {
                            Complete Phase
                          } @else {
                            Next
                          }
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        }
                      </button>
                    </div>
                  } @else {
                    <div class="bg-red-50 border border-red-200 rounded-md p-4">
                      <p class="text-red-800">Failed to load step data</p>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="flex items-center justify-center h-full">
                <p class="text-gray-500">Select a phase from the left to get started</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AuditWizardComponent implements OnInit {
  @ViewChild('dynamicForm') dynamicFormRef?: DynamicFormComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auditService = inject(AuditService);
  private metadataService = inject(MetadataService);
  private stepDataService = inject(StepDataService);

  audit = signal<Audit | null>(null);
  loading = signal(true);
  loadingStep = signal(false);
  currentPhase = signal(1);
  currentStep = signal(1);
  stepMetadata = signal<StepConfig | null>(null);
  stepData = signal<any>(null);

  // Phase configuration (matches backend POC scope)
  phases: Phase[] = [
    { id: 1, name: 'Client Assessment', stepCount: 3 },
    { id: 2, name: 'Checklist Execution', stepCount: 3 }
  ];

  // Step names (for display only)
  private stepNames: Record<string, string> = {
    '1-1': 'Client Basic Information',
    '1-2': 'Entity Selection',
    '1-3': 'Risk Assessment',
    '2-1': 'Checklist Execution',
    '2-2': 'Document Review',
    '2-3': 'Findings & Recommendations'
  };

  async ngOnInit() {
    const auditId = Number(this.route.snapshot.paramMap.get('auditId'));
    
    if (!auditId) {
      this.router.navigate(['/audits']);
      return;
    }

    await this.loadAudit(auditId);
    this.loading.set(false);
    
    // Load the first step
    await this.loadCurrentStep();
  }

  async loadAudit(id: number) {
    try {
      const audit = await this.auditService.getAudit(id);
      this.audit.set(audit);
    } catch (error) {
      console.error('Failed to load audit:', error);
      this.router.navigate(['/audits']);
    }
  }

  async navigateToPhase(phaseId: number) {
    this.currentPhase.set(phaseId);
    this.currentStep.set(1);
    await this.loadCurrentStep();
  }

  async goToStep(stepId: number) {
    this.currentStep.set(stepId);
    await this.loadCurrentStep();
  }

  async loadCurrentStep() {
    this.loadingStep.set(true);
    
    try {
      // Load step metadata
      const metadata = await this.metadataService.getStepMetadata(
        this.currentPhase(),
        this.currentStep()
      );
      this.stepMetadata.set(metadata);

      // Load step data
      const auditId = this.audit()?.id;
      if (auditId) {
        try {
          const data = await this.stepDataService.getStepData(
            auditId,
            this.currentPhase(),
            this.currentStep()
          );
          this.stepData.set(data);
        } catch (error) {
          // No existing data - start with empty form
          this.stepData.set(null);
        }
      }
    } catch (error) {
      console.error('Failed to load step:', error);
      this.stepMetadata.set(null);
    } finally {
      this.loadingStep.set(false);
    }
  }

  async saveAndNext() {
    if (!this.dynamicFormRef) return;

    // Validate form
    const result = this.dynamicFormRef.validateAndGetValue();
    if (!result.valid) {
      return;
    }

    // Save the form
    await this.onSubmit(result.value);
  }

  async previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
      await this.loadCurrentStep();
    }
  }

  async nextStep() {
    const maxSteps = this.getStepsForCurrentPhase().length;
    if (this.currentStep() < maxSteps) {
      this.currentStep.update(step => step + 1);
      await this.loadCurrentStep();
    }
  }

  async onSubmit(formValue: any) {
    this.loadingStep.set(true);

    try {
      const auditId = this.audit()?.id;
      if (!auditId) return;

      await this.stepDataService.saveStepData(
        auditId,
        this.currentPhase(),
        this.currentStep(),
        formValue
      );

      // Auto-advance to next step after successful save
      const maxSteps = this.getStepsForCurrentPhase().length;
      if (this.currentStep() < maxSteps) {
        await this.nextStep();
      } else {
        // Last step completed
        alert('Phase completed! You can now move to the next phase.');
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      let message = 'Failed to save step data';
      if (error.error?.message) {
        message = error.error.message;
      }
      alert(message);
    } finally {
      this.loadingStep.set(false);
    }
  }

  onCancel() {
    // Stay on current step, just reset form
    this.loadCurrentStep();
  }

  getStepsForCurrentPhase(): number[] {
    const phase = this.phases.find(p => p.id === this.currentPhase());
    if (!phase) return [];
    
    return Array.from({ length: phase.stepCount }, (_, i) => i + 1);
  }

  getStepName(phaseId: number, stepId: number): string {
    const key = `${phaseId}-${stepId}`;
    return this.stepNames[key] || `Step ${stepId}`;
  }

  getCurrentPhaseName(): string {
    const phase = this.phases.find(p => p.id === this.currentPhase());
    return phase?.name || '';
  }
}
