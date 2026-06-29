import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MetadataService } from './features/audit/services/metadata.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 class="text-2xl font-bold text-gray-900">Audit Management System</h1>
          @if (metadataService.phases().length > 0) {
            <p class="text-sm text-gray-600 mt-1">
              ✅ {{ metadataService.phases().length }} phases loaded dynamically from API
            </p>
          }
        </div>
      </header>
      
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (loading) {
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-4 text-gray-600">Loading application...</p>
            </div>
          </div>
        } @else if (error) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 class="text-red-800 font-semibold">Failed to load application</h3>
            <p class="text-red-600 text-sm mt-1">{{ error }}</p>
            <button 
              (click)="retryLoad()"
              class="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        } @else {
          <router-outlet />
        }
      </main>
    </div>
  `,
  styles: [],
})
export class AppComponent implements OnInit {
  metadataService = inject(MetadataService);
  loading = true;
  error: string | null = null;
  
  async ngOnInit() {
    await this.loadMetadata();
  }
  
  async loadMetadata() {
    this.loading = true;
    this.error = null;
    
    try {
      // ✅ Load all phases/steps on app startup
      await this.metadataService.loadPhases();
      console.log('✅ Application metadata loaded successfully');
    } catch (err: any) {
      this.error = err.message || 'Failed to load metadata';
      console.error('Failed to load application metadata:', err);
    } finally {
      this.loading = false;
    }
  }
  
  retryLoad() {
    this.loadMetadata();
  }
}
