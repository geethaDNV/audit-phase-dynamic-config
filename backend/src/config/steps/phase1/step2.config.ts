import { StepConfig } from '../../types/step-config.types';

/**
 * Step 2: Entity & Contact Selection
 * Pattern 2: Multi-source Compose Fetch
 * 
 * Demonstrates:
 * - Fetching data from multiple related tables (Entity, Contact)
 * - Custom repository with composed data
 * - Dropdown/select field population from fetched data
 * - Saving selection back to parent record (Client)
 */
export const Phase1Step2Config: StepConfig = {
  stepKey: 'phase1-step2',
  phaseId: 1,
  stepId: 2,
  stepName: 'Entity & Contact Selection',
  description: 'Select primary entity and contacts associated with this audit',

  formSchema: {
    fields: [
      {
        name: 'selectedEntityId',
        label: 'Primary Entity',
        type: 'select',
        required: true,
        validation: {
          required: true,
          message: 'Please select a primary entity',
        },
        // Options will be populated from fetched entities
        displayConfig: {
          placeholder: 'Select the primary entity for this audit',
          helpText: 'Choose the main entity that will be audited',
        },
      },
      {
        name: 'selectedContacts',
        label: 'Key Contacts',
        type: 'multi-select',
        required: false,
        validation: {
          minItems: 1,
          message: 'Select at least one contact',
        },
        displayConfig: {
          placeholder: 'Select key contacts for this audit',
          helpText: 'Choose the primary contacts involved in this audit',
        },
      },
    ],
    layout: 'vertical',
    submitLabel: 'Save Selection',
  },

  dataConfig: {
    fetch: {
      strategy: 'prisma-compose',
      repositoryClass: 'Step2Repository',
      sources: [
        {
          name: 'entities',
          model: 'entity',
          filter: 'byAuditClientId',
        },
        {
          name: 'contacts',
          model: 'contact',
          filter: 'byAuditClientId',
        },
      ],
    },

    save: {
      strategy: 'custom',
      transactional: false,
      repositoryClass: 'Step2Repository',
      validationRules: [
        {
          type: 'required-field',
          field: 'selectedEntityId',
          message: 'Primary entity selection is required',
        },
        {
          type: 'custom',
          field: 'selectedEntityId',
          message: 'Selected entity must belong to this audit client',
          validatorName: 'validateEntityBelongsToClient',
        },
      ],
    },
  },

  businessRules: [
    {
      name: 'entity-ownership',
      description: 'Selected entity must belong to the audit client',
      type: 'validation',
      config: {
        checkOwnership: true,
      },
    },
  ],

  navigation: {
    previous: 'phase1-step1',
    next: 'phase1-step3',
  },
};
