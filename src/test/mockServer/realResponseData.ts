// Real-world response data extracted from production logs
// This provides realistic mock data based on actual Contao Manager API responses

export const realResponseData = {
  // Contao server configuration (from /api/server/contao responses)
  contaoConfig: {
    version: "5.5.11",
    cli: {
      commands: {
        "_complete": { arguments: [], options: ["shell", "input", "current", "api-version", "symfony", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "about": { arguments: [], options: ["help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "cache:clear": { arguments: [], options: ["no-warmup", "no-optional-warmers", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "contao:automator": { arguments: ["task"], options: ["help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "contao:backup:create": { arguments: ["name"], options: ["ignore-tables", "format", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "contao:backup:restore": { arguments: ["name"], options: ["ignore-tables", "format", "force", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "contao:migrate": { arguments: [], options: ["with-deletes", "schema-only", "migrations-only", "dry-run", "format", "no-backup", "hash", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "contao:user:create": { arguments: [], options: ["username", "name", "email", "password", "language", "admin", "group", "change-password", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "composer:install": { arguments: [], options: ["dry-run", "no-dev", "no-autoloader", "no-progress", "optimize-autoloader", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] },
        "composer:update": { arguments: [], options: ["dry-run", "no-dev", "no-autoloader", "no-progress", "optimize-autoloader", "help", "silent", "quiet", "verbose", "version", "ansi", "no-ansi", "no-interaction", "env", "profile"] }
      }
    },
    api: {
      version: 2,
      features: {
        "contao/manager-bundle": {
          "dot-env": ["APP_SECRET", "APP_ENV", "COOKIE_WHITELIST", "DATABASE_URL", "DISABLE_HTTP_CACHE", "MAILER_DSN", "TRACE_LEVEL", "TRUSTED_PROXIES", "TRUSTED_HOSTS"],
          "config": ["disable-packages"],
          "jwt-cookie": ["debug"]
        }
      },
      commands: ["help", "list", "_complete", "completion", "version", "config:get", "config:set", "dot-env:get", "dot-env:set", "dot-env:remove", "jwt-cookie:generate", "jwt-cookie:parse"]
    },
    config: {
      preview_script: "/preview.php",
      messenger: {
        web_worker: {
          transports: ["contao_prio_high", "contao_prio_normal", "contao_prio_low"],
          grace_period: "PT10M"
        },
        workers: [
          { transports: ["contao_prio_high"], options: ["--time-limit=60", "--sleep=5"], autoscale: { desired_size: 5, max: 10, enabled: true, min: 1 } },
          { transports: ["contao_prio_normal"], options: ["--time-limit=60", "--sleep=10"], autoscale: { desired_size: 10, max: 10, enabled: true, min: 1 } },
          { transports: ["contao_prio_low"], options: ["--time-limit=60", "--sleep=20"], autoscale: { desired_size: 20, max: 10, enabled: true, min: 1 } }
        ]
      },
      pretty_error_screens: true,
      backend_search: {
        dsn: "loupe:///var/www/httpdocs/contao/var/loupe",
        enabled: true,
        index_name: "contao_backend"
      },
      csrf_cookie_prefix: "csrf_",
      csrf_token_name: "contao_csrf_token",
      error_level: 6135,
      upload_path: "files",
      editable_files: "css,csv,html,ini,js,json,less,md,scss,svg,svgz,ts,txt,xliff,xml,yml,yaml",
      console_path: "/var/www/httpdocs/contao/bin/console",
      image: {
        bypass_cache: false,
        imagine_options: {
          jpeg_quality: 80,
          jpeg_sampling_factors: [2, 1, 1],
          interlace: "plane"
        },
        imagine_service: null,
        reject_large_uploads: false,
        sizes: [],
        target_dir: "/var/www/httpdocs/contao/assets/images",
        valid_extensions: ["jpg", "jpeg", "gif", "png", "tif", "tiff", "bmp", "svg", "svgz", "webp", "avif"],
        preview_extensions: ["jpg", "jpeg", "gif", "png", "bmp", "svg", "svgz", "webp", "avif"]
      }
    },
    supported: true,
    conflicts: [],
    project_dir: "/var/www/httpdocs/contao",
    public_dir: "public",
    directory_separator: "/"
  },

  // Real package data from production systems
  packages: {
    root: {
      name: "local/website",
      version: "1.0.0-dev",
      type: "project",
      description: "Contao website project",
      license: "proprietary",
      require: {
        "contao/manager-bundle": "5.3.34",
        "contao/core-bundle": "5.3.34",
        "contao/news-bundle": "5.3.34",
        "contao/calendar-bundle": "5.3.34",
        "contao/faq-bundle": "5.3.34",
        "contao/listing-bundle": "5.3.34",
        "oveleon/contao-cookiebar": "^2.1",
        "doctrine/dbal": "^3.8",
        "symfony/clock": "^6.4",
        "guzzlehttp/promises": "^2.0"
      }
    },
    local: {
      "contao/core-bundle": {
        name: "contao/core-bundle",
        version: "5.3.34",
        type: "contao-bundle",
        description: "Contao CMS core bundle",
        license: "LGPL-3.0-or-later",
        authors: [
          { name: "Leo Feyer", email: "leo@contao.org" }
        ],
        require: {
          "php": "^8.1",
          "symfony/framework-bundle": "^6.4",
          "doctrine/dbal": "^3.8"
        },
        extra: {
          "contao-manager-plugin": "Contao\\ManagerBundle\\ContaoManager\\Plugin"
        }
      },
      "contao/manager-bundle": {
        name: "contao/manager-bundle",
        version: "5.3.34",
        type: "contao-bundle",
        description: "Contao Manager bundle",
        license: "LGPL-3.0-or-later",
        authors: [
          { name: "Leo Feyer", email: "leo@contao.org" }
        ]
      },
      "contao/news-bundle": {
        name: "contao/news-bundle",
        version: "5.3.34",
        type: "contao-bundle",
        description: "Contao news bundle",
        license: "LGPL-3.0-or-later"
      },
      "contao/calendar-bundle": {
        name: "contao/calendar-bundle",
        version: "5.3.34",
        type: "contao-bundle", 
        description: "Contao calendar bundle",
        license: "LGPL-3.0-or-later"
      },
      "oveleon/contao-cookiebar": {
        name: "oveleon/contao-cookiebar",
        version: "2.1.5",
        type: "contao-bundle",
        description: "Cookie management for Contao CMS",
        license: "MIT",
        authors: [
          { name: "Oveleon", email: "support@oveleon.de" }
        ]
      },
      "doctrine/dbal": {
        name: "doctrine/dbal",
        version: "3.8.4",
        type: "library",
        description: "Powerful PHP database abstraction layer (DBAL) with many features for database schema introspection and management.",
        license: "MIT"
      },
      "symfony/clock": {
        name: "symfony/clock",
        version: "6.4.8",
        type: "library",
        description: "Decouples applications from the system clock",
        license: "MIT"
      },
      "guzzlehttp/promises": {
        name: "guzzlehttp/promises",
        version: "2.0.2",
        type: "library",
        description: "Guzzle promises library",
        license: "MIT"
      }
    }
  },

  // User data from production
  users: [
    {
      username: "admin",
      scope: "admin",
      passkey: false,
      totp_enabled: true,
      limited: false
    },
    {
      username: "developer", 
      scope: "install",
      passkey: false,
      totp_enabled: false,
      limited: false
    },
    {
      username: "editor",
      scope: "read",
      passkey: false,
      totp_enabled: false,
      limited: true
    }
  ],

  // Server configuration
  serverConfig: {
    php_cli: "/usr/bin/php8.3",
    cloud: {
      enabled: true,
      issues: []
    }
  },

  // PHP Web server info
  phpWeb: {
    version: "8.3.6",
    version_id: 80306,
    platform: "unix" as const,
    problem: null
  },

  // Self-update information with realistic versions
  selfUpdate: {
    current_version: "1.9.4",
    latest_version: "1.9.5",
    channel: "stable" as const,
    supported: true
  },

  // Realistic task operations with console output
  taskOperations: {
    composerUpdate: {
      summary: "Running composer update",
      details: "Updating composer dependencies to latest versions",
      console: `Loading composer repositories with package information
Updating dependencies
Lock file operations: 15 installs, 8 updates, 2 removals
  - Installing contao/core-bundle (5.3.37): Extracting archive
  - Installing contao/news-bundle (5.3.37): Extracting archive
  - Updating doctrine/dbal (3.8.3 => 3.8.4): Extracting archive
  - Updating symfony/clock (6.4.7 => 6.4.8): Extracting archive
Generating optimized autoload files
97 packages you are using are looking for funding.
Use the "composer fund" command to find out more.
Executing script cache:clear [OK]
Executing script assets:install public [OK]`,
      status: "complete" as const
    },
    composerInstall: {
      summary: "Installing composer dependencies",
      details: "Running composer install for dependencies",
      console: `Loading composer repositories with package information
Installing dependencies from lock file
Package operations: 0 installs, 0 updates, 0 removals
Package manifest generated successfully.
Generating optimized autoload files
97 packages you are using are looking for funding.
Use the "composer fund" command to find out more.
Executing script cache:clear [OK]`,
      status: "complete" as const
    },
    contaoMigrate: {
      summary: "Running database migrations",
      details: "Executing pending Contao database migrations",
      console: `Checking database migrations...
Found 3 pending migrations:
  - CreateNewFeatureTable
  - AddEnhancedFieldToContent  
  - UpdateUserPermissions
Executing migrations...
[OK] Migration CreateNewFeatureTable executed successfully
[OK] Migration AddEnhancedFieldToContent executed successfully
[OK] Migration UpdateUserPermissions executed successfully
All migrations completed successfully.`,
      status: "complete" as const
    }
  },

  // Realistic migration operations
  migrationOperations: [
    {
      name: "CREATE TABLE tl_new_feature (id int(10) unsigned NOT NULL auto_increment, tstamp int(10) unsigned NOT NULL default '0', PRIMARY KEY (id))",
      status: "complete" as const,
      message: "Table created successfully"
    },
    {
      name: "ALTER TABLE tl_content ADD enhanced_field varchar(255) NOT NULL default ''",
      status: "complete" as const,
      message: "Column added successfully"
    },
    {
      name: "UPDATE tl_user SET admin=1 WHERE username='admin'",
      status: "complete" as const,
      message: "User permissions updated"
    }
  ],

  // Error responses based on production patterns
  errorResponses: {
    unauthorized: {
      status: 401,
      body: {
        title: "Unauthorized",
        type: "about:blank", 
        status: 401,
        detail: "Authentication credentials are invalid or missing"
      }
    },
    forbidden: {
      status: 403,
      body: {
        title: "Forbidden",
        type: "about:blank",
        status: 403,
        detail: "Access denied. Insufficient permissions for this operation"
      }
    },
    notFound: {
      status: 404,
      body: `<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body>
<h1>Not Found</h1>
<p>The requested resource was not found on this server.</p>
</body>
</html>`
    },
    internalError: {
      status: 500,
      body: {
        title: "Internal Server Error",
        type: "about:blank",
        status: 500,
        detail: "An unexpected error occurred while processing the request"
      }
    },
    notImplemented: {
      status: 501,
      body: {
        title: "Not Implemented",
        type: "about:blank", 
        status: 501,
        detail: "This feature is not supported in the current Contao version"
      }
    },
    serviceUnavailable: {
      status: 503,
      body: {
        title: "Service Unavailable",
        type: "about:blank",
        status: 503,
        detail: "The PHP command line binary cannot be found or the service is temporarily unavailable"
      }
    }
  },

  // Backup information
  backups: [
    {
      name: "backup_2024-06-18_17-30-45.sql",
      createdAt: "2024-06-18T17:30:45.000Z",
      size: 15728640
    },
    {
      name: "backup_2024-06-17_09-15-22.sql", 
      createdAt: "2024-06-17T09:15:22.000Z",
      size: 14563328
    },
    {
      name: "backup_2024-06-16_18-45-12.sql",
      createdAt: "2024-06-16T18:45:12.000Z", 
      size: 14892544
    }
  ]
};

// Helper functions for generating realistic variations
export const generateRealistVariations = {
  // Generate different Contao versions
  contaoVersions: ["5.3.34", "5.3.35", "5.3.36", "5.3.37", "5.4.0", "5.4.1"],
  
  // Generate different package versions
  packageVersions: {
    "contao/core-bundle": ["5.3.34", "5.3.35", "5.3.36", "5.3.37"],
    "doctrine/dbal": ["3.8.3", "3.8.4", "3.8.5"],
    "symfony/clock": ["6.4.7", "6.4.8", "6.4.9"],
    "oveleon/contao-cookiebar": ["2.1.4", "2.1.5", "2.1.6"]
  },
  
  // Generate realistic task durations
  taskDurations: {
    composerUpdate: { min: 30000, max: 180000 },
    composerInstall: { min: 15000, max: 60000 },
    contaoMigrate: { min: 5000, max: 30000 },
    cacheWarmup: { min: 8000, max: 25000 }
  },

  // Generate realistic console output patterns
  consolePatterns: {
    memoryUsage: () => `Memory usage: ${Math.floor(Math.random() * 50 + 20)}MB (peak: ${Math.floor(Math.random() * 80 + 40)}MB)`,
    timing: () => `Finished in ${Math.floor(Math.random() * 120 + 10)}s`,
    packageCount: () => `${Math.floor(Math.random() * 50 + 80)} packages you are using are looking for funding.`
  }
};