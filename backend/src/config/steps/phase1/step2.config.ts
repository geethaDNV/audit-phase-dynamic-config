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
        placeholder: 'Select the primary entity for this audit',
        helpText: 'Choose the main entity that will be audited',
        validation: {
          required: true,
        },
        // Options populated dynamically from fetched entities
        optionsSource: {
          dataPath: 'entities',
          labelField: 'name',
          valueField: 'id',
        },
      },
      {
        name: 'selectedContacts',
        label: 'Key Contacts',
        type: 'multi-select',
        placeholder: 'Select key contacts for this audit',
        helpText: 'Choose the primary contacts involved in this audit',
        validation: {
          minItems: 1,
        },
        // Options populated dynamically from fetched contacts
        optionsSource: {
          dataPath: 'contacts',
          labelField: 'name',
          valueField: 'id',
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
      ],
    },
  },

  navigation: {
    previous: 'phase1-step1',
    next: 'phase1-step3',
  },
};
