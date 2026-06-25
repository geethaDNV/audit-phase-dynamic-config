import { StepConfig } from '../../types/step-config.types';

export const Phase2Step1Config: StepConfig = {
  stepKey: 'phase2-step1',
  phaseId: 2,
  stepId: 1,
  stepName: 'Document Upload',
  description: 'Upload and categorize audit documents with conditional validation',

  formSchema: {
    layout: 'vertical',
    submitLabel: 'Upload Document',
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
        options: [
          { value: 'Financial Statement', label: 'Financial Statement' },
          { value: 'Compliance Report', label: 'Compliance Report' },
          { value: 'Internal Memo', label: 'Internal Memo' },
          { value: 'External Communication', label: 'External Communication' },
          { value: 'Supporting Evidence', label: 'Supporting Evidence' }
        ],
        validation: {
          required: true,
          message: 'Document type is required'
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
        }
      },
      {
        name: 'isConfidential',
        label: 'Mark as Confidential',
        type: 'checkbox',
        required: false
      },
      {
        name: 'tags',
        label: 'Tags (comma-separated)',
        type: 'text',
        required: false,
        validation: {
          pattern: '^[a-zA-Z0-9,\\s-]*$',
          message: 'Tags can only contain letters, numbers, commas, spaces, and hyphens'
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
      strategy: 'conditional-save',
      transactional: false,
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
