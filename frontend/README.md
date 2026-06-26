# Audit Management System - Frontend

Angular 21 standalone application with metadata-driven dynamic forms for the audit management system.

## Architecture Overview

This frontend implements a **metadata-driven** architecture that eliminates step-specific components. Key features:

- **Single Dynamic Form Component**: One component handles ALL steps
- **Metadata-Driven Rendering**: Form schemas fetched from backend drive UI generation
- **Angular 21 Standalone Components**: No NgModules required
- **Signals API**: Reactive state management
- **TailwindCSS**: Utility-first styling
- **Zero Step-Specific DTOs**: Generic form value handling

## Tech Stack

- **Framework**: Angular 21
- **Architecture**: Standalone Components
- **State Management**: Signals API
- **Forms**: Reactive Forms with dynamic form building
- **Styling**: TailwindCSS 3.4
- **HTTP Client**: Angular HttpClient with interceptors

## Project Structure

```
src/
├── app/
│   ├── features/audit/
│   │   ├── components/
│   │   │   ├── audit-list.component.ts       # Audit CRUD list
│   │   │   ├── audit-wizard.component.ts     # Main wizard container
│   │   │   ├── phase-navigator.component.ts  # Phase/step navigation
│   │   │   └── step-form.component.ts        # Generic step container (ALL steps!)
│   │   ├── services/
│   │   │   ├── metadata.service.ts           # Form schema cache
│   │   │   ├── audit.service.ts              # Audit CRUD
│   │   │   └── step-data.service.ts          # Step data with adapters
│   │   └── models/
│   │       ├── audit.model.ts
│   │       └── step-config.model.ts          # Matches backend types
│   ├── shared/
│   │   ├── components/dynamic-form/
│   │   │   ├── dynamic-form.component.ts     # Builds ANY form
│   │   │   ├── field-text.component.ts
│   │   │   ├── field-select.component.ts
│   │   │   ├── field-textarea.component.ts
│   │   │   ├── field-checkbox.component.ts
│   │   │   └── field-array.component.ts
│   │   └── utils/
│   │       ├── form-builder.util.ts
│   │       └── expression-evaluator.util.ts
│   ├── core/interceptors/
│   │   └── http-error.interceptor.ts
│   ├── app.component.ts
│   └── app.routes.ts
├── environments/
│   ├── environment.ts               # Dev: http://localhost:3000/api
│   └── environment.prod.ts          # Prod: /api
└── main.ts
```

## Getting Started

### Prerequisites

- Node.js 22 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (connects to backend at localhost:3000)
npm start

# Application will open at http://localhost:4200
```

### Building

```bash
# Build for production
npm run build

# Output will be in dist/
```

### Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run watch` - Build in watch mode

## Key Components

### 1. Dynamic Form Component
**The heart of the metadata-driven system**

Receives `FormSchema` from backend → Builds `FormGroup` → Renders fields dynamically

**Zero hardcoded step logic!**

### 2. Step Form Component
**Generic step container**

Fetches metadata + data → Passes to `DynamicFormComponent` → Handles save

**One component handles all steps!**

### 3. Services

- **MetadataService**: Caches form schemas from `/api/metadata/phases/:phaseId/steps/:stepId`
- **StepDataService**: Fetch/save step data with pattern-specific adapters
- **AuditService**: Audit CRUD with signals for reactive state

## Routes

```
/audits                                          → Audit List
/audits/:auditId/wizard                          → Audit Wizard
/audits/:auditId/phases/:phaseId/steps/:stepId   → Step Form (dynamic!)
```

## Environment Configuration

**Development** (`environment.ts`):
```typescript
apiUrl: 'http://localhost:3000/api'
```

**Production** (`environment.prod.ts`):
```typescript
apiUrl: '/api'  // Relative URL
```

## Adding New Steps

To add Step 7:

1. **Backend**: Create `phase2/step7.config.ts`
2. **Frontend**: **ZERO CHANGES REQUIRED!**

Metadata-driven architecture automatically handles new steps.

## POC Success Criteria

✅ Single endpoint handles all steps  
✅ Zero hardcoded step logic  
✅ All 6 patterns work (simple, compose, custom, array, conditional, complex)  
✅ Generic UI renders all forms  
✅ No unique DTOs needed  
✅ Array fields with add/remove  
✅ Conditional validation  

## License

MIT
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── features/
│   │   │   └── audit/
│   │   │       ├── components/      # Feature components
│   │   │       ├── services/        # HTTP services
│   │   │       ├── models/          # TypeScript interfaces
│   │   │       └── validators/      # Custom validators
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   └── dynamic-form/    # Generic form components
│   │   │   └── utils/               # Utility functions
│   │   ├── core/
│   │   │   ├── interceptors/        # HTTP interceptors
│   │   │   └── services/            # Core services
│   │   ├── app.component.ts         # Root component
│   │   └── app.routes.ts            # Route configuration
│   ├── environments/                # Environment configs
│   ├── styles.css                   # Global styles
│   └── main.ts                      # Application bootstrap
├── angular.json                     # Angular CLI config
├── tailwind.config.js               # TailwindCSS config
└── package.json
```

## Key Features

### Generic Dynamic Form
- **ONE component handles all 80 steps**
- Builds forms from metadata at runtime
- No step-specific components needed

### Supported Field Types
- Text input
- Email input
- Number input
- Select dropdown
- Checkbox
- Textarea
- Date picker
- Array fields (dynamic add/remove)

### Validation Layers
- Field-level validation (required, min/max, pattern, email)
- Conditional validation (rules based on other field values)
- Cross-step validation (data from previous steps)
- Business rule validation

### Signals API
- Reactive state management
- Fine-grained change detection
- Better performance than RxJS for simple state

## Environment Configuration

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',  // Backend API URL
};
```

## Development Workflow

1. **Start backend server** (see backend README)
2. **Start frontend dev server**: `npm start`
3. **Navigate to**: http://localhost:4200
4. **Hot reload**: Changes auto-reload in browser

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Testing the Setup

After running `npm start`, you should see:
- Application loads at http://localhost:4200
- No console errors
- Header displays "Audit Management System"
- TailwindCSS styles applied

## Next Steps

After Phase 1 validation:
- Backend API endpoints will be integrated
- Dynamic form components will be created
- Audit wizard will be implemented
