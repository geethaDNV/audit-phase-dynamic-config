import { StepConfig } from '../../types/step-config.types';

/**
 * Step 4: Checklist Items
 * Pattern 4: Array CRUD (Repeating Records)
 * 
 * Demonstrates:
 * - Fetching an array of records from a single table
 * - Bulk operations (create multiple, update multiple, delete removed)
 * - Field array management (add/remove items dynamically)
 * - Array validation (min/max items)
 */
export const Phase2Step2Config: StepConfig = {
  stepKey: '2-2',
  phaseId: 2,
  stepId: 2,
  stepName: 'Checklist Items',
  description: 'Define and manage checklist items for this audit',

  // ✅ DEPENDENCIES: Checklist items need client context
  dependencies: {
    requiredSteps: ['1-1'],
    optionalSteps: ['2-1'],  // Nice to reference documents, but not required
    dataReferences: {
      // Client: Always small (1 record)
      '1-1': {
        fields: ['id', 'name'],
        strategy: 'preload'
      },
      // Documents: Variable size, use adaptive strategy
      '2-1': {
        fields: ['id', 'title'],
        strategy: 'auto',
        threshold: 100
      }
    }
  },

  formSchema: {
    fields: [
      {
        name: 'items',
        label: 'Checklist Items',
        type: 'array',
        required: true,
        arrayItemType: 'object',
        validation: {
          required: true,
          minItems: 1,
          maxItems: 50,
          message: 'At least one checklist item is required',
        },
        arrayItemSchema: {
          fields: [
            {
              name: 'title',
              label: 'Item Title',
              type: 'text',
              required: true,
              validation: {
                required: true,
                maxLength: 200,
                message: 'Title is required and must be under 200 characters',
              },
            },
            {
              name: 'description',
              label: 'Description',
              type: 'textarea',
              required: false,
              displayConfig: {
                rows: 3,
                placeholder: 'Describe what needs to be checked...',
              },
            },
            {
              name: 'category',
              label: 'Category',
              type: 'select',
              required: true,
              options: ['Financial', 'Operational', 'Compliance', 'IT', 'HR', 'Other'],
              validation: {
                required: true,
                enum: ['Financial', 'Operational', 'Compliance', 'IT', 'HR', 'Other'],
                message: 'Category is required',
              },
              displayConfig: {
                placeholder: 'Select category',
              },
            },
            {
              name: 'priority',
              label: 'Priority',
              type: 'select',
              required: true,
              options: ['Low', 'Medium', 'High', 'Critical'],
              validation: {
                required: true,
                enum: ['Low', 'Medium', 'High', 'Critical'],
                message: 'Priority is required',
              },
              displayConfig: {
                placeholder: 'Select priority',
              },
            },
            {
              name: 'isCompleted',
              label: 'Completed',
              type: 'checkbox',
              required: false,
              displayConfig: {
                helpText: 'Mark as completed',
              },
            },
          ],
        },
        displayConfig: {
          addButtonLabel: 'Add Checklist Item',
          removeButtonLabel: 'Remove',
          emptyMessage: 'No checklist items yet. Click "Add Checklist Item" to get started.',
        },
      },
    ],
    layout: 'vertical',
    submitLabel: 'Save Checklist',
  },

  dataConfig: {
    fetch: {
      strategy: 'prisma-simple',
      model: 'checklistItem',
      filter: 'byAuditId',
      returnArray: true,
    },

    save: {
      strategy: 'prisma-create',
      transactional: true,
      model: 'checklistItem',
      bulkOperation: true,
      deleteExisting: true,
      validationRules: [
        {
          type: 'required-field',
          field: 'items',
          message: 'At least one checklist item is required',
        },
        {
          type: 'array-min',
          field: 'items',
          value: 1,
          message: 'Add at least one checklist item',
        },
        {
          type: 'array-max',
          field: 'items',
          value: 50,
          message: 'Maximum 50 checklist items allowed',
        },
      ],
    },
  },

  businessRules: [
    {
      name: 'unique-titles',
      description: 'Checklist item titles should be unique within an audit',
      type: 'validation',
      config: {
        checkUniqueness: true,
        field: 'title',
      },
    },
    {
      name: 'priority-distribution',
      description: 'Recommend at least one high-priority item',
      type: 'warning',
      config: {
        warnIfNone: 'High',
      },
    },
  ],

  navigation: {
    previous: '2-1',
    next: '2-3',
  },
};
