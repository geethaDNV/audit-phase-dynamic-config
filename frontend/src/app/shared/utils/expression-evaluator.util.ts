/**
 * Expression Evaluator Utility
 * Safely evaluates conditional expressions from metadata
 */

export class ExpressionEvaluator {
  /**
   * Evaluate a condition string with form values
   * Example: "reviewStatus === 'rejected'" with { reviewStatus: 'rejected' }
   */
  static evaluate(condition: string, formValue: any): boolean {
    if (!condition) return false;

    try {
      // Create a safe context with form values
      const context = { ...formValue };
      
      // Replace field references with their values
      let expression = condition;
      for (const key of Object.keys(context)) {
        const value = context[key];
        const valueStr = typeof value === 'string' ? `'${value}'` : value;
        expression = expression.replace(new RegExp(`\\b${key}\\b`, 'g'), String(valueStr));
      }

      // Evaluate the expression safely
      // eslint-disable-next-line no-new-func
      return new Function(`return ${expression}`)();
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error);
      return false;
    }
  }

  /**
   * Watch form changes and apply conditional validation
   */
  static applyConditionalValidation(
    formGroup: any,
    condition: string,
    targetField: string,
    validators: any[]
  ): void {
    formGroup.valueChanges.subscribe((value: any) => {
      const control = formGroup.get(targetField);
      if (!control) return;

      if (this.evaluate(condition, value)) {
        control.setValidators(validators);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }
}
