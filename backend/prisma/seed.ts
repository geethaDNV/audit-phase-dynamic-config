import { PrismaClient } from '@prisma/client';
import { stepRegistry } from '../src/config/step-registry';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.findingAuditTrail.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.documentReview.deleteMany();
  await prisma.document.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.client.deleteMany();
  await prisma.stepData.deleteMany();
  await prisma.auditStepStatus.deleteMany();
  await prisma.stepConfiguration.deleteMany();
  await prisma.phaseConfiguration.deleteMany();
  await prisma.auditPhase.deleteMany();
  await prisma.audit.deleteMany();

  // ============================================================================
  // CREATE SAMPLE AUDITS
  // ============================================================================

  console.log('📋 Creating sample audits...');

  const audit1 = await prisma.audit.create({
    data: {
      name: 'Acme Corporation - Annual Financial Audit 2026',
      description: 'Comprehensive financial audit for fiscal year 2026',
      status: 'in-progress',
      startedAt: new Date('2026-01-15'),
    },
  });

  const audit2 = await prisma.audit.create({
    data: {
      name: 'TechStart Inc - Initial Assessment',
      description: 'First-time audit for new client',
      status: 'draft',
    },
  });

  console.log(`✅ Created ${2} audits`);

  // ============================================================================
  // CREATE PHASES
  // ============================================================================

  console.log('📊 Creating audit phases...');

  await prisma.auditPhase.createMany({
    data: [
      {
        auditId: audit1.id,
        phaseId: 1,
        phaseName: 'Client Assessment',
        status: 'in-progress',
        startedAt: new Date('2026-01-15'),
      },
      {
        auditId: audit1.id,
        phaseId: 2,
        phaseName: 'Checklist Execution',
        status: 'pending',
      },
      {
        auditId: audit2.id,
        phaseId: 1,
        phaseName: 'Client Assessment',
        status: 'pending',
      },
      {
        auditId: audit2.id,
        phaseId: 2,
        phaseName: 'Checklist Execution',
        status: 'pending',
      },
    ],
  });

  console.log('✅ Created audit phases');

  // ============================================================================
  // STEP 1: CLIENT DATA
  // ============================================================================

  console.log('👤 Creating client data (Step 1)...');

  const client1 = await prisma.client.create({
    data: {
      auditId: audit1.id,
      name: 'Acme Corporation',
      email: 'contact@acmecorp.com',
      industry: 'Technology',
      phone: '+1 (555) 123-4567',
      address: '123 Tech Street, San Francisco, CA 94105',
      website: 'https://www.acmecorp.com',
      taxId: '12-3456789',
      fiscalYearEnd: new Date('2024-12-31'),
    },
  });

  const client2 = await prisma.client.create({
    data: {
      auditId: audit2.id,
      name: 'TechStart Inc',
      email: 'info@techstart.io',
      industry: 'Finance',
      phone: '+1 (555) 987-6543',
      address: '456 Innovation Drive, Austin, TX 78701',
      website: 'https://www.techstart.io',
      taxId: '98-7654321',
      fiscalYearEnd: new Date('2024-12-31'),
    },
  });

  console.log('✅ Created client records');

  // ============================================================================
  // STEP 2: ENTITIES & CONTACTS
  // ============================================================================

  console.log('🏢 Creating entities and contacts (Step 2)...');

  const entity1 = await prisma.entity.create({
    data: {
      clientId: client1.id,
      name: 'Acme Corporation',
      type: 'corporation',
      description: 'Parent company - manufacturing and distribution',
      registrationNumber: 'C-2020-12345',
      isActive: true,
    },
  });

  await prisma.entity.create({
    data: {
      clientId: client1.id,
      name: 'Acme Subsidiary LLC',
      type: 'llc',
      description: 'Subsidiary focused on retail operations',
      registrationNumber: 'L-2022-67890',
      isActive: true,
    },
  });

  await prisma.entity.create({
    data: {
      clientId: client2.id,
      name: 'TechStart Inc',
      type: 'corporation',
      description: 'Financial technology startup',
      registrationNumber: 'C-2025-54321',
      isActive: true,
    },
  });

  // Add additional entities to demonstrate cross-client entity selection
  await prisma.entity.createMany({
    data: [
      {
        clientId: client1.id,
        name: 'Acme International Trading Ltd',
        type: 'partnership',
        description: 'International trading division',
        registrationNumber: 'P-2021-11111',
        isActive: true,
      },
      {
        clientId: client2.id,
        name: 'TechStart Payment Solutions LLC',
        type: 'llc',
        description: 'Payment processing subsidiary',
        registrationNumber: 'L-2025-22222',
        isActive: true,
      },
      {
        clientId: client1.id,
        name: 'Acme Real Estate Holdings',
        type: 'llc',
        description: 'Property management division',
        registrationNumber: 'L-2019-33333',
        isActive: true,
      },
    ],
  });

  // Update client with selected entity
  await prisma.client.update({
    where: { id: client1.id },
    data: { selectedEntityId: entity1.id },
  });

  await prisma.contact.createMany({
    data: [
      {
        clientId: client1.id,
        name: 'John Smith',
        email: 'john.smith@acmecorp.com',
        phone: '+1 (555) 123-4501',
        role: 'CFO',
        isPrimary: true,
      },
      {
        clientId: client1.id,
        name: 'Sarah Johnson',
        email: 'sarah.j@acmecorp.com',
        phone: '+1 (555) 123-4502',
        role: 'Controller',
        isPrimary: false,
      },
      {
        clientId: client1.id,
        name: 'Mike Davis',
        email: 'mike.davis@acmecorp.com',
        role: 'Accounting Manager',
        isPrimary: false,
      },
      {
        clientId: client2.id,
        name: 'Emily Chen',
        email: 'emily@techstart.io',
        phone: '+1 (555) 987-6501',
        role: 'CEO',
        isPrimary: true,
      },
    ],
  });

  console.log('✅ Created entities and contacts');

  // ============================================================================
  // STEP 3: RISK ASSESSMENT
  // ============================================================================

  console.log('⚠️ Creating risk assessments (Step 3)...');

  await prisma.riskAssessment.create({
    data: {
      auditId: audit1.id,
      riskLevel: 'Medium',
      riskScore: 55.5,
      previousRisk: 'Low',
      justification:
        'Risk level increased from Low to Medium due to expansion into new markets and increased transaction volume. Historical data shows steady growth trend.',
      assessedAt: new Date('2026-01-20'),
    },
  });

  console.log('✅ Created risk assessments');

  // ============================================================================
  // STEP 4: CHECKLIST ITEMS
  // ============================================================================

  console.log('✅ Creating checklist items (Step 4 - Pattern 4: Array CRUD)...');

  await prisma.checklistItem.createMany({
    data: [
      {
        auditId: audit1.id,
        title: 'Review all bank reconciliations for Q4 2025',
        description: 'All reconciliations reviewed and approved',
        category: 'Financial',
        priority: 'High',
        isCompleted: true,
        completedAt: new Date('2026-02-01'),
      },
      {
        auditId: audit1.id,
        title: 'Verify accounts receivable aging report',
        description: 'Currently reviewing outstanding balances over 90 days',
        category: 'Financial',
        priority: 'Medium',
        isCompleted: false,
      },
      {
        auditId: audit1.id,
        title: 'Test internal controls for revenue recognition',
        description: 'Validate revenue recognition processes and controls',
        category: 'Compliance',
        priority: 'Critical',
        isCompleted: false,
      },
      {
        auditId: audit1.id,
        title: 'Analyze inventory valuation methods',
        description: 'Review and document inventory accounting policies',
        category: 'Financial',
        priority: 'Medium',
        isCompleted: false,
      },
      {
        auditId: audit1.id,
        title: 'Confirm related party transactions',
        description: 'Waiting for client to provide complete transaction list',
        category: 'Compliance',
        priority: 'High',
        isCompleted: false,
      },
    ],
  });

  console.log('✅ Created checklist items');

  // ============================================================================
  // STEP 5: DOCUMENTS & REVIEWS
  // ============================================================================

  console.log('📄 Creating documents and reviews (Step 5)...');

  const doc1 = await prisma.document.create({
    data: {
      auditId: audit1.id,
      title: 'Financial Statements Q4 2025',
      fileName: 'Financial_Statements_Q4_2025.pdf',
      documentType: 'Financial Statement',
      fileType: 'PDF',
      fileSize: 2048576,
      filePath: '/uploads/audit1/financial_statements.pdf',
      description: 'Quarterly financial statements for review',
    },
  });

  await prisma.documentReview.create({
    data: {
      documentId: doc1.id,
      status: 'approved',
      reviewedBy: 'Jane Auditor',
      reviewedAt: new Date('2026-02-05'),
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      auditId: audit1.id,
      title: 'Bank Reconciliation December',
      fileName: 'Bank_Reconciliation_December.xlsx',
      documentType: 'Financial Statement',
      fileType: 'Excel',
      fileSize: 512000,
      filePath: '/uploads/audit1/bank_recon.xlsx',
      description: 'December bank reconciliation',
    },
  });

  await prisma.documentReview.create({
    data: {
      documentId: doc2.id,
      status: 'rejected',
      reviewedBy: 'Jane Auditor',
      reviewedAt: new Date('2026-02-06'),
      justification:
        'Document is missing signatures from authorized personnel. Please resubmit with proper authorization.',
    },
  });

  const doc3 = await prisma.document.create({
    data: {
      auditId: audit1.id,
      title: 'Internal Controls Documentation',
      fileName: 'Internal_Controls_Documentation.pdf',
      documentType: 'PDF',
      fileType: 'PDF',
      fileSize: 3145728,
      filePath: '/uploads/audit1/controls.pdf',
      description: 'Internal controls documentation and procedures',
      isConfidential: true,
    },
  });

  await prisma.documentReview.create({
    data: {
      documentId: doc3.id,
      status: 'pending',
    },
  });

  console.log('✅ Created documents and reviews');

  // ============================================================================
  // STEP 6: FINDINGS, EVIDENCE & RECOMMENDATIONS
  // ============================================================================

  console.log('🔍 Creating findings with evidence and recommendations (Step 6)...');

  const finding1 = await prisma.finding.create({
    data: {
      auditId: audit1.id,
      title: 'Inadequate Segregation of Duties in Accounts Payable',
      description:
        'During our review, we identified that the same employee who creates vendor invoices also has the authority to approve payments. This represents a significant control weakness that could lead to unauthorized or fraudulent transactions.',
      severity: 'High',
      category: 'Financial',
      status: 'open',
    },
  });

  await prisma.evidence.createMany({
    data: [
      {
        findingId: finding1.id,
        documentId: doc1.id,
        description: 'Financial statements showing AP workflow',
        type: 'Document',
      },
      {
        findingId: finding1.id,
        description: 'Interview notes with AP clerk on June 15, 2026',
        type: 'Interview',
      },
      {
        findingId: finding1.id,
        description: 'Screenshot of user permissions in accounting system',
        type: 'Screenshot',
      },
    ],
  });

  await prisma.recommendation.createMany({
    data: [
      {
        findingId: finding1.id,
        description:
          'Implement a dual-approval process where invoice creation and payment approval are performed by different individuals.',
        priority: 'High',
        status: 'pending',
        dueDate: new Date('2026-03-31'),
      },
      {
        findingId: finding1.id,
        description:
          'Configure the accounting system to enforce segregation of duties at the technical level.',
        priority: 'High',
        status: 'pending',
        dueDate: new Date('2026-03-31'),
      },
      {
        findingId: finding1.id,
        description:
          'Conduct training for accounting staff on proper segregation of duties protocols.',
        priority: 'Medium',
        status: 'pending',
        dueDate: new Date('2026-04-15'),
      },
    ],
  });

  await prisma.findingAuditTrail.create({
    data: {
      findingId: finding1.id,
      action: 'created',
      changedBy: 'Jane Auditor',
      changes: {
        severity: 'High',
        status: 'open',
        title: 'Inadequate Segregation of Duties in Accounts Payable',
      },
    },
  });

  const finding2 = await prisma.finding.create({
    data: {
      auditId: audit1.id,
      title: 'Inventory Count Discrepancies',
      description:
        'Physical inventory counts performed on December 31, 2025 revealed discrepancies totaling $12,450 when compared to system records. Investigation is needed to determine root cause.',
      severity: 'Medium',
      category: 'Operational',
      status: 'in-review',
    },
  });

  await prisma.evidence.createMany({
    data: [
      {
        findingId: finding2.id,
        documentId: doc3.id,
        description: 'Inventory count worksheets',
        type: 'Document',
      },
      {
        findingId: finding2.id,
        description: 'System-generated inventory report as of 12/31/2025',
        type: 'System Log',
      },
    ],
  });

  await prisma.recommendation.create({
    data: {
      findingId: finding2.id,
      description:
        'Perform a comprehensive review of inventory management procedures and implement cycle counting program.',
      priority: 'Medium',
      status: 'accepted',
      dueDate: new Date('2026-06-30'),
    },
  });

  await prisma.findingAuditTrail.createMany({
    data: [
      {
        findingId: finding2.id,
        action: 'created',
        changedBy: 'Jane Auditor',
        changes: {
          severity: 'Medium',
          status: 'open',
        },
      },
      {
        findingId: finding2.id,
        action: 'status_changed',
        changedBy: 'Senior Auditor',
        changes: {
          oldStatus: 'open',
          newStatus: 'in-review',
        },
      },
    ],
  });

  console.log('✅ Created findings with evidence and recommendations');

  // ============================================================================
  // PHASE CONFIGURATIONS (Dynamic Phases)
  // ============================================================================

  console.log('\n📐 Creating phase configurations...');
  
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

  for (const phase of phases) {
    await prisma.phaseConfiguration.upsert({
      where: { phaseId: phase.phaseId },
      create: phase,
      update: phase
    });
  }

  console.log(`✅ Created ${phases.length} phase configurations`);

  // ============================================================================
  // STEP CONFIGURATIONS (Sync from TypeScript Registry)
  // ============================================================================

  console.log('\n⚙️  Syncing step configurations from TypeScript registry...');
  
  const allSteps = stepRegistry.getAllSteps();
  
  if (allSteps.length === 0) {
    console.warn('⚠️  No steps found in TypeScript registry!');
    console.log('   Make sure step configs exist in src/config/steps/');
  } else {
    let syncedCount = 0;
    
    for (const config of allSteps) {
      await prisma.stepConfiguration.upsert({
        where: { stepKey: config.stepKey },
        create: {
          stepKey: config.stepKey,
          phaseId: config.phaseId,
          stepId: config.stepId,
          stepName: config.stepName,
          description: config.description || '',
          formSchema: config.formSchema as any,
          dataConfig: config.dataConfig as any,
          businessRules: config.businessRules || null,
          dependencies: config.dependencies || null,
          isActive: true,
          version: 1
        },
        update: {
          stepName: config.stepName,
          description: config.description || '',
          formSchema: config.formSchema as any,
          dataConfig: config.dataConfig as any,
          businessRules: config.businessRules || null,
          dependencies: config.dependencies || null,
          version: { increment: 1 }
        }
      });
      syncedCount++;
    }
    
    console.log(`✅ Synced ${syncedCount} step configurations to database`);
  }

  // ============================================================================
  // COMPUTE STEP DEPENDENCIES (Auto-calculate dependents)
  // ============================================================================

  console.log('\n🔗 Computing step dependencies...');
  
  const allStepsWithDeps = await prisma.stepConfiguration.findMany({
    select: {
      stepKey: true,
      dependencies: true
    }
  });
  
  const dependencyGraph = new Map<string, Set<string>>();
  
  // Build forward dependency graph
  allStepsWithDeps.forEach(step => {
    const deps = (step.dependencies as any)?.requiredSteps || [];
    deps.forEach((depKey: string) => {
      if (!dependencyGraph.has(depKey)) {
        dependencyGraph.set(depKey, new Set());
      }
      dependencyGraph.get(depKey)!.add(step.stepKey);
    });
  });
  
  // Update each step with its dependents
  let depsUpdated = 0;
  for (const step of allStepsWithDeps) {
    const dependents = Array.from(dependencyGraph.get(step.stepKey) || []);
    
    if (dependents.length > 0 || (step.dependencies as any)?.requiredSteps) {
      const currentDeps = (step.dependencies as any) || {};
      const updatedDeps = {
        ...currentDeps,
        dependents
      };
      
      await prisma.stepConfiguration.update({
        where: { stepKey: step.stepKey },
        data: { dependencies: updatedDeps as any }
      });
      
      depsUpdated++;
    }
  }
  
  console.log(`✅ Updated dependencies for ${depsUpdated} steps`);

  // ============================================================================
  // INITIALIZE AUDIT STEP STATUSES
  // ============================================================================

  console.log('\n📊 Initializing step statuses for seeded audits...');
  
  // Get all active steps
  const activeSteps = await prisma.stepConfiguration.findMany({
    where: { isActive: true },
    select: {
      stepKey: true,
      phaseId: true,
      stepId: true
    },
    orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
  });
  
  // Get all audits
  const allAudits = await prisma.audit.findMany({
    select: { id: true, name: true }
  });
  
  let totalInitialized = 0;
  
  for (const audit of allAudits) {
    // Check existing statuses
    const existingStatuses = await prisma.auditStepStatus.findMany({
      where: { auditId: audit.id },
      select: { stepKey: true }
    });
    
    const existingStepKeys = new Set(existingStatuses.map(s => s.stepKey));
    
    // Create missing status records
    const newStatuses = activeSteps
      .filter(step => !existingStepKeys.has(step.stepKey))
      .map(step => ({
        auditId: audit.id,
        phaseId: step.phaseId,
        stepId: step.stepId,
        stepKey: step.stepKey,
        status: 'pending'
      }));
    
    if (newStatuses.length > 0) {
      await prisma.auditStepStatus.createMany({
        data: newStatuses
      });
      
      totalInitialized += newStatuses.length;
      console.log(`   ✅ Audit #${audit.id} (${audit.name}): initialized ${newStatuses.length} step statuses`);
    }
  }
  
  console.log(`✅ Initialized ${totalInitialized} step statuses across ${allAudits.length} audits`);

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================

  const counts = {
    audits: await prisma.audit.count(),
    phases: await prisma.auditPhase.count(),
    phaseConfigs: await prisma.phaseConfiguration.count(),
    stepConfigs: await prisma.stepConfiguration.count(),
    stepStatuses: await prisma.auditStepStatus.count(),
    clients: await prisma.client.count(),
    entities: await prisma.entity.count(),
    contacts: await prisma.contact.count(),
    riskAssessments: await prisma.riskAssessment.count(),
    checklistItems: await prisma.checklistItem.count(),
    documents: await prisma.document.count(),
    documentReviews: await prisma.documentReview.count(),
    findings: await prisma.finding.count(),
    evidence: await prisma.evidence.count(),
    recommendations: await prisma.recommendation.count(),
    auditTrail: await prisma.findingAuditTrail.count(),
  };

  console.log('\n✨ Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   Audits:              ${counts.audits}`);
  console.log(`   Phases:              ${counts.phases}`);
  console.log(`   Phase Configs:       ${counts.phaseConfigs}`);
  console.log(`   Step Configs:        ${counts.stepConfigs}`);
  console.log(`   Step Statuses:       ${counts.stepStatuses}`);
  console.log(`   Clients:             ${counts.clients}`);
  console.log(`   Entities:            ${counts.entities}`);
  console.log(`   Contacts:            ${counts.contacts}`);
  console.log(`   Risk Assessments:    ${counts.riskAssessments}`);
  console.log(`   Checklist Items:     ${counts.checklistItems}`);
  console.log(`   Documents:           ${counts.documents}`);
  console.log(`   Document Reviews:    ${counts.documentReviews}`);
  console.log(`   Findings:            ${counts.findings}`);
  console.log(`   Evidence:            ${counts.evidence}`);
  console.log(`   Recommendations:     ${counts.recommendations}`);
  console.log(`   Audit Trail Entries: ${counts.auditTrail}`);
  console.log('\n🎉 You can now explore the data with: npm run prisma:studio\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
