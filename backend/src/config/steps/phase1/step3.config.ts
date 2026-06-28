import { StepConfig } from '../../types/step-config.types';

export const Phase1Step3Config: StepConfig = {
  stepKey: '1-3',
  phaseId: 1,
  stepId: 3,
  stepName: 'Risk Assessment',
  description: 'Aggregate and analyze risk data from multiple sources',

  // ✅ DEPENDENCIES: Risk assessment needs client and entity data
  dependencies: {
    requiredSteps: ['1-1', '1-2'],
    dataReferences: {
      // Client: Always small (1 record)
      '1-1': {
        fields: ['id', 'name', 'industry'],
        strategy: 'preload'
      },
      // Entities: Usually small (< 20 entities)
      '1-2': {
        fields: ['selectedEntityId', 'entities'],
        strategy: 'preload'
      }
    }
  },

  formSchema: {
    layout: 'vertical',
    submitLabel: 'Save Risk Assessment',
    fields: [
      {
        name: 'riskLevel',
        label: 'Risk Level',
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
          message: 'Risk level is required'
        }
      },
      {
        name: 'riskScore',
        label: 'Risk Score',
        type: 'number',
        required: true,
        validation: {
          required: true,
          min: 0,
          max: 100,
          message: 'Risk score must be between 0 and 100'
        }
      },
      {
        name: 'previousRisk',
        label: 'Previous Risk Level',
        type: 'select',
        required: false,
        options: [
          { value: 'Low', label: 'Low' },
          { value: 'Medium', label: 'Medium' },
          { value: 'High', label: 'High' },
          { value: 'Critical', label: 'Critical' }
        ]
      },
      {
        name: 'justification',
        label: 'Risk Justification',
        type: 'textarea',
        required: false,
        validation: {
          maxLength: 2000,
          message: 'Justification cannot exceed 2000 characters'
        }
      }
    ]
  },

  dataConfig: {
    fetch: {
      strategy: 'custom-query',
      repositoryClass: 'Step3Repository'
    },
    save: {
      strategy: 'prisma-upsert',
      transactional: false,
      model: 'riskAssessment'
    }
  },

  businessRules: [
    {
      name: 'risk-level-validation',
      description: 'Overall risk level must match the highest individual risk score',
      type: 'custom',
      config: {
        message: 'Overall risk level should reflect the highest individual risk category'
      }
    }
  ],

  navigation: {
    next: '2-1',
    previous: '1-2'
  }
};
