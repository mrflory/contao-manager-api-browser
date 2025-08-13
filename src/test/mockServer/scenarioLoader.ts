import { Scenario, ScenarioCollection } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ScenarioLoader {
  private scenariosPath: string;
  private loadedScenarios: Map<string, Scenario> = new Map();
  private collections: Map<string, ScenarioCollection> = new Map();

  constructor(scenariosPath?: string) {
    this.scenariosPath = scenariosPath || path.join(__dirname, '../scenarios');
  }

  /**
   * Load all scenario files from the scenarios directory
   */
  async loadAllScenarios(): Promise<void> {
    try {
      const files = fs.readdirSync(this.scenariosPath)
        .filter(file => file.endsWith('.json'));

      for (const file of files) {
        await this.loadScenarioFile(file);
      }

      console.log(`[ScenarioLoader] Loaded ${this.loadedScenarios.size} scenarios from ${files.length} files`);
    } catch (error) {
      console.error('[ScenarioLoader] Error loading scenarios:', error);
      throw error;
    }
  }

  /**
   * Load scenarios from a specific file
   */
  async loadScenarioFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.scenariosPath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      const collection: ScenarioCollection = JSON.parse(content);

      // Store the collection
      const collectionKey = path.basename(filename, '.json');
      this.collections.set(collectionKey, collection);

      // Store individual scenarios with prefixed keys
      for (const scenario of collection.scenarios) {
        const key = `${collectionKey}.${scenario.name}`;
        this.loadedScenarios.set(key, scenario);
      }

      console.log(`[ScenarioLoader] Loaded ${collection.scenarios.length} scenarios from ${filename}`);
    } catch (error) {
      console.error(`[ScenarioLoader] Error loading ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific scenario by key
   */
  getScenario(key: string): Scenario | undefined {
    return this.loadedScenarios.get(key);
  }

  /**
   * Get all scenarios from a collection
   */
  getCollection(collectionName: string): Scenario[] | undefined {
    const collection = this.collections.get(collectionName);
    return collection?.scenarios;
  }

  /**
   * List all available scenario keys
   */
  listScenarios(): string[] {
    return Array.from(this.loadedScenarios.keys());
  }

  /**
   * Get all loaded scenarios
   */
  getAllScenarios(): Scenario[] {
    return Array.from(this.loadedScenarios.values());
  }

  /**
   * List all collection names
   */
  listCollections(): string[] {
    return Array.from(this.collections.keys());
  }

  /**
   * Search scenarios by partial name match
   */
  searchScenarios(searchTerm: string): Scenario[] {
    const results: Scenario[] = [];
    
    this.loadedScenarios.forEach((scenario, key) => {
      if (key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          scenario.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push(scenario);
      }
    });

    return results;
  }

  /**
   * Get scenarios by tags or properties
   */
  getScenariosBy(predicate: (scenario: Scenario) => boolean): Scenario[] {
    const results: Scenario[] = [];
    
    this.loadedScenarios.forEach((scenario) => {
      if (predicate(scenario)) {
        results.push(scenario);
      }
    });

    return results;
  }

  /**
   * Get happy path scenarios (no error configurations)
   */
  getHappyPathScenarios(): Scenario[] {
    return this.getScenariosBy(scenario => 
      !scenario.state.scenarios?.taskFailures &&
      !scenario.state.scenarios?.migrationFailures &&
      !scenario.state.scenarios?.authErrors
    );
  }

  /**
   * Get error scenarios (have error configurations)  
   */
  getErrorScenarios(): Scenario[] {
    return this.getScenariosBy(scenario =>
      !!(scenario.state.scenarios?.taskFailures ||
         scenario.state.scenarios?.migrationFailures ||
         scenario.state.scenarios?.authErrors ||
         scenario.state.currentTask?.status === 'error' ||
         scenario.state.currentMigration?.status === 'error')
    );
  }

  /**
   * Create a dynamic scenario for testing
   */
  createDynamicScenario(name: string, description: string, stateOverrides: any): Scenario {
    return {
      name,
      description,
      state: stateOverrides
    };
  }

  /**
   * Validate scenario structure
   */
  validateScenario(scenario: Scenario): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scenario.name || typeof scenario.name !== 'string') {
      errors.push('Scenario must have a valid name');
    }

    if (!scenario.description || typeof scenario.description !== 'string') {
      errors.push('Scenario must have a valid description');
    }

    if (!scenario.state || typeof scenario.state !== 'object') {
      errors.push('Scenario must have a state object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const scenarioLoader = new ScenarioLoader();