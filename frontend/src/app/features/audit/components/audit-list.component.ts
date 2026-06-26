/**
 * Audit List Component
 * Lists all audits with CRUD operations
 */

import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../services/audit.service';
import { Audit } from '../models/audit.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LoadingSpinnerComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Audits</h1>
        <button
          (click)="showCreateModal.set(true)"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + New Audit
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (audits().length === 0) {
        <div class="text-center py-12">
          <p class="text-gray-500 mb-4">No audits found</p>
          <button
            (click)="showCreateModal.set(true)"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create your first audit
          </button>
        </div>
      } @else {
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          @for (audit of audits(); track audit.id) {
            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-semibold text-gray-900">{{ audit.name }}</h3>
                <span 
                  class="px-2 py-1 text-xs rounded-full"
                  [class.bg-gray-200]="audit.status === 'draft'"
                  [class.bg-blue-200]="audit.status === 'in-progress'"
                  [class.bg-green-200]="audit.status === 'completed'"
                >
                  {{ audit.status }}
                </span>
              </div>
              
              <p class="text-sm text-gray-500 mb-4">
                Created: {{ formatDate(audit.createdAt) }}
              </p>
              
              <div class="flex gap-2">
                <button
                  [routerLink]="['/audits', audit.id, 'wizard']"
                  class="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Open
                </button>
                <button
                  (click)="deleteAudit(audit.id)"
                  class="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Create Modal -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 class="text-xl font-bold mb-4">Create New Audit</h2>
            
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Audit Name
              </label>
              <input
                type="text"
                [(ngModel)]="newAuditName"
                placeholder="Enter audit name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div class="flex gap-3">
              <button
                (click)="createAudit()"
                [disabled]="!newAuditName.trim() || creating()"
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {{ creating() ? 'Creating...' : 'Create' }}
              </button>
              <button
                (click)="closeCreateModal()"
                [disabled]="creating()"
                class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AuditListComponent implements OnInit {
  private auditService = inject(AuditService);
  private router = inject(Router);

  audits = this.auditService.getAuditsSignal();
  loading = signal(false);
  showCreateModal = signal(false);
  newAuditName = '';
  creating = signal(false);

  async ngOnInit() {
    await this.loadAudits();
  }

  async loadAudits() {
    this.loading.set(true);
    try {
      await this.auditService.getAudits();
    } catch (error) {
      console.error('Failed to load audits:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async createAudit() {
    if (!this.newAuditName.trim()) return;

    this.creating.set(true);
    try {
      const audit = await this.auditService.createAudit({
        name: this.newAuditName.trim(),
        status: 'draft'
      });
      
      this.closeCreateModal();
      this.router.navigate(['/audits', audit.id, 'wizard']);
    } catch (error) {
      console.error('Failed to create audit:', error);
      alert('Failed to create audit');
    } finally {
      this.creating.set(false);
    }
  }

  async deleteAudit(id: number) {
    if (!confirm('Are you sure you want to delete this audit?')) return;

    try {
      await this.auditService.deleteAudit(id);
    } catch (error) {
      console.error('Failed to delete audit:', error);
      alert('Failed to delete audit');
    }
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newAuditName = '';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
