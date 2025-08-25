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
      version: '5.5.11',
      cli: {
        commands: {
          'cache:clear': { arguments: [], options: ['no-warmup', 'help'] },
          'contao:migrate': { arguments: [], options: ['dry-run', 'help'] },
          'contao:backup:create': { arguments: ['name'], options: ['help'] }
        }
      },
      api: {
        version: 2,
        features: {
          'contao/manager-bundle': {
            'dot-env': ['APP_SECRET', 'DATABASE_URL'],
            'config': ['disable-packages'],
            'jwt-cookie': ['debug']
          }
        },
        commands: ['help', 'config:get', 'jwt-cookie:generate']
      },
      config: {
        preview_script: '/preview.php',
        messenger: {
          web_worker: {
            transports: ['contao_prio_high', 'contao_prio_normal'],
            grace_period: 'PT10M'
          },
          workers: []
        },
        pretty_error_screens: true,
        backend_search: {
          dsn: 'loupe:///var/www/contao/var/loupe',
          enabled: true,
          index_name: 'contao_backend'
        },
        csrf_cookie_prefix: 'csrf_',
        csrf_token_name: 'contao_csrf_token',
        error_level: 6135,
        upload_path: 'files',
        editable_files: 'css,js,html,xml',
        console_path: '/var/www/contao/bin/console',
        image: {
          bypass_cache: false,
          imagine_options: {
            jpeg_quality: 80,
            jpeg_sampling_factors: [2, 1, 1],
            interlace: 'plane'
          },
          imagine_service: null,
          reject_large_uploads: false,
          sizes: [],
          target_dir: '/var/www/contao/assets/images',
          valid_extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
          preview_extensions: ['jpg', 'jpeg', 'png', 'gif']
        }
      },
      supported: true,
      conflicts: [],
      project_dir: '/var/www/contao',
      public_dir: 'public',
      directory_separator: '/'
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
    ],

    users: [
      {
        username: 'admin',
        scope: 'admin',
        passkey: false,
        totp_enabled: true,
        limited: false
      },
      {
        username: 'developer',
        scope: 'install',
        passkey: false,
        totp_enabled: false,
        limited: false
      }
    ]
  };
}