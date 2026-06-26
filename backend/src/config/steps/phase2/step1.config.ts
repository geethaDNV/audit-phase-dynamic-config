import { StepConfig } from '../../types/step-config.types';

export const Phase2Step1Config: StepConfig = {
  stepKey: 'phase2-step1',
  phaseId: 2,
  stepId: 1,
  stepName: 'Document Upload',
  description: 'Upload and categorize audit documents with conditional validation',

  formSchema: {
    layout: 'vertical',
    submitLabel: 'Save Documents',
    fields: [
      {
        name: 'items',
        label: 'Documents',
        type: 'array',
        required: false,
        arrayItemType: 'object',
        validation: {
          maxItems: 100,
          message: 'Maximum 100 documents allowed per audit',
        },
        arrayItemSchema: {
          fields: [
            {
              name: 'title',
              label: 'Document Title',
              type: 'text',
              required: true,
              validation: {
                required: true,
                minLength: 3,
                maxLength: 200,
                message: 'Document title must be between 3 and 200 characters'
              }
            },
            {
              name: 'documentType',
              label: 'Document Type',
              type: 'select',
              required: true,
              options: ['Financial Statement', 'Compliance Report', 'Internal Memo', 'External Communication', 'Supporting Evidence'],
              validation: {
                required: true,
                enum: ['Financial Statement', 'Compliance Report', 'Internal Memo', 'External Communication', 'Supporting Evidence'],
                message: 'Document type is required'
              },
              displayConfig: {
                placeholder: 'Select document type'
              }
            },
            {
              name: 'filePath',
              label: 'File Path',
              type: 'text',
              required: true,
              validation: {
                required: true,
                pattern: '^/documents/.*\\.(pdf|docx|xlsx|txt)$',
                message: 'File path must start with /documents/ and end with .pdf, .docx, .xlsx, or .txt'
              },
              displayConfig: {
                placeholder: '/documents/filename.pdf'
              }
            },
            {
              name: 'fileSize',
              label: 'File Size (bytes)',
              type: 'number',
              required: true,
              validation: {
                required: true,
                min: 1,
                max: 52428800,
                message: 'File size must be between 1 byte and 50 MB'
              }
            },
            {
              name: 'description',
              label: 'Description',
              type: 'textarea',
              required: false,
              validation: {
                maxLength: 1000,
                message: 'Description cannot exceed 1000 characters'
              },
              displayConfig: {
                rows: 3,
                placeholder: 'Document description...'
              }
            },
            {
              name: 'isConfidential',
              label: 'Confidential',
              type: 'checkbox',
              required: false,
              displayConfig: {
                helpText: 'Mark as confidential document'
              }
            },
            {
              name: 'tags',
              label: 'Tags (comma-separated)',
              type: 'text',
              required: false,
              validation: {
                pattern: '^[a-zA-Z0-9,\\s-]*$',
                message: 'Tags can only contain letters, numbers, commas, spaces, and hyphens'
              },
              displayConfig: {
                placeholder: 'tag1, tag2, tag3'
              }
            }
          ]
        },
        displayConfig: {
          addButtonLabel: 'Add Document',
          removeButtonLabel: 'Remove',
          emptyMessage: 'No documents uploaded yet. Click "Add Document" to get started.',
        }
      }
    ]
  },

  dataConfig: {
    fetch: {
      strategy: 'prisma-simple',
      model: 'document',
      returnArray: true
    },
    save: {
      strategy: 'prisma-create',
      transactional: true,
      model: 'document',
      bulkOperation: true,
      deleteExisting: true,
      repositoryClass: 'DocumentRepository'
    }
  },

  businessRules: [
    {
      name: 'confidential-document-validation',
      description: 'Confidential documents require additional validation and audit trail',
      type: 'custom',
      config: {
        message: 'Confidential documents must meet security requirements'
      }
    },
    {
      name: 'financial-statement-requirement',
      description: 'Financial statements must be in PDF format',
      type: 'conditional',
      config: {
        condition: "documentType === 'Financial Statement'",
        message: 'Financial statements must be uploaded as PDF files'
      }
    }
  ],

  navigation: {
    next: '2-2',
    previous: '1-3'
  }
};
