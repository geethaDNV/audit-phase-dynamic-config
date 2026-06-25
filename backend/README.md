# Audit Management System - Backend API

Metadata-driven audit management system built with Node.js 22, TypeScript, Express, and Prisma.

## Tech Stack

- **Runtime**: Node.js 22
- **Language**: TypeScript 5.5+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Neon)
- **Validation**: class-validator

## Getting Started

### Prerequisites

- Node.js 22 or higher
- PostgreSQL database (Neon account recommended)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@your-neon-host.neon.tech/audit_management?sslmode=require"
```

### Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed

# Open Prisma Studio (optional)
npm run prisma:studio
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Scripts

- `npm run dev` - Start development server with watch mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run prisma:seed` - Seed database with sample data
- `npm run sync-metadata` - Sync TypeScript configs to database
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
backend/
├── src/
│   ├── config/              # Metadata configurations
│   │   ├── types/           # TypeScript interfaces
│   │   └── steps/           # Step configurations
│   ├── controllers/         # Request handlers
│   ├── services/            # Business logic
│   ├── repositories/        # Data access layer
│   ├── middleware/          # Express middleware
│   ├── routes/              # API routes
│   ├── validators/          # Custom validators
│   └── server.ts            # Application entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration files
│   └── seed.ts              # Seed data
└── package.json
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Audits
- `GET /api/audits` - List all audits
- `GET /api/audits/:id` - Get audit details
- `POST /api/audits` - Create new audit
- `PUT /api/audits/:id` - Update audit
- `DELETE /api/audits/:id` - Delete audit

### Steps (Generic Endpoint)
- `GET /api/audits/:auditId/phases/:phaseId/steps/:stepId` - Fetch step data
- `POST /api/audits/:auditId/phases/:phaseId/steps/:stepId` - Save step data

### Metadata
- `GET /api/metadata/phases/:phaseId/steps/:stepId` - Get form schema and data config

## Environment Variables

```env
DATABASE_URL=postgresql://...  # PostgreSQL connection string
NODE_ENV=development           # Environment (development/production)
PORT=3000                      # Server port
CORS_ORIGIN=http://localhost:4200  # Frontend URL for CORS
LOG_LEVEL=debug                # Logging level
```

## Testing

```bash
# Test with curl
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2026-06-25T...","environment":"development"}
```
