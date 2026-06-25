import { PrismaClient } from '@prisma/client';
import { BaseStepRepository } from './base/base-step.repository';
import { GenericStepRepository } from './generic/generic-step.repository';
import { Step2Repository } from './custom/step2.repository';
import { Step3Repository } from './custom/step3.repository';
import { DocumentRepository } from './domain/document.repository';
import { FindingRepository } from './domain/finding.repository';
import { ClientRepository } from './domain/client.repository';
import { EntityRepository } from './domain/entity.repository';

/**
 * Repository Registry
 * 
 * Central registry for all step repositories.
 * Enables dynamic repository resolution based on config metadata.
 * 
 * This eliminates hardcoded if/else chains in the service layer.
 * Simply specify `repositoryClass: 'RepositoryName'` in your config!
 */
export class RepositoryRegistry {
  private repositories: Map<string, BaseStepRepository> = new Map();
  private genericRepo: GenericStepRepository;

  constructor(private prisma: PrismaClient) {
    this.genericRepo = new GenericStepRepository(prisma);
    this.registerRepositories();
  }

  /**
   * Register all custom repositories
   * Adding a new repository? Just import it and call register()
   */
  private registerRepositories(): void {
    this.register('Step2Repository', new Step2Repository());
    this.register('Step3Repository', new Step3Repository(this.prisma));
    this.register('DocumentRepository', new DocumentRepository(this.prisma));
    this.register('FindingRepository', new FindingRepository(this.prisma));
    this.register('ClientRepository', new ClientRepository(this.prisma));
    this.register('EntityRepository', new EntityRepository(this.prisma));
    
    console.log(`✅ Repository Registry initialized with ${this.repositories.size} custom repositories`);
  }

  /**
   * Register a single repository
   */
  private register(name: string, repository: BaseStepRepository): void {
    this.repositories.set(name, repository);
  }

  /**
   * Get a custom repository by name
   * @throws Error if repository not found
   */
  public getRepository(repositoryClass: string): BaseStepRepository {
    const repo = this.repositories.get(repositoryClass);
    
    if (!repo) {
      throw new Error(`Repository '${repositoryClass}' not found in registry. Available: ${Array.from(this.repositories.keys()).join(', ')}`);
    }
    
    return repo;
  }

  /**
   * Get the generic repository (used for standard CRUD)
   */
  public getGenericRepository(): GenericStepRepository {
    return this.genericRepo;
  }

  /**
   * Check if a custom repository exists
   */
  public hasRepository(repositoryClass: string): boolean {
    return this.repositories.has(repositoryClass);
  }
}
