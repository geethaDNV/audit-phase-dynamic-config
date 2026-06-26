/**
 * Form Builder Utility
 * Dynamically creates FormGroup and validators from metadata
 */

import { FormBuilder, FormGroup, FormArray, FormControl, Validators, ValidatorFn } from '@angular/forms';
import { FieldDefinition, FieldValidation } from '../../features/audit/models/step-config.model';

export class FormBuilderUtil {
  static buildFormGroup(fb: FormBuilder, fields: FieldDefinition[], initialData?: any): FormGroup {
    const group: any = {};

    for (const field of fields) {
      const validators = this.buildValidators(field.validation || {});
      const initialValue = this.getInitialValue(field, initialData);

      if (field.type === 'array') {
        group[field.name] = fb.array(
          this.buildArrayControls(fb, field, initialValue),
          this.buildArrayValidators(field.validation || {})
        );
      } else {
        group[field.name] = [initialValue, validators];
      }
    }

    return fb.group(group);
  }

  private static getInitialValue(field: FieldDefinition, data?: any): any {
    if (!data) {
      return field.type === 'array' || field.type === 'multi-select' ? [] : 
             field.type === 'checkbox' ? false : 
             field.type === 'number' ? null :
             '';
    }

    return this.extractFieldValue(data, field.name, field.type);
  }

  private static extractFieldValue(data: any, fieldName: string, fieldType: string): any {
    // Direct property match
    if (data.hasOwnProperty(fieldName)) {
      const value = data[fieldName];
      
      // Ensure multi-select and array types return arrays
      if ((fieldType === 'multi-select' || fieldType === 'array') && !Array.isArray(value)) {
        return value ? [value] : [];
      }
      
      return value;
    }

    // Search nested objects
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
        const nested = this.extractFieldValue(data[key], fieldName, fieldType);
        if (nested !== undefined && nested !== null && (Array.isArray(nested) || nested !== '')) {
          return nested;
        }
      }
    }

    // Default values
    return fieldType === 'array' || fieldType === 'multi-select' ? [] : 
           fieldType === 'checkbox' ? false : 
           fieldType === 'number' ? null :
           '';
  }

  private static buildArrayControls(fb: FormBuilder, field: FieldDefinition, initialValue: any[]): any[] {
    if (!Array.isArray(initialValue) || initialValue.length === 0) {
      return [];
    }

    if (field.arrayItemType === 'object' && field.arraySchema) {
      return initialValue.map(item => this.buildFormGroup(fb, field.arraySchema!, item));
    } else {
      return initialValue.map(item => fb.control(item));
    }
  }

  static buildValidators(validation: FieldValidation): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (validation.required) validators.push(Validators.required);
    if (validation.email) validators.push(Validators.email);
    if (validation.minLength) validators.push(Validators.minLength(validation.minLength));
    if (validation.maxLength) validators.push(Validators.maxLength(validation.maxLength));
    if (validation.min !== undefined) validators.push(Validators.min(validation.min));
    if (validation.max !== undefined) validators.push(Validators.max(validation.max));
    if (validation.pattern) validators.push(Validators.pattern(validation.pattern));

    return validators;
  }

  private static buildArrayValidators(validation: FieldValidation): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (validation.minItems) {
      validators.push((control: any) => {
        return control.value && control.value.length < validation.minItems! 
          ? { minItems: { required: validation.minItems, actual: control.value.length } }
          : null;
      });
    }

    if (validation.maxItems) {
      validators.push((control: any) => {
        return control.value && control.value.length > validation.maxItems!
          ? { maxItems: { required: validation.maxItems, actual: control.value.length } }
          : null;
      });
    }

    return validators;
  }

  static createArrayItem(fb: FormBuilder, field: FieldDefinition): FormControl | FormGroup {
    if (field.arrayItemType === 'object' && field.arraySchema) {
      return this.buildFormGroup(fb, field.arraySchema);
    } else {
      return fb.control('');
    }
  }
}
