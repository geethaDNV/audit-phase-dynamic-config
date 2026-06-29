/**
 * Phase Navigator Component
 * ✅ FULLY DYNAMIC - Loads phases and steps from API (no hardcoding!)
 */

import { Component, computed, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MetadataService, PhaseMetadata } from '../services/metadata.service';

@Component({
  selector: 'app-phase-navigator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border-b shadow-sm">
      <div class="container mx-auto px-4">
        <!-- Phase Tabs -->
        <div class="flex gap-4 overflow-x-auto">
          @for (phase of phases(); track phase.phaseId) {
            <button
              (click)="selectPhase(phase.phaseId)"
              class="px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2"
              [class.border-blue-600]="phase.phaseId === currentPhase()"
              [class.text-blue-600]="phase.phaseId === currentPhase()"
              [class.border-transparent]="phase.phaseId !== currentPhase()"
              [class.text-gray-600]="phase.phaseId !== currentPhase()"
              [class.hover:text-gray-900]="phase.phaseId !== currentPhase()"
              [style.border-color]="phase.phaseId === currentPhase() ? phase.color : 'transparent'"
            >
              <!-- ✅ Dynamic icon from database -->
              @if (phase.icon) {
                <span class="text-lg">{{ phase.icon }}</span>
              }
              
              <!-- ✅ Dynamic phase name from database -->
              <span>{{ phase.phaseName }}</span>
              
              <!-- Progress indicator -->
              <span class="ml-2 text-xs text-gray-500">
                ({{ getPhaseProgress(phase) }})
              </span>
            </button>
          }
        </div>
      </div>
    </div>

    <!-- Step Navigation -->
    <div class="bg-gray-50 border-b py-3">
      <div class="container mx-auto px-4">
        @if (currentPhaseData(); as phase) {
          <div class="flex items-center gap-2 overflow-x-auto">
            <span class="text-sm text-gray-600 whitespace-nowrap font-medium">Steps:</span>
            
            @for (step of phase.steps; track step.stepKey; let idx = $index) {
              <div class="flex items-center">
                <!-- Step Button -->
                <button
                  (click)="navigateToStep(step.stepKey)"
                  class="px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 whitespace-nowrap"
                  [class]="getStepButtonClass(step.stepKey)"
                  [disabled]="!isStepAvailable(step.stepKey)"
                  [title]="step.description || step.stepName"
                >
                  <!-- Status Icon -->
                  <span class="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    @switch (getStepStatus(step.stepKey)) {
                      @case ('completed') {
                        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                      }
                      @case ('in-progress') {
                        <div class="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                      }
                      @case ('blocked') {
                        <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
                        </svg>
                      }
                      @default {
                        <div class="w-3 h-3 bg-gray-300 rounded-full"></div>
                      }
                    }
                  </span>
                  
                  <!-- Step Number & Name -->
                  <span>
                    <span class="font-medium">{{ idx + 1 }}.</span>
                    {{ step.stepName }}
                  </span>
                </button>
                
                <!-- Arrow between steps -->
                @if (idx < phase.steps.length - 1) {
                  <svg class="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                  </svg>
                }
              </div>
            }
          </div>
        } @else {
          <div class="text-sm text-gray-500">No steps available for this phase</div>
        }
      </div>
    </div>
  `
})
export class PhaseNavigatorComponent {
  private metadataService = inject(MetadataService);
  private router = inject(Router);
  
  // Inputs
  auditId = input.required<number>();
  currentStepKey = input<string>();
  
  // ✅ Dynamic phases from API
  phases = this.metadataService.phases;
  
  // Compute current phase from currentStepKey
  currentPhase = computed(() => {
    const stepKey = this.currentStepKey();
    if (!stepKey) return 1;
    
    const stepInfo = this.metadataService.getStep(stepKey);
    return stepInfo?.phase.phaseId || 1;
  });
  
  currentPhaseData = computed(() => {
    return this.metadataService.getPhase(this.currentPhase());
  });
  
  constructor() {
    // Load audit progress when audit ID changes
    effect(() => {
      const id = this.auditId();
      if (id) {
        this.metadataService.loadAuditProgress(id).catch(console.error);
      }
    });
  }
  
  getStepStatus(stepKey: string): string {
    return this.metadataService.getStepProgress(stepKey)?.status || 'pending';
  }
  
  isStepAvailable(stepKey: string): boolean {
    return this.metadataService.isStepAvailable(stepKey);
  }
  
  getStepButtonClass(stepKey: string): string {
    const status = this.getStepStatus(stepKey);
    const isCurrent = stepKey === this.currentStepKey();
    
    if (isCurrent) {
      return 'bg-blue-100 border-2 border-blue-600 text-blue-900 font-semibold shadow-sm';
    }
    
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200';
      case 'in-progress':
        return 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200';
      case 'blocked':
        return 'bg-red-50 text-red-800 cursor-not-allowed opacity-50 border border-red-200';
      default:
        return 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300';
    }
  }
  
  getPhaseProgress(phase: PhaseMetadata): string {
    const total = phase.steps.length;
    const completed = phase.steps.filter(s => 
      this.getStepStatus(s.stepKey) === 'completed'
    ).length;
    return `${completed}/${total}`;
  }
  
  selectPhase(phaseId: number): void {
    const phase = this.metadataService.getPhase(phaseId);
    if (phase && phase.steps.length > 0) {
      const firstStep = phase.steps[0];
      this.navigateToStep(firstStep.stepKey);
    }
  }
  
  navigateToStep(stepKey: string): void {
    if (!this.isStepAvailable(stepKey)) return;
    
    const [phaseId, stepId] = stepKey.split('-').map(Number);
    this.router.navigate([
      '/audits',
      this.auditId(),
      'phases',
      phaseId,
      'steps',
      stepId
    ]);
  }
}
