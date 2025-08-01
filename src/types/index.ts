export interface VersionInfo {
  contaoManagerVersion?: string;
  phpVersion?: string;
  contaoVersion?: string;
  lastUpdated?: string;
}

export interface Site {
  name: string;
  url: string;
  token: string;
  lastUsed: string;
  versionInfo?: VersionInfo;
}

export interface Config {
  sites: { [url: string]: Site };
  activeSite?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UpdateStatus {
  composer?: {
    current_version: string;
    latest_version: string;
  };
  selfUpdate?: {
    current_version: string;
    latest_version: string;
  };
  errors?: {
    composer?: string;
    selfUpdate?: string;
  };
}

export interface TokenInfo {
  scope: string;
  username?: string;
  totp_enabled?: boolean;
}

// Workflow Types
export type WorkflowStepStatus = 'pending' | 'active' | 'complete' | 'error' | 'skipped';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: WorkflowStepStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  data?: unknown;
  conditional?: boolean; // Whether this step can be skipped
  migrationHistory?: MigrationExecutionHistory[]; // Track migration execution cycles
}

export interface WorkflowConfig {
  performDryRun: boolean;
  withDeletes?: boolean; // Execute migrations including DROP queries
  skipComposer?: boolean; // Skip composer dry-run and update steps (for testing)
}

export interface WorkflowState {
  currentStep: number;
  steps: WorkflowStep[];
  isRunning: boolean;
  isPaused: boolean;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  config: WorkflowConfig;
}

// Task API Types
export interface TaskStatus {
  id?: string;
  title?: string;
  console?: string;
  cancellable?: boolean;
  autoclose?: boolean;
  audit?: boolean;
  status: 'active' | 'complete' | 'paused' | 'error' | 'aborting' | 'stopped';
  operations?: Array<{
    summary?: string;
    details?: string;
    console?: string;
    status?: 'active' | 'complete' | 'error' | 'stopped';
  }>;
}

export interface DatabaseMigrationStatus {
  type?: 'schema' | 'schema-only' | 'migrations' | 'migrations-only';
  status: 'pending' | 'active' | 'complete' | 'error';
  operations?: Array<{
    name?: string;
    status?: 'pending' | 'active' | 'complete' | 'error';
    message?: string;
  }>;
  hash?: string;
}

export interface MigrationExecutionHistory {
  cycle: number;
  stepType: 'check' | 'execute';
  timestamp: Date;
  data: DatabaseMigrationStatus;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'active' | 'complete' | 'error';
  error?: string;
}