import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/audits',
    pathMatch: 'full',
  },
  {
    path: 'audits',
    loadComponent: () =>
      import('./features/audit/components/audit-list.component').then(
        (m) => m.AuditListComponent
      ),
  },
  {
    path: 'audits/:auditId/wizard',
    loadComponent: () =>
      import('./features/audit/components/audit-wizard.component').then(
        (m) => m.AuditWizardComponent
      ),
  },
  {
    path: 'audits/:auditId/phases/:phaseId/steps/:stepId',
    loadComponent: () =>
      import('./features/audit/components/step-form.component').then(
        (m) => m.StepFormComponent
      ),
  },
  {
    path: '**',
    redirectTo: '/audits',
  },
];
