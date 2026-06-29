# Checkpoint 5: Safe Expression Evaluator - Testing Guide

## What Was Implemented

✅ **Installed Dependencies:**
- `jexl` - Safe expression evaluator library
- `chokidar` - File watcher for hot-reload (Phase 3)
- Type definitions for both libraries

✅ **Created ExpressionEvaluatorService:**
- `backend/src/services/expression-evaluator.service.ts`
- Safe alternative to `new Function()` for evaluating conditions
- Supports comparisons, logical operators, custom transforms
- Built-in protection against code injection

✅ **Updated ValidationService:**
- Now uses `ExpressionEvaluatorService` instead of unsafe `new Function()`
- `evaluateCondition()` method safely evaluates conditional business rules
- Supports both direct field access and cross-step references

---

## Test Scenarios

### Test 1: Simple Conditional Validation

Test that conditional business rules work with the safe evaluator.

**Prerequisites:**
- Have an audit with Step 1-1 (Client) completed
- Have Step 2-3 configured with conditional validation

**Example Step Config with Conditional Rule:**

```typescript
// In a step configuration
businessRules: [
  {
    type: 'conditional',
    condition: "riskLevel === 'High'",
    then: {
      field: 'approvalRequired',
      validation: {
        required: true
      }
    },
    message: 'Approval is required for high-risk audits'
  }
]
```

**Test Command:**

```bash
# Test with high risk (should trigger conditional validation)
curl -X POST http://localhost:3000/api/audits/1/phases/2/steps/3 \
  -H "Content-Type: application/json" \
  -d '{
    "riskLevel": "High",
    "description": "High risk assessment"
  }'

# Expected: Validation error requiring approvalRequired field
# Response should contain: "Approval is required for high-risk audits"
```

---

### Test 2: Expression with Logical Operators

Test complex expressions with AND/OR logic.

**Test Expression:**
```
riskLevel === 'High' || riskLevel === 'Critical'
```

**Test Command:**

```bash
curl -X POST http://localhost:3000/api/audits/1/phases/2/steps/3 \
  -H "Content-Type: application/json" \
  -d '{
    "riskLevel": "Critical",
    "description": "Critical risk"
  }'

# Should trigger conditional validation
```

---

### Test 3: Custom Transform Functions

Test Jexl transforms (lower, upper, contains, length).

**Example Config:**
```typescript
skipConditions: [{
  condition: "clientName|lower|contains('test')",
  message: 'Skip validation for test clients'
}]
```

**Test:**
- Create client with name "Test Corporation"
- Verify skip condition evaluates correctly

---

### Test 4: Safety - Code Injection Prevention

Test that malicious code cannot be executed.

**Test Commands:**

```bash
# Try to inject code - should fail safely
curl -X POST http://localhost:3000/api/audits/1/phases/2/steps/3 \
  -H "Content-Type: application/json" \
  -d '{
    "riskLevel": "process.exit()"
  }'

# Expected: Expression evaluates to false, no code execution
# Server should NOT crash

# Try another injection attempt
curl -X POST http://localhost:3000/api/audits/1/phases/2/steps/3 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "'; console.log('hacked'); '"
  }'

# Expected: Treated as string value, no code execution
```

---

### Test 5: Verify Expression Syntax Validation

You can test expression syntax validation programmatically:

```typescript
// In Node.js REPL or test file
import { ExpressionEvaluatorService } from './src/services/expression-evaluator.service';

const evaluator = new ExpressionEvaluatorService();

// Valid syntax
console.log(evaluator.validateSyntax("status === 'active'"));
// Expected: { valid: true }

// Invalid syntax
console.log(evaluator.validateSyntax("invalid syntax ==="));
// Expected: { valid: false, error: "..." }
```

---

## Success Criteria

✅ **All tests must pass:**

1. ✅ Conditional validation works with `===`, `!==`, `>`, `<`, `>=`, `<=`
2. ✅ Logical operators work: `&&`, `||`, `!`
3. ✅ Custom transforms work: `|lower`, `|upper`, `|contains`, `|length`
4. ✅ Code injection attempts are blocked (no code execution)
5. ✅ Invalid expressions fail safely without crashing server
6. ✅ No use of `new Function()` in codebase

---

## Verification Commands

### Check for unsafe patterns (should return nothing)

```bash
# Search for new Function() - should NOT appear in validation service
grep -r "new Function" backend/src/services/validation.service.ts

# Expected: No results (pattern removed)
```

### Check that ExpressionEvaluatorService is imported

```bash
grep "ExpressionEvaluatorService" backend/src/services/validation.service.ts

# Expected: Should show import and usage
```

---

## Performance Check

Expression evaluation should be fast:

```bash
# Time a request with conditional validation
time curl -X POST http://localhost:3000/api/audits/1/phases/2/steps/3 \
  -H "Content-Type: application/json" \
  -d '{"riskLevel": "High", "description": "Test"}'

# Expected: Total time < 200ms for expression evaluation
```

---

## Next Steps (After Validation)

Once all tests pass:

1. ✅ Checkpoint 5 complete - Safe expression evaluator working
2. 🔄 Proceed to **Checkpoint 6**: Enhance frontend MetadataService
3. 🔄 Proceed to **Checkpoint 7**: Update PhaseNavigatorComponent for dynamic loading

---

## Troubleshooting

### If expressions don't evaluate:

1. Check server logs for error messages
2. Verify jexl is installed: `npm list jexl`
3. Check TypeScript compilation: `npm run build`

### If conditional validation doesn't trigger:

1. Verify step config has correct `businessRules` array
2. Check condition syntax matches Jexl format
3. Add console.log in `evaluateCondition()` to debug

### If server crashes on expression evaluation:

1. This should NOT happen with Jexl
2. If it does, check for missing error handling
3. Verify ExpressionEvaluatorService is properly instantiated

---

## Additional Resources

**Jexl Documentation:**
- GitHub: https://github.com/TomFrost/Jexl
- Supports: comparisons, logic, math, strings, arrays, ternary
- Safe: No arbitrary code execution, sandbox environment

**Custom Transforms Available:**
- String: `lower`, `upper`, `trim`, `length`
- Number: `abs`, `round`, `floor`, `ceil`
- Array: `contains`, `isEmpty`
- Date: `now`, `today`
