/**
 * Storage abstraction layer for Contao Manager API
 *
 * This module provides a pluggable storage system that supports different backends:
 * - JSON file storage (default, Phase 0)
 * - PostgreSQL database (Phase 1 SaaS)
 */

// Core interfaces and types
export {
  SiteConfigStorage,
  StorageType,
  StorageConfig,
  StorageResult,
  AddSiteParams,
  UpdateSiteParams,
  BaseStorage
} from './interfaces';

// Storage implementations
export { JsonFileStorage } from './JsonFileStorage';
export { JsonFileStorageUnified } from './JsonFileStorageUnified';
export { DatabaseStorage } from './DatabaseStorage';

// Factory for storage creation
export { StorageFactory } from './StorageFactory';

// Re-export config types for convenience
export {
  AppConfig,
  SiteConfig,
  VersionInfo,
  AuthMethod
} from '../types';

