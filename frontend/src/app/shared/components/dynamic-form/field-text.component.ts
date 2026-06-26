/**
 * Text Field Component
 * Handles text, email, and number inputs
 */

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { FieldDefinition } from '../../../features/audit/models/step-config.model';

@Component({
  selector: 'app-field-text',
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
      
      <input
        [id]="field().name"
        [type]="field().type"
        [formControl]="control()"
        [placeholder]="field().placeholder || ''"
        [attr.aria-describedby]="field().helpText ? field().name + '-help' : null"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        [class.border-red-500]="control().invalid && control().touched"
      />
      
      @if (field().helpText) {
        <p [id]="field().name + '-help'" class="mt-1 text-sm text-gray-500">
          {{ field().helpText }}
        </p>
      }
      
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
export class FieldTextComponent {
  field = input.required<FieldDefinition>();
  control = input.required<FormControl>();

  getErrors(): string[] {
    const errors: string[] = [];
    const ctrl = this.control();
    
    if (!ctrl.errors) return errors;

    // Server-side errors take precedence
    if (ctrl.errors['serverError']) {
      errors.push(ctrl.errors['serverError']);
    }

    if (ctrl.errors['required']) errors.push('This field is required');
    if (ctrl.errors['email']) errors.push('Invalid email format');
    if (ctrl.errors['minlength']) {
      errors.push(`Minimum length is ${ctrl.errors['minlength'].requiredLength} characters`);
    }
    if (ctrl.errors['maxlength']) {
      errors.push(`Maximum length is ${ctrl.errors['maxlength'].requiredLength} characters`);
    }
    if (ctrl.errors['min']) {
      errors.push(`Minimum value is ${ctrl.errors['min'].min}`);
    }
    if (ctrl.errors['max']) {
      errors.push(`Maximum value is ${ctrl.errors['max'].max}`);
    }
    if (ctrl.errors['pattern']) {
      const message = this.field().validation?.patternMessage || 'Invalid format';
      errors.push(message);
    }

    return errors;
  }
}
