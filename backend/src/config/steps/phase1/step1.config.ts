import { StepConfig } from '../../types/step-config.types';

/**
 * STEP 1: CLIENT BASIC INFORMATION
 * Pattern 1: Simple Single-Table CRUD
 * 
 * This is the simplest pattern - read from and write to a single table.
 * No joins, no complex queries, just basic CRUD operations.
 * 
 * Fetch Strategy: prisma-simple
 *   - Reads from 'client' table using Prisma findUnique
 *   - No joins or aggregations needed
 * 
 * Save Strategy: prisma-upsert
 *   - Creates new client or updates existing
 *   - Single table operation (non-transactional)
 *   - Simple field mapping
 * 
 * Form Fields:
 *   - name: Client company name (required, 3-100 chars)
 *   - email: Email address (required, valid email)
 *   - industry: Select dropdown (required, enum validation)
 *   - phone: Optional phone number (pattern validation)
 */
export const Phase1Step1Config: StepConfig = {
  phaseId: 1,
  stepId: 1,
  stepName: 'Client Basic Information',
  description: 'Capture essential client details for the audit',

  formSchema: {
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Client Name',
        placeholder: 'Enter client company name',
        helpText: 'Legal name of the organization being audited',
        validation: {
          required: true,
          minLength: 3,
          maxLength: 100,
        },
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'contact@company.com',
        helpText: 'Primary contact email for audit communications',
        validation: {
          required: true,
          email: true,
        },
      },
      {
        name: 'industry',
        type: 'select',
        label: 'Industry',
        placeholder: 'Select industry',
        helpText: 'Primary business sector',
        options: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Other'],
        validation: {
          required: true,
          enum: ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Other'],
        },
      },
      {
        name: 'phone',
        type: 'text',
        label: 'Phone Number',
        placeholder: '+1 (555) 123-4567',
        helpText: 'Optional - include country code',
        validation: {
          pattern: '^\\+?[1-9]\\d{1,14}$',
          patternMessage: 'Enter a valid phone number with country code (e.g., +1 555-123-4567)',
        },
      },
    ],
    // No business rules for this simple step
    businessRules: [],
  },

  dataConfig: {
    // FETCH: Read from single 'client' table
    fetch: {
      strategy: 'prisma-simple',
      model: 'client', // Prisma model name (lowercase)
    },

    // SAVE: Upsert to single 'client' table
    save: {
      strategy: 'prisma-upsert',
      transactional: false, // Single table operation doesn't need transaction
      model: 'client',
    },
  },
};
