import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function checkDependencies() {
  console.log('📋 Checking StepConfiguration dependencies field...\n');
  
  const steps = await prisma.stepConfiguration.findMany({
    select: {
      stepKey: true,
      stepName: true,
      dependencies: true
    },
    orderBy: [{ phaseId: 'asc' }, { stepId: 'asc' }]
  });
  
  for (const step of steps) {
    console.log(`\n📌 Step: ${step.stepKey} - ${step.stepName}`);
    console.log('   Dependencies:', JSON.stringify(step.dependencies, null, 2));
  }
  
  await prisma.$disconnect();
}

checkDependencies().catch(console.error);
