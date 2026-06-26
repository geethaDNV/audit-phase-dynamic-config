/**
 * Multi-Select Field Component
 * Handles multi-select dropdown selections
 */

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { FieldDefinition } from '../../../features/audit/models/step-config.model';

@Component({
  selector: 'app-field-multi-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="mb-4">
      <label [for]="field().name" class="block text-sm font-medium text-gray-700 mb-1">
        {{ field().label }}
        @if (field().validation?.required) {
          <span class="text-red-500">*</span>
        }
      </label>
      
      <select
        [id]="field().name"
        [formControl]="control()"
        multiple
        [size]="Math.max(3, Math.min(8, getOptions().length))"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        [class.border-red-500]="control().invalid && control().touched"
      >
        @for (option of getOptions(); track option.value) {
          <option [ngValue]="option.value">{{ option.label }}</option>
        }
      </select>
      
      @if (field().helpText) {
        <p class="mt-1 text-sm text-gray-500">
          {{ field().helpText }}
        </p>
      }
      
      <p class="mt-1 text-xs text-gray-400">
        Hold Ctrl (Cmd on Mac) to select multiple items
      </p>
      
      @if (control().invalid && control().touched) {
        <div class="mt-1">
          @for (error of getErrors(); track error) {
            <p class="text-sm text-red-600">{{ error }}</p>
          }
        </div>
      }
    </div>
  `
})
export class FieldMultiSelectComponent {
  field = input.required<FieldDefinition>();
  control = input.required<FormControl>();
  
  Math = Math;

  getOptions(): { label: string; value: any }[] {
    const options = this.field().options || [];
    
    // If options are strings, convert to objects
    if (options.length > 0 && typeof options[0] === 'string') {
      return (options as string[]).map(opt => ({ label: opt, value: opt }));
    }
    
    return options as { label: string; value: any }[];
  }

  getErrors(): string[] {
    const errors: string[] = [];
    const ctrl = this.control();
    
    if (!ctrl.errors) return errors;
    
    if (ctrl.errors['required']) errors.push('Please select at least one option');
    if (ctrl.errors['minItems']) {
      errors.push(`Please select at least ${ctrl.errors['minItems'].required} items`);
    }

    return errors;
  }
}
