import { Request, Response } from 'express';
import { MockState } from '../types';

// Mock file contents for testing
const MOCK_COMPOSER_JSON = JSON.stringify({
  "name": "contao/managed-edition",
  "type": "project",
  "description": "Contao Managed Edition",
  "license": "LGPL-3.0-or-later",
  "authors": [
    {
      "name": "Contao Community",
      "homepage": "https://contao.org"
    }
  ],
  "require": {
    "php": "^8.1",
    "contao/manager-bundle": "4.13.*",
    "contao/conflicts": "*@dev",
    "contao/core-bundle": "^5.3",
    "contao/installation-bundle": "^5.3"
  },
  "require-dev": {
    "contao/manager-plugin": "^2.3.1"
  },
  "conflict": {
    "contao-components/installer": "<1.0.6"
  },
  "extra": {
    "contao-component-dir": "assets",
    "public-dir": "public",
    "contao": {
      "sources": {
        "contao/core-bundle": "system/modules/core",
        "contao/installation-bundle": "system/modules/installation"
      }
    }
  },
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  },
  "scripts": {
    "post-install-cmd": [
      "Contao\\ManagerBundle\\Composer\\ScriptHandler::initializeApplication"
    ],
    "post-update-cmd": [
      "Contao\\ManagerBundle\\Composer\\ScriptHandler::initializeApplication"
    ]
  },
  "prefer-stable": true,
  "minimum-stability": "dev"
}, null, 2);

const MOCK_COMPOSER_LOCK = JSON.stringify({
  "_readme": [
    "This file locks the dependencies of your project to a known state",
    "Read more about it at https://getcomposer.org/doc/01-basic-usage.md#installing-dependencies"
  ],
  "content-hash": "5c3c5d4b2f1234567890abcdef1234567890abcd",
  "packages": [
    {
      "name": "contao/core-bundle",
      "version": "5.3.15",
      "source": {
        "type": "git",
        "url": "https://github.com/contao/core-bundle.git",
        "reference": "abc123def456789012345678901234567890abcd"
      },
      "dist": {
        "type": "zip",
        "url": "https://api.github.com/repos/contao/core-bundle/zipball/abc123def456789012345678901234567890abcd",
        "reference": "abc123def456789012345678901234567890abcd",
        "shasum": ""
      },
      "require": {
        "php": "^8.1",
        "symfony/framework-bundle": "^6.4 || ^7.0"
      },
      "type": "symfony-bundle",
      "autoload": {
        "psr-4": {
          "Contao\\CoreBundle\\": "src/"
        }
      },
      "license": [
        "LGPL-3.0-or-later"
      ],
      "description": "Contao CMS core bundle"
    },
    {
      "name": "contao/installation-bundle",
      "version": "5.3.15",
      "source": {
        "type": "git",
        "url": "https://github.com/contao/installation-bundle.git",
        "reference": "def456789012345678901234567890abcdef456"
      },
      "dist": {
        "type": "zip",
        "url": "https://api.github.com/repos/contao/installation-bundle/zipball/def456789012345678901234567890abcdef456",
        "reference": "def456789012345678901234567890abcdef456",
        "shasum": ""
      },
      "require": {
        "php": "^8.1",
        "contao/core-bundle": "^5.3"
      },
      "type": "symfony-bundle",
      "autoload": {
        "psr-4": {
          "Contao\\InstallationBundle\\": "src/"
        }
      },
      "license": [
        "LGPL-3.0-or-later"
      ],
      "description": "Contao CMS installation bundle"
    }
  ],
  "packages-dev": [],
  "aliases": [],
  "minimum-stability": "dev",
  "stability-flags": [],
  "prefer-stable": true,
  "prefer-lowest": false,
  "platform": {
    "php": "^8.1"
  },
  "platform-dev": [],
  "plugin-api-version": "2.6.0"
}, null, 2);

export const filesHandlers = {
  getFile: (_getState: () => MockState) => {
    return (req: Request, res: Response) => {
      const { filename } = req.params;
      
      console.log(`[MOCK] GET /api/files/${filename} - Fetching file content`);
      
      // Return mock file content based on filename
      switch (filename) {
        case 'composer.json':
          res.setHeader('Content-Type', 'application/json');
          return res.send(MOCK_COMPOSER_JSON);
          
        case 'composer.lock':
          res.setHeader('Content-Type', 'application/json');
          return res.send(MOCK_COMPOSER_LOCK);
          
        default:
          return res.status(404).json({
            title: 'File not found',
            detail: `File '${filename}' does not exist or is not accessible`
          });
      }
    };
  }
};