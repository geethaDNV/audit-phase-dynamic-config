/**
 * Seed Phase Configurations
 * Run with: npx ts-node prisma/seed-phases.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const phases = [
  {
    phaseId: 1,
    phaseKey: 'client-assessment',
    phaseName: 'Client Assessment',
    description: 'Gather and validate client information',
    displayOrder: 1,
    icon: '👤',
    color: '#3B82F6'
  },
  {
    phaseId: 2,
    phaseKey: 'audit-execution',
    phaseName: 'Audit Execution',
    description: 'Execute audit procedures and collect evidence',
    displayOrder: 2,
    icon: '📋',
    color: '#10B981'
  },
  {
    phaseId: 3,
    phaseKey: 'evidence-collection',
    phaseName: 'Evidence Collection',
    description: 'Document findings and supporting evidence',
    displayOrder: 3,
    icon: '📎',
    color: '#F59E0B'
  },
  {
    phaseId: 4,
    phaseKey: 'risk-analysis',
    phaseName: 'Risk Analysis',
    description: 'Analyze identified risks and controls',
    displayOrder: 4,
    icon: '⚠️',
    color: '#EF4444'
  },
  {
    phaseId: 5,
    phaseKey: 'findings-recommendations',
    phaseName: 'Findings & Recommendations',
    description: 'Summarize findings and provide recommendations',
    displayOrder: 5,
    icon: '💡',
    color: '#8B5CF6'
  },
  {
    phaseId: 6,
    phaseKey: 'quality-review',
    phaseName: 'Quality Review',
    description: 'Internal quality assurance review',
    displayOrder: 6,
    icon: '✅',
    color: '#06B6D4'
  },
  {
    phaseId: 7,
    phaseKey: 'final-report',
    phaseName: 'Final Report',
    description: 'Prepare and finalize audit report',
    displayOrder: 7,
    icon: '📄',
    color: '#6366F1'
  },
  {
    phaseId: 8,
    phaseKey: 'client-presentation',
    phaseName: 'Client Presentation',
    description: 'Present findings to client management',
    displayOrder: 8,
    icon: '🎯',
    color: '#EC4899'
  }
];

async function seedPhases() {
  console.log('🌱 Seeding phase configurations...');
  
  for (const phase of phases) {
    await prisma.phaseConfiguration.upsert({
      where: { phaseId: phase.phaseId },
      create: phase,
      update: phase
    });
    console.log(`✅ Seeded phase: ${phase.phaseName}`);
  }
  
  console.log('✅ All phases seeded successfully');
  await prisma.$disconnect();
}

seedPhases().catch((error) => {
  console.error('❌ Error seeding phases:', error);
  process.exit(1);
});
