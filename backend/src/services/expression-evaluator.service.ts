import jexl from 'jexl';

/**
 * Safe expression evaluator using Jexl
 * Replaces dangerous `new Function()` pattern
 * 
 * Jexl supports:
 * - Comparisons: ===, !==, <, >, <=, >=
 * - Logical: &&, ||, !
 * - Arithmetic: +, -, *, /, %
 * - Array access: arr[0], obj.prop
 * - Ternary: condition ? true : false
 * - Functions: Math functions, string methods
 */
export class ExpressionEvaluatorService {
  private engine: jexl.Jexl;
  
  constructor() {
    this.engine = new jexl.Jexl();
    this.registerCustomTransforms();
  }
  
  /**
   * Evaluate a condition expression safely
   * Returns boolean result or false on error
   */
  evaluate(expression: string, context: Record<string, any>): boolean {
    try {
      const result = this.engine.evalSync(expression, context);
      return Boolean(result);
    } catch (error) {
      console.error(`Expression evaluation failed: ${expression}`, error);
      return false;
    }
  }
  
  /**
   * Evaluate and return any value (not just boolean)
   * Used for computed fields
   */
  evaluateValue<T = any>(expression: string, context: Record<string, any>): T | null {
    try {
      return this.engine.evalSync(expression, context) as T;
    } catch (error) {
      console.error(`Expression evaluation failed: ${expression}`, error);
      return null;
    }
  }
  
  /**
   * Validate expression syntax without executing
   */
  validateSyntax(expression: string): { valid: boolean; error?: string } {
    try {
      this.engine.compile(expression);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Register custom transforms (functions usable in expressions)
   */
  private registerCustomTransforms(): void {
    // String helpers
    this.engine.addTransform('lower', (val: string) => val?.toLowerCase());
    this.engine.addTransform('upper', (val: string) => val?.toUpperCase());
    this.engine.addTransform('trim', (val: string) => val?.trim());
    this.engine.addTransform('length', (val: any) => val?.length || 0);
    
    // Number helpers
    this.engine.addTransform('abs', (val: number) => Math.abs(val));
    this.engine.addTransform('round', (val: number) => Math.round(val));
    this.engine.addTransform('floor', (val: number) => Math.floor(val));
    this.engine.addTransform('ceil', (val: number) => Math.ceil(val));
    
    // Array helpers
    this.engine.addTransform('contains', (arr: any[], val: any) =>
      Array.isArray(arr) ? arr.includes(val) : false
    );
    this.engine.addTransform('isEmpty', (val: any) =>
      val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
    );
    
    // Date helpers
    this.engine.addTransform('now', () => new Date().toISOString());
    this.engine.addTransform('today', () => new Date().toISOString().split('T')[0]);
  }
}
