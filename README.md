# Metadata-Driven Audit Management System

A complete proof-of-concept demonstrating a metadata-driven architecture for an 80-step audit management system. Instead of creating 80+ endpoints and components, this POC uses parameterized APIs and dynamic form generation.

## 🏗️ Architecture Overview

- **Backend**: Node.js 22 + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: Angular 21 + Standalone Components + Signals + TailwindCSS
- **Key Innovation**: TypeScript configuration files drive everything - no hardcoded step logic

## 📦 Project Structure

```
audit-phase-dynamic/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── config/       # Step metadata configurations (the brain!)
│   │   ├── controllers/  # Generic request handlers
│   │   ├── services/     # Business logic orchestration
│   │   ├── repositories/ # Data access patterns
│   │   └── server.ts
│   ├── prisma/           # Database schema & migrations
│   └── package.json
│
├── frontend/             # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/audit/      # Audit feature module
│   │   │   ├── shared/dynamic-form/ # Generic form builder
│   │   │   └── core/                # HTTP services
│   │   └── main.ts
│   └── package.json
│
└── README.md             # This file
```

## 🎯 POC Scope: 6 Representative Steps

This POC implements 6 steps across 2 phases, demonstrating all data pattern combinations:

### Phase 1: Client Assessment
1. **Step 1** - Simple CRUD (client info)
2. **Step 2** - Multi-table compose (entity + contacts)
3. **Step 3** - Complex fetch with aggregations (risk assessment)

### Phase 2: Checklist Execution
4. **Step 4** - Array CRUD (checklist items)
5. **Step 5** - Conditional save (document review)
6. **Step 6** - Complex transaction (findings + evidence + recommendations)

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL database (Neon recommended) or SQLite for local development
- npm or yarn

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL

# Setup database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Start development server
npm run dev
```

Backend runs at: http://localhost:3000

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs at: http://localhost:4200

## ✅ Phase 1 Validation Checklist

After setup, verify everything is working:

### Backend Validation

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Build TypeScript (should succeed with no errors)
npm run build

# 3. Start server (should show "🚀 Server running...")
npm run dev

# 4. In another terminal, test health endpoint
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"...","environment":"development"}
```

### Frontend Validation

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Build (should succeed)
npm run build

# 3. Start dev server
npm start

# 4. Open browser to http://localhost:4200
# Expected: See "Audit Management System" header with TailwindCSS styling
# No console errors
```

### ✅ Success Criteria for Phase 1

- [ ] Backend compiles with no TypeScript errors
- [ ] Backend server starts and responds to /health endpoint
- [ ] Frontend compiles with no errors
- [ ] Frontend renders with TailwindCSS styles applied
- [ ] No console errors in browser
- [ ] Both projects run simultaneously

## 📋 Implementation Phases

- [x] **Phase 1**: Project initialization ← *You are here*
- [ ] **Phase 2**: Database schema & Prisma setup
- [ ] **Phase 3**: Backend Pattern 1 (Simple CRUD)
- [ ] **Phase 4**: Frontend Dynamic Form
- [ ] **Phase 5**: Backend Patterns 2 & 4 (Compose + Arrays)
- [ ] **Phase 6**: Backend Patterns 3, 5, 6 (Complex)
- [ ] **Phase 7**: End-to-end integration testing

## 🎓 Key Concepts

### Metadata-Driven Architecture

Instead of:
```typescript
// ❌ Traditional approach - 80 controllers
class Step1Controller { ... }
class Step2Controller { ... }
class Step3Controller { ... }
// ... 77 more files
```

We use:
```typescript
// ✅ Metadata-driven - ONE controller
class StepController {
  async handle(phaseId, stepId) {
    const config = registry.get(phaseId, stepId);
    return strategy.execute(config);
  }
}
```

### Configuration Files Drive Everything

```typescript
// config/steps/phase1/step1.config.ts
export const Phase1Step1Config: StepConfig = {
  formSchema: { fields: [...] },     // What the UI renders
  dataConfig: {
    fetch: { strategy: 'prisma-simple', model: 'client' },
    save: { strategy: 'prisma-upsert', model: 'client' }
  }
};
```

Adding Step 7? Just create `step7.config.ts` - no code changes!

## 🔍 Validation Checkpoints

Each phase ends with validation tasks to ensure everything works before proceeding. This iterative approach prevents cascading issues.

## 📚 Documentation

- [Backend README](./backend/README.md) - API documentation, endpoints, database setup
- [Frontend README](./frontend/README.md) - Component architecture, routing, development workflow

## 🛠️ Development Workflow

1. **Backend changes**: Edit files → TypeScript auto-compiles (watch mode)
2. **Frontend changes**: Edit files → Hot reload in browser
3. **Database changes**: Edit Prisma schema → Run migrations
4. **Add new step**: Create config file → Automatically works!

## 📊 Tech Stack Details

### Backend
- **Runtime**: Node.js 22 (latest LTS)
- **Language**: TypeScript 5.5+ (strict mode)
- **Framework**: Express.js 4.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 16+
- **Validation**: class-validator

### Frontend
- **Framework**: Angular 21
- **Components**: Standalone (no NgModules)
- **State**: Signals API (modern reactive state)
- **Forms**: Reactive Forms with dynamic generation
- **Styling**: TailwindCSS 3.4
- **HTTP**: Angular HttpClient

## 🎯 Next Steps

After validating Phase 1, we'll proceed to:

**Phase 2: Database Schema**
- Create complete Prisma schema (15 models)
- Run migrations
- Seed sample data
- Test with Prisma Studio

See you in Phase 2! 🚀

## 📝 License

MIT
