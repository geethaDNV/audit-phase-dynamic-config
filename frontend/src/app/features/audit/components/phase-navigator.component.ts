/**
 * Phase Navigator Component
 * Phase tabs and step navigation for audit wizard
 */

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Phase {
  id: number;
  name: string;
  stepCount: number;
}

@Component({
  selector: 'app-phase-navigator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border-b">
      <div class="container mx-auto px-4">
        <!-- Phase Tabs -->
        <div class="flex gap-4 overflow-x-auto">
          @for (phase of phases(); track phase.id) {
            <button
              (click)="selectPhase.emit(phase.id)"
              class="px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2"
              [class.border-blue-600]="phase.id === currentPhase()"
              [class.text-blue-600]="phase.id === currentPhase()"
              [class.border-transparent]="phase.id !== currentPhase()"
              [class.text-gray-600]="phase.id !== currentPhase()"
              [class.hover:text-gray-900]="phase.id !== currentPhase()"
            >
              {{ phase.name }}
              <span class="ml-2 text-xs text-gray-500">
                ({{ phase.stepCount }} steps)
              </span>
            </button>
          }
        </div>
      </div>
    </div>

    <!-- Step Navigation -->
    <div class="bg-gray-50 border-b py-3">
      <div class="container mx-auto px-4">
        <div class="flex items-center gap-2 overflow-x-auto">
          <span class="text-sm text-gray-600 whitespace-nowrap">Steps:</span>
          @for (step of getStepsForCurrentPhase(); track step) {
            <button
              (click)="selectStep.emit(step)"
              class="px-3 py-1 text-sm rounded-md transition-colors"
              [class.bg-blue-600]="step === currentStep()"
              [class.text-white]="step === currentStep()"
              [class.bg-white]="step !== currentStep()"
              [class.text-gray-700]="step !== currentStep()"
              [class.hover:bg-gray-200]="step !== currentStep()"
            >
              {{ step }}
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class PhaseNavigatorComponent {
  phases = input.required<Phase[]>();
  currentPhase = input.required<number>();
  currentStep = input.required<number>();

  selectPhase = output<number>();
  selectStep = output<number>();

  getStepsForCurrentPhase(): number[] {
    const phase = this.phases().find(p => p.id === this.currentPhase());
    if (!phase) return [];
    
    return Array.from({ length: phase.stepCount }, (_, i) => i + 1);
  }
}
