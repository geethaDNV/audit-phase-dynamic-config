import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestAudit(documentCount: number): Promise<number> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Creating audit with ${documentCount} documents`);
  console.log('='.repeat(60));

  // Create audit
  const audit = await prisma.audit.create({
    data: {
      name: `Threshold Test - ${documentCount} Documents`,
      status: 'in-progress',
      startedAt: new Date(),
      description: `Testing hybrid validation with ${documentCount} documents`
    }
  });
  console.log(`✅ Audit ID: ${audit.id}`);

  // Create client
  await prisma.client.create({
    data: {
      auditId: audit.id,
      name: `Test Client ${documentCount}`,
      email: `test${documentCount}@example.com`,
      industry: 'Technology'
    }
  });
  console.log(`✅ Client created`);

  // Create documents
  const documents = Array.from({ length: documentCount }, (_, i) => ({
    auditId: audit.id,
    title: `Document ${i + 1}`,
    fileName: `doc${i + 1}.pdf`,
    documentType: 'Financial Statement' as any,
    fileType: 'pdf',
    fileSize: 1024 * (i + 1),
    filePath: `/documents/audit_${audit.id}/doc${i + 1}.pdf`,
    uploadedAt: new Date()
  }));

  await prisma.document.createMany({ data: documents });
  console.log(`✅ ${documentCount} documents created`);

  // Mark steps as completed
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
        phaseId: 2,
        stepId: 1,
        stepKey: '2-1',
        status: 'completed',
        completedAt: new Date()
      }
    ]
  });

  // Determine expected strategy
  const threshold = 100;
  const expectedStrategy = documentCount < threshold ? 'preloaded' : 'direct-db';
  const expectedLog = documentCount < threshold
    ? `✅ Pre-loaded ${documentCount} document(s)`
    : `⚡ Using direct DB validation for ${documentCount} document(s)`;

  console.log(`\n📈 Expected Behavior:`);
  console.log(`   Threshold: ${threshold}`);
  console.log(`   Documents: ${documentCount}`);
  console.log(`   Strategy: ${expectedStrategy}`);
  console.log(`   Expected Log: "${expectedLog}"`);

  return audit.id;
}

async function runThresholdTests() {
  console.log('🧪 Hybrid Validation Threshold Testing\n');
  console.log('This script creates audits with varying document counts');
  console.log('to test the auto strategy threshold (default: 100)\n');

  const testCases = [
    { count: 10, description: 'Very small dataset' },
    { count: 50, description: 'Small dataset' },
    { count: 99, description: 'Just below threshold' },
    { count: 100, description: 'At threshold (boundary)' },
    { count: 101, description: 'Just above threshold' },
    { count: 200, description: 'Large dataset' },
    { count: 500, description: 'Very large dataset' }
  ];

  const auditIds: { count: number; id: number; strategy: string }[] = [];

  for (const testCase of testCases) {
    console.log(`\n🔍 Test: ${testCase.description}`);
    const auditId = await createTestAudit(testCase.count);
    const strategy = testCase.count < 100 ? 'preload' : 'direct-db';
    auditIds.push({ count: testCase.count, id: auditId, strategy });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 All test audits created!');
  console.log('='.repeat(60));
  console.log('\n📋 Summary:\n');

  console.log('| Documents | Audit ID | Expected Strategy | Expected Log |');
  console.log('|-----------|----------|-------------------|--------------|');
  auditIds.forEach(({ count, id, strategy }) => {
    const log = strategy === 'preload'
      ? `✅ Pre-loaded ${count} document(s)`
      : `⚡ Direct DB for ${count} document(s)`;
    console.log(`| ${count.toString().padEnd(9)} | ${id.toString().padEnd(8)} | ${strategy.padEnd(17)} | ${log} |`);
  });

  console.log('\n\n🧪 How to Test:\n');
  console.log('1. Start your backend server:');
  console.log('   cd backend && npm run dev\n');
  console.log('2. For each audit, create a Finding and watch the logs:\n');

  auditIds.forEach(({ count, id }) => {
    console.log(`   # Test ${count} documents (Audit ${id})`);
    console.log(`   curl -X POST http://localhost:3001/api/step/save \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{`);
    console.log(`       "auditId": ${id},`);
    console.log(`       "phaseId": 2,`);
    console.log(`       "stepId": 3,`);
    console.log(`       "data": {`);
    console.log(`         "title": "Test Finding for ${count} docs",`);
    console.log(`         "severity": "Medium",`);
    console.log(`         "evidence": [{ "documentId": 1, "description": "Test" }]`);
    console.log(`       }`);
    console.log(`     }'\n`);
  });

  console.log('3. Check server logs for strategy messages:\n');
  console.log('   - Look for "✅ Pre-loaded" or "⚡ Using direct DB validation"');
  console.log('   - Verify the switch happens at 100 documents\n');

  console.log('4. Expected Results:\n');
  console.log('   - < 100 docs: Pre-loaded strategy');
  console.log('   - >= 100 docs: Direct DB strategy\n');

  console.log('='.repeat(60));
}

// Run the tests
runThresholdTests()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
