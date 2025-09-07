import { Request } from 'express';

export interface ApiRequest extends Request {
  body: any;
  params: any;
  query: any;
  headers: any;
}

export interface LogEntry {
  timestamp: string;
  method: string;
  endpoint: string;
  statusCode: number;
  requestData?: any;
  responseData?: any;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  siteUrl: string;
  startTime: string;
  endTime?: string;
  status: 'started' | 'completed' | 'failed' | 'cancelled' | 'finished' | 'error';
  steps: WorkflowStep[];
  workflowType: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  title: string;
  description: string;
  summary?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  error?: string;
  data?: any;
}

export interface ProxyConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  timeout: number;
  validateStatus: (status: number) => boolean;
  data?: any;
  headers?: Record<string, string>;
}

export interface UpdateStatusResult {
  composer: any;
  selfUpdate: any;
  errors: {
    composer?: string;
    selfUpdate?: string;
  };
}

export interface VersionInfoResult {
  contaoManagerVersion?: string | null;
  phpVersion?: string | null;
  contaoVersion?: string | null;
  lastUpdated: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  siteUrl: string;
  hostname: string;
}

export interface HistoryResponse {
  success: boolean;
  history: HistoryEntry[];
  total: number;
  siteUrl: string;
}

export interface CreateHistoryRequest {
  siteUrl: string;
  workflowType: string;
}

export interface UpdateHistoryRequest {
  siteUrl: string;
  status?: string;
  endTime?: string;
  steps?: WorkflowStep[];
}

export interface SnapshotMetadata {
  id: string;
  siteUrl: string;
  timestamp: string;
  files: {
    'composer.json'?: {
      size: number;
      exists: boolean;
    };
    'composer.lock'?: {
      size: number;
      exists: boolean;
    };
  };
  workflowId?: string;
  stepId?: string;
}

export interface CreateSnapshotRequest {
  siteUrl: string;
  composerJson?: string;
  composerLock?: string;
  workflowId?: string;
  stepId?: string;
}

export interface SnapshotListResponse {
  success: boolean;
  snapshots: SnapshotMetadata[];
  total: number;
  siteUrl: string;
  error?: string;
}

export interface MaintenanceMode {
  enabled: boolean;
}

export type HistoryStep = WorkflowStep;

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed';