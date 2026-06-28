import { PrismaClient } from '@prisma/client';
import {
  FormSchema,
  FieldDefinition,
  BusinessRule,
  StepContext,
  StepDependencies,
  ValidationContext
} from '../config/types/step-config.types';
import { ValidatorRegistry } from '../validators/validator-registry';
import { ValidationContextService } from './validation-context.service';

/**
 * Validation Service
 * 
 * Multi-layer validation engine that enforces:
 * 1. Field-level validation (required, length, pattern, type)
 * 2. Conditional validation (if field X = Y, then field Z is required)
 * 3. Cross-step validation (data must reference previous step data)
 * 4. Business rules (custom validators)
 * 
 * This is the missing critical piece that ensures data integrity
 * before it reaches the database layer.
 * 
 * PERFORMANCE: Uses batched dependency loading to eliminate N+1 queries
 */
export class ValidationService {
  private validatorRegistry: ValidatorRegistry;
  private contextService: ValidationContextService;

  constructor(prisma: PrismaClient) {
    this.validatorRegistry = new ValidatorRegistry();
    this.contextService = new ValidationContextService(prisma);
  }

  /**
   * Main validation entry point - NOW WITH BATCHED DEPENDENCY LOADING
   * 
   * Validates payload against form schema and business rules
   * 
   * @param payload - Data to validate
   * @param formSchema - Form schema with field definitions
   * @param context - Step context (auditId, phaseId, stepId)
   * @param dependencies - Step dependencies for batched loading
   * @throws Error with validation messages if validation fails
   */
  async validate(
    payload: any,
    formSchema: FormSchema,
    context: StepContext,
    dependencies?: StepDependencies
  ): Promise<void> {
    // 1. Build validation context with ALL dependency data (single batch query)
    const validationContext = await this.contextService.buildValidationContext(
      context,
      dependencies
    );
    
    const fieldErrors: Record<string, string[]> = {};
    const generalErrors: string[] = [];

    // 2. Field-level validation (unchanged)
    for (const field of formSchema.fields) {
      const errors = this.validateField(field, payload[field.name]);
      if (errors.length > 0) {
        fieldErrors[field.name] = errors;
      }
    }

    // 3. Business rules validation - NOW with pre-loaded context
    if (formSchema.businessRules && formSchema.businessRules.length > 0) {
      const ruleErrors = await this.validateBusinessRules(
        payload,
        formSchema.businessRules,
        validationContext  // ← Contains all dependency data!
      );
      generalErrors.push(...ruleErrors);
    }

    // 4. Check errors
    if (Object.keys(fieldErrors).length > 0 || generalErrors.length > 0) {
      if (Object.keys(fieldErrors).length > 0) {
        throw new ValidationError(fieldErrors);
      } else {
        throw new ValidationError(generalErrors);
      }
    }
  }

  /**
   * Validate a single field against its validation rules
   */
  private validateField(field: FieldDefinition, value: any): string[] {
    const errors: string[] = [];
    const validation = field.validation;

    if (!validation) {
      return errors;
    }

    // Required validation
    if (validation.required && this.isEmpty(value)) {
      errors.push(`${field.label} is required`);
      return errors; // Stop further validation if required field is empty
    }

    // Skip other validations if field is empty and not required
    if (this.isEmpty(value)) {
      return errors;
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        if (validation.email && !this.isValidEmail(value)) {
          errors.push(`${field.label} must be a valid email address`);
        }
        break;

      case 'number':
        // Accept both numbers and numeric strings, convert if needed
        let numValue: number;
        if (typeof value === 'string') {
          numValue = parseFloat(value);
        } else {
          numValue = value;
        }
        
        if (typeof numValue !== 'number' || isNaN(numValue)) {
          errors.push(`${field.label} must be a valid number`);
        } else {
          if (validation.min !== undefined && numValue < validation.min) {
            errors.push(`${field.label} must be at least ${validation.min}`);
          }
          if (validation.max !== undefined && numValue > validation.max) {
            errors.push(`${field.label} must be at most ${validation.max}`);
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value === 'string') {
          if (validation.minLength && value.length < validation.minLength) {
            errors.push(`${field.label} must be at least ${validation.minLength} characters`);
          }
          if (validation.maxLength && value.length > validation.maxLength) {
            errors.push(`${field.label} must be at most ${validation.maxLength} characters`);
          }
          if (validation.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
              const message = validation.patternMessage || `${field.label} format is invalid`;
              errors.push(message);
            }
          }
        }
        break;

      case 'select':
        if (validation.enum && !validation.enum.includes(value)) {
          errors.push(`${field.label} must be one of: ${validation.enum.join(', ')}`);
        }
        break;

      case 'array':
        if (Array.isArray(value)) {
          if (validation.minItems && value.length < validation.minItems) {
            errors.push(`${field.label} must have at least ${validation.minItems} items`);
          }
          if (validation.maxItems && value.length > validation.maxItems) {
            errors.push(`${field.label} must have at most ${validation.maxItems} items`);
          }

          // Validate array items if schema provided
          if (field.arrayItemSchema && field.arrayItemSchema.fields) {
            value.forEach((item, index) => {
              for (const itemField of field.arrayItemSchema!.fields) {
                const itemErrors = this.validateField(itemField, item[itemField.name]);
                itemErrors.forEach(err => {
                  errors.push(`${field.label} item ${index + 1}: ${err}`);
                });
              }
            });
          }
        }
        break;
    }

    // Custom validator
    if (validation.customValidator) {
      const customError = this.validatorRegistry.validateSync(
        validation.customValidator,
        value,
        field.name
      );
      if (customError) {
        errors.push(customError);
      }
    }

    return errors;
  }

  /**
   * Validate business rules
   * Updated to use ValidationContext instead of generic context
   */
  private async validateBusinessRules(
    payload: any,
    rules: BusinessRule[],
    context: ValidationContext  // ← Changed from any to ValidationContext
  ): Promise<string[]> {
    const errors: string[] = [];

    for (const rule of rules) {
      switch (rule.type) {
        case 'conditional':
          errors.push(...this.validateConditionalRule(rule, payload));
          break;

        case 'cross-step':
        case 'cross-field':
          if (rule.validatorClass) {
            const error = await this.validatorRegistry.validateAsync(
              rule.validatorClass,
              payload,
              context  // ← Now includes dependencyData!
            );
            if (error) {
              errors.push(error);
            }
          }
          break;
      }
    }

    return errors;
  }

  /**
   * Validate conditional rules (if X then Y)
   */
  private validateConditionalRule(rule: BusinessRule, payload: any): string[] {
    const errors: string[] = [];

    if (!rule.condition || !rule.then) {
      return errors;
    }

    // Evaluate condition
    const conditionMet = this.evaluateCondition(rule.condition, payload);

    if (conditionMet && rule.then.validation) {
      const field = rule.then.field;
      const value = payload[field];
      const validation = rule.then.validation;

      // Check required
      if (validation.required && this.isEmpty(value)) {
        const message = rule.message || `${field} is required when ${rule.condition}`;
        errors.push(message);
      }

      // Check minLength
      if (validation.minLength && typeof value === 'string' && value.length < validation.minLength) {
        errors.push(`${field} must be at least ${validation.minLength} characters`);
      }

      // Add other conditional validations as needed
    }

    return errors;
  }

  /**
   * Evaluate a condition string against payload
   * Example: "currentRiskLevel === 'High' || currentRiskLevel === 'Critical'"
   */
  private evaluateCondition(condition: string, payload: any): boolean {
    try {
      // Build context object
      const context: Record<string, any> = { ...payload };

      // Replace field names with context values in the condition string
      let expression = condition;
      for (const key of Object.keys(context)) {
        const value = context[key];
        const quotedValue = typeof value === 'string' ? `"${value}"` : value;
        expression = expression.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          String(quotedValue)
        );
      }

      // Evaluate the expression
      // eslint-disable-next-line no-new-func
      return new Function(`return ${expression}`)();
    } catch (error) {
      console.error('Error evaluating condition:', condition, error);
      return false;
    }
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Custom validation error class with support for field-specific errors
 */
export class ValidationError extends Error {
  public errors: string[];
  public fieldErrors: Record<string, string[]>;

  constructor(errors: string[] | Record<string, string[]>) {
    if (Array.isArray(errors)) {
      // Legacy format: array of strings
      super(`Validation failed: ${errors.join(', ')}`);
      this.errors = errors;
      this.fieldErrors = {};
    } else {
      // New format: field-specific errors
      const allErrors: string[] = [];
      Object.entries(errors).forEach(([field, fieldErrs]) => {
        allErrors.push(...fieldErrs.map(err => `${field}: ${err}`));
      });
      super(`Validation failed: ${allErrors.join(', ')}`);
      this.errors = allErrors;
      this.fieldErrors = errors;
    }
    this.name = 'ValidationError';
  }
}
