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
    cli: {
      commands: Record<string, {
        arguments: string[];
        options: string[];
      }>;
    };
    api: {
      version: number;
      features: Record<string, {
        'dot-env'?: string[];
        'config'?: string[];
        'jwt-cookie'?: string[];
      }>;
      commands: string[];
    };
    config: {
      preview_script: string;
      messenger: {
        web_worker: {
          transports: string[];
          grace_period: string;
        };
        workers: Array<{
          transports: string[];
          options: string[];
          autoscale: {
            desired_size: number;
            max: number;
            enabled: boolean;
            min: number;
          };
        }>;
      };
      pretty_error_screens: boolean;
      backend_search: {
        dsn: string;
        enabled: boolean;
        index_name: string;
      };
      csrf_cookie_prefix: string;
      csrf_token_name: string;
      error_level: number;
      upload_path: string;
      editable_files: string;
      console_path: string;
      image: {
        bypass_cache: boolean;
        imagine_options: {
          jpeg_quality: number;
          jpeg_sampling_factors: number[];
          interlace: string;
        };
        imagine_service: any;
        reject_large_uploads: boolean;
        sizes: any[];
        target_dir: string;
        valid_extensions: string[];
        preview_extensions?: string[];
      };
    };
    supported: boolean;
    conflicts: string[];
    project_dir: string;
    public_dir: string;
    directory_separator: '/' | '\\';
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

  // Users
  users: UserInfo[];

  // Scenario-specific settings
  scenarios?: {
    taskFailures?: Record<string, string>; // task name -> error message
    migrationFailures?: boolean;
    multipleMigrationCycles?: boolean;
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

export interface UserInfo {
  username: string;
  scope: 'admin' | 'install' | 'update' | 'read';
  passkey: boolean;
  totp_enabled: boolean;
  limited: boolean;
}

export interface ErrorResponse {
  status: number;
  body: any;
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