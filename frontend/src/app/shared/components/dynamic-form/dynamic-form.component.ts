/**
 * Dynamic Form Component
 * Generic form builder that renders ANY step form based on metadata
 * This is the core component that eliminates the need for step-specific forms
 */

import { Component, input, output, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { FormSchema, BusinessRule } from '../../../features/audit/models/step-config.model';
import { FormBuilderUtil } from '../../utils/form-builder.util';
import { ExpressionEvaluator } from '../../utils/expression-evaluator.util';
import { FieldTextComponent } from './field-text.component';
import { FieldSelectComponent } from './field-select.component';
import { FieldMultiSelectComponent } from './field-multi-select.component';
import { FieldTextareaComponent } from './field-textarea.component';
import { FieldCheckboxComponent } from './field-checkbox.component';
import { FieldArrayComponent } from './field-array.component';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FieldTextComponent,
    FieldSelectComponent,
    FieldMultiSelectComponent,
    FieldTextareaComponent,
    FieldCheckboxComponent,
    FieldArrayComponent
  ],
  template: `
    <form [formGroup]="form()" (ngSubmit)="handleSubmit()" class="space-y-4">
      <!-- Dynamic Fields -->
      @for (field of formSchema().fields; track field.name) {
        @if (field.type === 'text' || field.type === 'email' || field.type === 'number') {
          <app-field-text
            [field]="field"
            [control]="getControl(field.name)"
          />
        } @else if (field.type === 'select') {
          <app-field-select
            [field]="field"
            [control]="getControl(field.name)"
          />
        } @else if (field.type === 'multi-select') {
          <app-field-multi-select
            [field]="field"
            [control]="getControl(field.name)"
          />
        } @else if (field.type === 'textarea') {
          <app-field-textarea
            [field]="field"
            [control]="getControl(field.name)"
          />
        } @else if (field.type === 'checkbox') {
          <app-field-checkbox
            [field]="field"
            [control]="getControl(field.name)"
          />
        } @else if (field.type === 'array') {
          <app-field-array
            [field]="field"
            [formArray]="getFormArray(field.name)"
          />
        }
      }

      <!-- Form-level errors -->
      @if (formErrors().length > 0) {
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
          <ul class="list-disc list-inside space-y-1">
            @for (error of formErrors(); track error) {
              <p class="text-sm text-red-700">{{ error }}</p>
            }
          </ul>
        </div>
      }

      <!-- Action Buttons -->
      @if (!hideButtons()) {
        <div class="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            [disabled]="submitting()"
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            @if (submitting()) {
              <span class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            } @else {
              Save & Continue
            }
          </button>
          
          <button
            type="button"
            (click)="handleCancel()"
            [disabled]="submitting()"
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      }
    </form>
  `
})
export class DynamicFormComponent implements OnInit {
  // Inputs
  formSchema = input.required<FormSchema>();
  initialData = input<any>(null);
  hideButtons = input<boolean>(false);

  // Outputs
  formSubmit = output<any>();
  formCancel = output<void>();

  // Signals
  form = signal<FormGroup>(new FormGroup({}));
  formErrors = signal<string[]>([]);
  submitting = signal(false);

  private fb = inject(FormBuilder);

  constructor() {
    // Watch for form schema OR initial data changes and rebuild form
    effect(() => {
      const schema = this.formSchema();
      const data = this.initialData();
      
      if (schema) {
        this.buildForm();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.buildForm();
  }

  /**
   * Build form dynamically from metadata
   */
  private buildForm(): void {
    // Populate dynamic options from data before building form
    this.populateDynamicOptions();

    const formGroup = FormBuilderUtil.buildFormGroup(
      this.fb,
      this.formSchema().fields,
      this.initialData()
    );

    this.form.set(formGroup);
    this.applyBusinessRuleValidators();
  }

  /**
   * Populate select field options from fetched data
   */
  private populateDynamicOptions(): void {
    const data = this.initialData();
    if (!data) {
      console.log('[DynamicForm] No initial data for options population');
      return;
    }

    const fields = this.formSchema().fields;
    
    for (const field of fields) {
      if ((field.type === 'select' || field.type === 'multi-select') && field.optionsSource && !field.options) {
        const { dataPath, labelField, valueField } = field.optionsSource;
        const sourceData = data[dataPath];
        
        console.log(`[DynamicForm] Populating options for ${field.name} from ${dataPath}:`, sourceData);
        
        if (Array.isArray(sourceData)) {
          field.options = sourceData.map((item: any) => ({
            label: item[labelField] || '',
            value: item[valueField]
          }));
          
          console.log(`[DynamicForm] Populated ${field.options.length} options for ${field.name}:`, field.options);
        } else {
          console.warn(`[DynamicForm] Source data for ${field.name} is not an array:`, sourceData);
        }
      }
    }
  }

  /**
   * Apply business rule validators (conditional validation)
   */
  private applyBusinessRuleValidators(): void {
    const businessRules = this.formSchema().businessRules || [];

    for (const rule of businessRules) {
      if (rule.type === 'conditional' && rule.condition && rule.then) {
        const targetControl = this.form().get(rule.then.field);
        if (!targetControl) continue;

        const validators = FormBuilderUtil.buildValidators(rule.then.validation);

        // Apply conditional validation
        ExpressionEvaluator.applyConditionalValidation(
          this.form(),
          rule.condition,
          rule.then.field,
          validators
        );
      }
    }
  }

  /**
   * Get form control by name
   */
  getControl(fieldName: string): FormControl {
    return this.form().get(fieldName) as FormControl;
  }

  /**
   * Get form array by name
   */
  getFormArray(fieldName: string): FormArray {
    return this.form().get(fieldName) as FormArray;
  }

  /**
   * Handle form submission
   */
  handleSubmit(): void {
    // Clear previous errors
    this.formErrors.set([]);

    // Validate form
    if (this.form().invalid) {
      this.form().markAllAsTouched();
      this.collectFormErrors();
      return;
    }

    // Emit form value
    this.submitting.set(true);
    this.formSubmit.emit(this.form().value);
  }

  /**
   * Handle form cancellation
   */
  handleCancel(): void {
    this.formCancel.emit();
  }

  /**
   * Collect all form errors for display
   */
  private collectFormErrors(): void {
    const errors: string[] = [];

    Object.keys(this.form().controls).forEach(key => {
      const control = this.form().get(key);
      if (control?.invalid && control.touched) {
        errors.push(`${key}: Please fix validation errors`);
      }
    });

    this.formErrors.set(errors);
  }

  /**
   * Reset submitting state (call from parent after save completes)
   */
  resetSubmitting(): void {
    this.submitting.set(false);
  }

  /**
   * Get current form value
   */
  getFormValue(): any {
    return this.form().value;
  }

  /**
   * Validate and get form value
   */
  validateAndGetValue(): { valid: boolean; value: any } {
    if (this.form().invalid) {
      this.form().markAllAsTouched();
      this.collectFormErrors();
      return { valid: false, value: null };
    }
    return { valid: true, value: this.form().value };
  }
}
