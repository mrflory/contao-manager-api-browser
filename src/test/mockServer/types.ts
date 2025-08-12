// Mock server types
export interface MockState {
  // Server configuration
  serverConfig: {
    php_cli: string;
    cloud: {
      enabled: boolean;
      issues: string[];
    };
  };
  
  phpWeb: {
    version: string;
    version_id: number;
    platform: 'unix' | 'windows';
    problem?: any;
  };
  
  contaoInfo: {
    version: string | null;
    api: {
      version: number;
      features: string[];
    };
    supported: boolean;
    project_dir: string;
    public_dir: string;
  };

  // Self-update information
  selfUpdate: {
    current_version: string;
    latest_version: string;
    channel: 'stable' | 'dev';
    supported: boolean;
    error?: string;
  };

  // Current task state
  currentTask: TaskData | null;
  taskHistory: TaskData[];

  // Database migration state
  currentMigration: MigrationData | null;
  migrationHistory: MigrationData[];
  pendingMigrations: MigrationOperation[];

  // Packages
  rootPackage: PackageInfo;
  localPackages: Record<string, PackageInfo>;

  // Maintenance mode
  maintenanceMode: {
    enabled: boolean;
  };

  // Backups
  backups: BackupInfo[];

  // Scenario-specific settings
  scenarios?: {
    taskFailures?: Record<string, string>; // task name -> error message
    migrationFailures?: boolean;
    networkLatency?: number;
    authErrors?: boolean;
    malformedResponses?: boolean;
  };
}

export interface TaskData {
  id: string;
  title: string;
  status: 'active' | 'complete' | 'paused' | 'error' | 'aborting' | 'stopped';
  console: string;
  cancellable: boolean;
  autoclose: boolean;
  audit: boolean;
  operations?: TaskOperation[];
  sponsor?: {
    name: string;
    link: string;
  };
}

export interface TaskOperation {
  summary: string;
  details: string;
  console: string;
  status: 'active' | 'complete' | 'error' | 'stopped';
}

export interface MigrationData {
  type: 'schema' | 'schema-only' | 'migrations' | 'migrations-only';
  status: 'pending' | 'active' | 'complete' | 'error';
  hash?: string;
  operations?: MigrationOperation[];
}

export interface MigrationOperation {
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  type: string;
  description?: string;
  license?: string | string[];
  authors?: Array<{
    name: string;
    email?: string;
  }>;
  require?: Record<string, string>;
  extra?: any;
}

export interface BackupInfo {
  name: string;
  createdAt: string;
  size: number;
}

// Test scenario configuration
export interface Scenario {
  name: string;
  description: string;
  state: Partial<MockState>;
}

// Scenario collections
export interface ScenarioCollection {
  name: string;
  description: string;
  scenarios: Scenario[];
}