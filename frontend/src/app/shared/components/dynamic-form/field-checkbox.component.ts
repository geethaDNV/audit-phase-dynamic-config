/**
 * Checkbox Field Component
 * Handles boolean inputs
 */

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { FieldDefinition } from '../../../features/audit/models/step-config.model';

@Component({
  selector: 'app-field-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="mb-4">
      <div class="flex items-start">
        <input
          [id]="field().name"
          type="checkbox"
          [formControl]="control()"
          class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label [for]="field().name" class="ml-2 block text-sm text-gray-700">
          {{ field().label }}
          @if (field().validation?.required) {
            <span class="text-red-500">*</span>
          }
        </label>
      </div>
      
      @if (field().helpText) {
        <p class="ml-6 mt-1 text-sm text-gray-500">
          {{ field().helpText }}
        </p>
      }
    </div>
  `
})
export class FieldCheckboxComponent {
  field = input.required<FieldDefinition>();
  control = input.required<FormControl>();
}
