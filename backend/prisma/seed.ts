import { PrismaClient } from '@prisma/client';

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
  await prisma.stepConfiguration.deleteMany();
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
    },
  });

  const client2 = await prisma.client.create({
    data: {
      auditId: audit2.id,
      name: 'TechStart Inc',
      email: 'info@techstart.io',
      industry: 'Finance',
      phone: '+1 (555) 987-6543',
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
      registrationNumber: 'C-2020-12345',
      isActive: true,
    },
  });

  const entity2 = await prisma.entity.create({
    data: {
      clientId: client1.id,
      name: 'Acme Subsidiary LLC',
      type: 'llc',
      registrationNumber: 'L-2022-67890',
      isActive: true,
    },
  });

  await prisma.entity.create({
    data: {
      clientId: client2.id,
      name: 'TechStart Inc',
      type: 'corporation',
      registrationNumber: 'C-2025-54321',
      isActive: true,
    },
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

  console.log('✅ Creating checklist items (Step 4)...');

  await prisma.checklistItem.createMany({
    data: [
      {
        auditId: audit1.id,
        phaseId: 2,
        stepId: 4,
        description: 'Review all bank reconciliations for Q4 2025',
        status: 'completed',
        notes: 'All reconciliations reviewed and approved',
        sortOrder: 1,
        completedAt: new Date('2026-02-01'),
      },
      {
        auditId: audit1.id,
        phaseId: 2,
        stepId: 4,
        description: 'Verify accounts receivable aging report',
        status: 'in-progress',
        notes: 'Currently reviewing outstanding balances over 90 days',
        sortOrder: 2,
      },
      {
        auditId: audit1.id,
        phaseId: 2,
        stepId: 4,
        description: 'Test internal controls for revenue recognition',
        status: 'pending',
        sortOrder: 3,
      },
      {
        auditId: audit1.id,
        phaseId: 2,
        stepId: 4,
        description: 'Analyze inventory valuation methods',
        status: 'pending',
        sortOrder: 4,
      },
      {
        auditId: audit1.id,
        phaseId: 2,
        stepId: 4,
        description: 'Confirm related party transactions',
        status: 'blocked',
        notes: 'Waiting for client to provide complete transaction list',
        sortOrder: 5,
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
      fileName: 'Financial_Statements_Q4_2025.pdf',
      fileType: 'PDF',
      fileSize: 2048576,
      filePath: '/uploads/audit1/financial_statements.pdf',
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
      fileName: 'Bank_Reconciliation_December.xlsx',
      fileType: 'Excel',
      fileSize: 512000,
      filePath: '/uploads/audit1/bank_recon.xlsx',
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
      fileName: 'Internal_Controls_Documentation.pdf',
      fileType: 'PDF',
      fileSize: 3145728,
      filePath: '/uploads/audit1/controls.pdf',
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
  // FINAL SUMMARY
  // ============================================================================

  const counts = {
    audits: await prisma.audit.count(),
    phases: await prisma.auditPhase.count(),
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
