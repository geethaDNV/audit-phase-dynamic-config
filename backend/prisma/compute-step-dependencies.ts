/**
 * Compute Step Dependencies
 * 
 * This script:
 * 1. Loads all step configurations from the registry
 * 2. Computes reverse dependencies (which steps depend on this step)
 * 3. Syncs all step configurations to the database
 * 
 * Run with: npx ts-node prisma/compute-step-dependencies.ts
 */

import { PrismaClient } from '@prisma/client';

// We need to import from compiled JS or use ts-node to load TypeScript
// For now, we'll implement a simple version that can be run with ts-node

const prisma = new PrismaClient();

async function computeDependencies() {
  console.log('🔄 Computing step dependencies...');
  
  try {
    // For now, we'll update the existing step configurations
    // In a full implementation, this would load from StepRegistry
    
    // Get all step configurations from database
    const steps = await prisma.stepConfiguration.findMany({
      where: { isActive: true }
    });
    
    console.log(`📊 Found ${steps.length} step configurations`);
    
    // Build dependency graph
    const dependencyGraph = new Map<string, Set<string>>();
    
    steps.forEach(step => {
      const deps = step.dependencies as any;
      const requiredSteps = deps?.requiredSteps || [];
      
      requiredSteps.forEach((depKey: string) => {
        if (!dependencyGraph.has(depKey)) {
          dependencyGraph.set(depKey, new Set());
        }
        dependencyGraph.get(depKey)!.add(step.stepKey);
      });
    });
    
    // Update each step with its dependents
    for (const step of steps) {
      const dependents = Array.from(dependencyGraph.get(step.stepKey) || []);
      
      if (dependents.length > 0 || step.dependencies) {
        const currentDeps = step.dependencies as any || {};
        const updatedDeps = {
          ...currentDeps,
          dependents
        };
        
        await prisma.stepConfiguration.update({
          where: { id: step.id },
          data: {
            dependencies: updatedDeps as any
          }
        });
        
        console.log(`✅ Updated step ${step.stepKey}: ${dependents.length} dependents`);
      }
    }
    
    console.log('✅ Step dependencies computed and saved');
    
  } catch (error) {
    console.error('❌ Error computing dependencies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

computeDependencies();
