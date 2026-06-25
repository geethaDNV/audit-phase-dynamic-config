import { StepConfig } from '../../types/step-config.types';

export const Phase2Step3Config: StepConfig = {
  stepKey: 'phase2-step3',
  phaseId: 2,
  stepId: 3,
  stepName: 'Audit Findings',
  description: 'Record findings with supporting evidence and recommendations in a single transaction',

  formSchema: {
    layout: 'vertical',
    submitLabel: 'Save Finding',
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
        }
      },
      {
        name: 'severity',
        label: 'Severity',
        type: 'select',
        required: true,
        options: [
          { value: 'Low', label: 'Low' },
          { value: 'Medium', label: 'Medium' },
          { value: 'High', label: 'High' },
          { value: 'Critical', label: 'Critical' }
        ],
        validation: {
          required: true,
          message: 'Severity level is required'
        }
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { value: 'Financial', label: 'Financial' },
          { value: 'Compliance', label: 'Compliance' },
          { value: 'Operational', label: 'Operational' },
          { value: 'Technical', label: 'Technical' },
          { value: 'Governance', label: 'Governance' }
        ],
        validation: {
          required: true,
          message: 'Category is required'
        }
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'Open', label: 'Open' },
          { value: 'In Progress', label: 'In Progress' },
          { value: 'Resolved', label: 'Resolved' },
          { value: 'Closed', label: 'Closed' }
        ],
        validation: {
          required: true,
          message: 'Status is required'
        }
      },
      {
        name: 'evidence',
        label: 'Supporting Evidence',
        type: 'array',
        required: false,
        arrayItemSchema: {
          fields: [
            {
              name: 'description',
              label: 'Evidence Description',
              type: 'text',
              required: true,
              validation: {
                required: true,
                minLength: 5,
                message: 'Evidence description must be at least 5 characters'
              }
            },
            {
              name: 'source',
              label: 'Source',
              type: 'text',
              required: true,
              validation: {
                required: true,
                message: 'Evidence source is required'
              }
            },
            {
              name: 'documentPath',
              label: 'Document Path',
              type: 'text',
              required: false,
              validation: {
                pattern: '^(/documents/|http)',
                message: 'Document path must start with /documents/ or http'
              }
            }
          ]
        }
      },
      {
        name: 'recommendations',
        label: 'Recommendations',
        type: 'array',
        required: false,
        arrayItemSchema: {
          fields: [
            {
              name: 'description',
              label: 'Recommendation',
              type: 'textarea',
              required: true,
              validation: {
                required: true,
                minLength: 10,
                message: 'Recommendation must be at least 10 characters'
              }
            },
            {
              name: 'priority',
              label: 'Priority',
              type: 'select',
              required: true,
              options: [
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Critical', label: 'Critical' }
              ],
              validation: {
                required: true,
                message: 'Priority is required'
              }
            },
            {
              name: 'targetDate',
              label: 'Target Completion Date',
              type: 'date',
              required: false
            }
          ]
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
