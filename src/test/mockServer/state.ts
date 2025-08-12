import { MockState } from './types';

export function createDefaultState(): MockState {
  return {
    serverConfig: {
      php_cli: '/usr/bin/php8.2',
      cloud: {
        enabled: true,
        issues: []
      }
    },

    phpWeb: {
      version: '8.2.15',
      version_id: 80215,
      platform: 'unix'
    },

    contaoInfo: {
      version: '5.2.1',
      api: {
        version: 2,
        features: ['contao/database-migration', 'contao/backup', 'contao/maintenance-mode']
      },
      supported: true,
      project_dir: '/var/www/html',
      public_dir: 'public'
    },

    selfUpdate: {
      current_version: '1.9.4',
      latest_version: '1.9.5',
      channel: 'stable',
      supported: true
    },

    currentTask: null,
    taskHistory: [],

    currentMigration: null,
    migrationHistory: [],
    pendingMigrations: [],

    rootPackage: {
      name: 'contao/contao',
      version: '5.2.1',
      type: 'project',
      description: 'Contao Open Source CMS',
      license: 'LGPL-3.0-or-later',
      authors: [
        {
          name: 'Leo Feyer',
          email: 'leo@contao.org'
        }
      ],
      require: {
        'php': '^8.1',
        'contao/core': '^5.2',
        'contao/manager-bundle': '^5.2'
      }
    },

    localPackages: {
      'contao/core': {
        name: 'contao/core',
        version: '5.2.1',
        type: 'library',
        description: 'Contao Core Bundle'
      },
      'contao/manager-bundle': {
        name: 'contao/manager-bundle',
        version: '5.2.1',
        type: 'symfony-bundle',
        description: 'Contao Manager Bundle'
      },
      'symfony/framework-bundle': {
        name: 'symfony/framework-bundle',
        version: '6.4.2',
        type: 'symfony-bundle',
        description: 'Symfony FrameworkBundle'
      }
    },

    maintenanceMode: {
      enabled: false
    },

    backups: [
      {
        name: 'backup_2024_01_15_14_30_00.sql.gz',
        createdAt: '2024-01-15T14:30:00Z',
        size: 2048576
      },
      {
        name: 'backup_2024_01_10_10_15_00.sql.gz', 
        createdAt: '2024-01-10T10:15:00Z',
        size: 1874432
      }
    ]
  };
}