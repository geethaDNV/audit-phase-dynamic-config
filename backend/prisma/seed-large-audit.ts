import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLargeAudit() {
  console.log('🌱 Seeding large audit for hybrid validation testing...\n');

  try {
    // 1. Create audit
    const audit = await prisma.audit.create({
      data: {
        name: 'Large Audit - Hybrid Validation Test',
        status: 'in-progress',
        startedAt: new Date('2026-01-01'),
        description: 'Test audit with 150+ documents to verify direct DB validation strategy'
      }
    });
    console.log(`✅ Created audit: ${audit.id}`);

    // 2. Create client
    const client = await prisma.client.create({
      data: {
        auditId: audit.id,
        name: 'Large Corporation Inc.',
        email: 'contact@largecorp.com',
        industry: 'Finance',
        phone: '+1-555-0100',
        address: '123 Enterprise Blvd, Business City, ST 12345',
        website: 'https://www.largecorp.com',
        taxId: '12-3456789',
        fiscalYearEnd: new Date('2025-12-31')
      }
    });
    console.log(`✅ Created client: ${client.id} (${client.name})`);

    // 3. Create entities
    const entities = await prisma.entity.createMany({
      data: [
        {
          clientId: client.id,
          name: 'Main Operating Entity',
          type: 'Corporation',
          registrationNumber: 'REG001',
          isActive: true
        },
        {
          clientId: client.id,
          name: 'Subsidiary A',
          type: 'Subsidiary',
          registrationNumber: 'REG002',
          isActive: true
        },
        {
          clientId: client.id,
          name: 'Subsidiary B',
          type: 'Subsidiary',
          registrationNumber: 'REG003',
          isActive: true
        }
      ]
    });
    console.log(`✅ Created ${entities.count} entities`);

    // 4. Create 150 documents (triggers direct DB strategy - threshold is 100)
    console.log('\n📄 Creating 150 documents (this will trigger direct DB validation)...');
    const documentTypes = ['Financial Statement', 'Compliance Report', 'Internal Memo', 'External Communication', 'Supporting Evidence'];
    const documents = [];
    
    for (let i = 1; i <= 150; i++) {
      documents.push({
        auditId: audit.id,
        title: `Document ${i.toString().padStart(3, '0')} - ${documentTypes[i % 5]}`,
        fileName: `doc_${i.toString().padStart(3, '0')}.pdf`,
        documentType: documentTypes[i % 5],
        fileType: 'pdf',
        fileSize: 1024 * (10 + i), // Varying sizes
        filePath: `/documents/audit_${audit.id}/doc_${i.toString().padStart(3, '0')}.pdf`,
        description: `Test document ${i} for large audit validation`,
        isConfidential: i % 10 === 0, // Every 10th doc is confidential
        uploadedAt: new Date()
      });
    }
    
    await prisma.document.createMany({ data: documents });
    console.log(`✅ Created 150 documents`);

    // 5. Create checklist items
    const checklistItems = await prisma.checklistItem.createMany({
      data: [
        {
          auditId: audit.id,
          title: 'Review Financial Statements',
          description: 'Verify all financial statements are complete and accurate',
          category: 'Financial',
          priority: 'High',
          isCompleted: false
        },
        {
          auditId: audit.id,
          title: 'Compliance Check',
          description: 'Ensure all regulatory requirements are met',
          category: 'Compliance',
          priority: 'Critical',
          isCompleted: false
        },
        {
          auditId: audit.id,
          title: 'IT Systems Review',
          description: 'Audit IT infrastructure and security',
          category: 'IT',
          priority: 'Medium',
          isCompleted: false
        }
      ]
    });
    console.log(`✅ Created ${checklistItems.count} checklist items`);

    // 6. Mark prerequisite steps as completed
    await prisma.auditStepStatus.createMany({
      data: [
        {
          auditId: audit.id,
          phaseId: 1,
          stepId: 1,
          stepKey: '1-1',
          status: 'completed',
          completedAt: new Date()
        },
        {
          auditId: audit.id,
          phaseId: 1,
          stepId: 2,
          stepKey: '1-2',
          status: 'completed',
          completedAt: new Date()
        },
        {
          auditId: audit.id,
          phaseId: 2,
          stepId: 1,
          stepKey: '2-1',
          status: 'completed',
          completedAt: new Date()
        }
      ]
    });
    console.log(`✅ Marked prerequisite steps as completed`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Large audit created successfully!');
    console.log('='.repeat(60));
    console.log(`Audit ID: ${audit.id}`);
    console.log(`Client ID: ${client.id}`);
    console.log(`Documents: 150 (WILL trigger direct DB validation - threshold: 100)`);
    console.log(`\n📊 Expected Behavior:`);
    console.log(`   When validating against documents:`);
    console.log(`   - Count: 150 documents`);
    console.log(`   - Strategy: direct-db (150 >= 100)`);
    console.log(`   - Log: "⚡ Using direct DB validation for 150 document(s)"`);
    console.log(`   - Memory: Minimal (no pre-loading)`);
    console.log(`\n🧪 Test by creating a Finding (Step 2-3):`);
    console.log(`   POST /api/step/save`);
    console.log(`   {`);
    console.log(`     "auditId": ${audit.id},`);
    console.log(`     "phaseId": 2,`);
    console.log(`     "stepId": 3,`);
    console.log(`     "data": {`);
    console.log(`       "title": "Test Finding",`);
    console.log(`       "severity": "High",`);
    console.log(`       "evidence": [`);
    console.log(`         { "documentId": 1, "description": "Reference to first document" }`);
    console.log(`       ]`);
    console.log(`     }`);
    console.log(`   }`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error seeding large audit:', error);
    throw error;
  }
}

// Run the seed
seedLargeAudit()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
