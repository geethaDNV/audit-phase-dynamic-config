import { StepConfig } from '../../types/step-config.types';

export const Phase2Step3Config: StepConfig = {
  stepKey: '2-3',
  phaseId: 2,
  stepId: 3,
  stepName: 'Audit Findings',
  description: 'Record findings with supporting evidence and recommendations in a single transaction',
  
  // ✅ DEPENDENCIES: Tells the system what data this step needs from other steps
  dependencies: {
    // These steps MUST be completed before user can access this step
    requiredSteps: ['1-1', '2-1'],
    
    // Load data from these steps for validation (HYBRID STRATEGY)
    dataReferences: {
      // Client: Always small (1 record), pre-load all fields
      '1-1': {
        fields: ['name', 'email', 'industry'],
        strategy: 'preload'  // Always pre-load
      },
      
      // Documents: Can be large, use auto strategy
      '2-1': {
        fields: ['id'],      // Only need ID for validation
        strategy: 'auto',     // Pre-load if < 100, else direct DB
        threshold: 100        // Threshold for decision
      }
    }
  },

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
    },
    {
      // ✅ CROSS-STEP VALIDATION: Validates against data from Step 2-1 (Documents)
      name: 'document-reference-validation',
      description: 'Evidence must reference valid documents uploaded in Step 2-1',
      type: 'cross-step',
      config: {
        validatorClass: 'DocumentReferenceValidator'
      }
      // This validator will use context.dependencyData.get('2-1') 
      // which contains documents from the Document table (NO additional DB query!)
    }
  ],

  navigation: {
    next: undefined,
    previous: '2-2'
  }
};
