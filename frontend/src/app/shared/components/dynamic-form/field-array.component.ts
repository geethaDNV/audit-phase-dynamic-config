/**
 * Array Field Component
 * Handles repeatable array items with add/remove functionality
 */

import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder } from '@angular/forms';
import { FieldDefinition } from '../../../features/audit/models/step-config.model';
import { FormBuilderUtil } from '../../utils/form-builder.util';
import { FieldTextComponent } from './field-text.component';
import { FieldSelectComponent } from './field-select.component';
import { FieldTextareaComponent } from './field-textarea.component';
import { FieldCheckboxComponent } from './field-checkbox.component';

@Component({
  selector: 'app-field-array',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FieldTextComponent,
    FieldSelectComponent,
    FieldTextareaComponent,
    FieldCheckboxComponent
  ],
  template: `
    <div class="mb-6">
      <div class="flex justify-between items-center mb-2">
        <label class="block text-sm font-medium text-gray-700">
          {{ field().label }}
          @if (field().validation?.required) {
            <span class="text-red-500">*</span>
          }
        </label>
        <button
          type="button"
          (click)="addItem()"
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Item
        </button>
      </div>

      @if (field().helpText) {
        <p class="mb-2 text-sm text-gray-500">
          {{ field().helpText }}
        </p>
      }

      <div class="space-y-3">
        @for (item of formArray().controls; track $index) {
          <div class="border border-gray-200 rounded-md p-4 bg-gray-50">
            <div class="flex justify-between items-start mb-2">
              <span class="text-sm font-medium text-gray-600">Item {{ $index + 1 }}</span>
              <button
                type="button"
                (click)="removeItem($index)"
                class="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>

            @if (field().arrayItemType === 'object' && (field().arraySchema || field().arrayItemSchema)) {
              <!-- Object array items -->
              @for (subField of getArrayItemFields(); track subField.name) {
                @if (subField.type === 'text' || subField.type === 'email' || subField.type === 'number') {
                  <app-field-text
                    [field]="subField"
                    [control]="getControl(item, subField.name)"
                  />
                } @else if (subField.type === 'select') {
                  <app-field-select
                    [field]="subField"
                    [control]="getControl(item, subField.name)"
                  />
                } @else if (subField.type === 'textarea') {
                  <app-field-textarea
                    [field]="subField"
                    [control]="getControl(item, subField.name)"
                  />
                } @else if (subField.type === 'checkbox') {
                  <app-field-checkbox
                    [field]="subField"
                    [control]="getControl(item, subField.name)"
                  />
                }
              }
            } @else {
              <!-- Simple text array items -->
              <input
                type="text"
                [formControl]="getSimpleControl(item)"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter value"
              />
            }
          </div>
        } @empty {
          <p class="text-sm text-gray-500 italic py-2">No items added yet</p>
        }
      </div>

      @if (formArray().invalid && formArray().touched) {
        <div class="mt-2">
          @for (error of getErrors(); track error) {
            <p class="text-sm text-red-600">{{ error }}</p>
          }
        </div>
      }

      @if (field().validation?.minItems || field().validation?.maxItems) {
        <p class="mt-2 text-sm text-gray-500">
          Items: {{ formArray().length }}
          @if (field().validation?.minItems) {
            (min: {{ field().validation?.minItems }})
          }
          @if (field().validation?.maxItems) {
            (max: {{ field().validation?.maxItems }})
          }
        </p>
      }
    </div>
  `
})
export class FieldArrayComponent {
  field = input.required<FieldDefinition>();
  formArray = input.required<FormArray>();

  private fb = inject(FormBuilder);

  addItem(): void {
    const maxItems = this.field().validation?.maxItems;
    if (maxItems && this.formArray().length >= maxItems) {
      return;
    }

    const newItem = FormBuilderUtil.createArrayItem(this.fb, this.field());
    this.formArray().push(newItem);
  }

  removeItem(index: number): void {
    this.formArray().removeAt(index);
    this.formArray().markAsTouched();
  }

  getControl(item: any, fieldName: string): any {
    return item.get(fieldName);
  }

  getSimpleControl(item: any): any {
    return item;
  }

  getArrayItemFields(): FieldDefinition[] {
    // Support both arraySchema (flat array) and arrayItemSchema.fields (nested)
    const field = this.field();
    if (field.arrayItemSchema && 'fields' in field.arrayItemSchema) {
      return field.arrayItemSchema.fields;
    }
    return field.arraySchema || [];
  }

  getErrors(): string[] {
    const errors: string[] = [];
    const arr = this.formArray();
    
    if (!arr.errors) return errors;

    // Server-side errors take precedence
    if (arr.errors['serverError']) {
      errors.push(arr.errors['serverError']);
    }

    if (arr.errors['minItems']) {
      errors.push(`Minimum ${arr.errors['minItems'].required} items required`);
    }
    if (arr.errors['maxItems']) {
      errors.push(`Maximum ${arr.errors['maxItems'].required} items allowed`);
    }

    return errors;
  }
}
