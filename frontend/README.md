# Audit Management System - Frontend

Metadata-driven audit management system built with Angular 21 and TailwindCSS.

## Tech Stack

- **Framework**: Angular 21
- **Architecture**: Standalone Components
- **State Management**: Signals API
- **Forms**: Reactive Forms with dynamic form building
- **Styling**: TailwindCSS 3.4
- **HTTP Client**: Angular HttpClient with interceptors

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
# Start development server
npm start

# Application will open at http://localhost:4200
```

### Building

```bash
# Build for production
npm run build

# Output will be in dist/audit-management-frontend
```

### Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run watch` - Build in watch mode
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
