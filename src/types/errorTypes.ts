export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'composer'
  | 'migration'
  | 'manager'
  | 'validation'
  | 'system'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConsoleOutputLine {
  content: string;
  type: 'command' | 'output' | 'error' | 'warning' | 'success' | 'info';
  timestamp?: string;
  level?: number;
}

export interface ConsoleOutput {
  lines: ConsoleOutputLine[];
  rawOutput: string;
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
}

export interface ErrorRecoveryAction {
  label: string;
  description: string;
  action: 'retry' | 'skip' | 'abort' | 'manual' | 'external';
  url?: string;
  callback?: () => void | Promise<void>;
}

export interface EnhancedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  summary: string;
  message: string;
  details?: string;
  context?: Record<string, any>;
  consoleOutput?: ConsoleOutput;
  recoveryActions?: ErrorRecoveryAction[];
  timestamp: Date;
  operationType?: string;
  stepIndex?: number;
}

export interface WorkflowErrorSummary {
  totalErrors: number;
  criticalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  latestError?: EnhancedError;
  canRetry: boolean;
  canSkip: boolean;
}

export interface LegacyErrorCompat {
  error?: string;
  enhancedError?: EnhancedError;
}