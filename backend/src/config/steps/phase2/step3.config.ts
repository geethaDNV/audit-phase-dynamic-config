import { StepConfig } from '../../types/step-config.types';

export const Phase2Step3Config: StepConfig = {
  stepKey: 'phase2-step3',
  phaseId: 2,
  stepId: 3,
  stepName: 'Audit Findings',
  description: 'Record findings with supporting evidence and recommendations in a single transaction',

  formSchema: {
    layout: 'vertical',
    submitLabel: 'Save Findings',
    fields: [
      {
        name: 'items',
        label: 'Audit Findings',
        type: 'array',
        required: false,
        arrayItemType: 'object',
        validation: {
          maxItems: 100,
          message: 'Maximum 100 findings allowed per audit',
        },
        arrayItemSchema: {
          fields: [
            {
              name: 'title',
              label: 'Finding Title',
              type: 'text',
              required: true,
              validation: {
                required: true,
                minLength: 5,
                maxLength: 200,
                message: 'Finding title must be between 5 and 200 characters'
              }
            },
            {
              name: 'description',
              label: 'Description',
              type: 'textarea',
              required: true,
              validation: {
                required: true,
                minLength: 20,
                message: 'Description must be at least 20 characters'
              },
              displayConfig: {
                rows: 4,
                placeholder: 'Describe the finding in detail...'
              }
            },
            {
              name: 'severity',
              label: 'Severity',
              type: 'select',
              required: true,
              options: ['Low', 'Medium', 'High', 'Critical'],
              validation: {
                required: true,
                enum: ['Low', 'Medium', 'High', 'Critical'],
                message: 'Severity level is required'
              },
              displayConfig: {
                placeholder: 'Select severity'
              }
            },
            {
              name: 'category',
              label: 'Category',
              type: 'select',
              required: true,
              options: ['Financial', 'Compliance', 'Operational', 'Technical', 'Governance'],
              validation: {
                required: true,
                enum: ['Financial', 'Compliance', 'Operational', 'Technical', 'Governance'],
                message: 'Category is required'
              },
              displayConfig: {
                placeholder: 'Select category'
              }
            },
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              required: true,
              options: ['Open', 'In Progress', 'Resolved', 'Closed'],
              validation: {
                required: true,
                enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
                message: 'Status is required'
              },
              displayConfig: {
                placeholder: 'Select status'
              }
            },
            {
              name: 'assignedTo',
              label: 'Assigned To',
              type: 'text',
              required: false,
              validation: {
                maxLength: 100,
                message: 'Assigned to cannot exceed 100 characters'
              },
              displayConfig: {
                placeholder: 'Enter assignee name'
              }
            }
          ]
        },
        displayConfig: {
          addButtonLabel: 'Add Finding',
          removeButtonLabel: 'Remove',
          emptyMessage: 'No findings recorded yet. Click "Add Finding" to get started.',
        }
      }
    ]
  },

  dataConfig: {
    fetch: {
      strategy: 'custom-query',
      repositoryClass: 'FindingRepository'
    },
    save: {
      strategy: 'complex-transaction',
      transactional: true,
      model: 'finding',
      bulkOperation: true,
      deleteExisting: true,
      repositoryClass: 'FindingRepository'
    }
  },

  businessRules: [
    {
      name: 'critical-finding-validation',
      description: 'Critical findings must have at least one piece of evidence and one recommendation',
      type: 'conditional',
      config: {
        condition: "severity === 'Critical'",
        message: 'Critical findings require evidence and recommendations'
      }
    },
    {
      name: 'resolution-validation',
      description: 'Resolved or Closed findings must have recommendations',
      type: 'conditional',
      config: {
        condition: "status === 'Resolved' || status === 'Closed'",
        message: 'Resolved findings must include recommendations for remediation'
      }
    }
  ],

  navigation: {
    next: undefined,
    previous: '2-2'
  }
};
