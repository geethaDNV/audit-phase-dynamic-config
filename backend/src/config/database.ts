import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * Ensures only one instance of PrismaClient is created across the application
 * This prevents connection pool exhaustion in development with hot-reloading
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * Disconnects Prisma Client when the application terminates
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
