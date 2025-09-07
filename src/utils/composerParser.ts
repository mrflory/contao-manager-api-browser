export interface ComposerPackage {
  name: string;
  version: string;
  type?: string;
  description?: string;
  homepage?: string;
  license?: string | string[];
  source?: {
    url: string;
    type: string;
    reference: string;
  };
  dist?: {
    url: string;
    type: string;
    reference: string;
  };
}

export interface ParsedComposerData {
  packages: ComposerPackage[];
  devPackages: ComposerPackage[];
  totalCount: number;
}

/**
 * Parse composer.json file content
 */
export function parseComposerJson(content: string): ParsedComposerData {
  try {
    const data = JSON.parse(content);
    const packages: ComposerPackage[] = [];
    const devPackages: ComposerPackage[] = [];

    // Parse require section
    if (data.require && typeof data.require === 'object') {
      for (const [name, version] of Object.entries(data.require)) {
        if (typeof version === 'string') {
          packages.push({
            name,
            version,
            type: 'library', // Default type for composer.json
          });
        }
      }
    }

    // Parse require-dev section
    if (data['require-dev'] && typeof data['require-dev'] === 'object') {
      for (const [name, version] of Object.entries(data['require-dev'])) {
        if (typeof version === 'string') {
          devPackages.push({
            name,
            version,
            type: 'library', // Default type for composer.json
          });
        }
      }
    }

    return {
      packages,
      devPackages,
      totalCount: packages.length + devPackages.length,
    };
  } catch (error) {
    throw new Error(`Failed to parse composer.json: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Parse composer.lock file content
 */
export function parseComposerLock(content: string): ParsedComposerData {
  try {
    const data = JSON.parse(content);
    const packages: ComposerPackage[] = [];
    const devPackages: ComposerPackage[] = [];

    // Parse packages array
    if (Array.isArray(data.packages)) {
      for (const pkg of data.packages) {
        if (pkg.name && pkg.version) {
          packages.push({
            name: pkg.name,
            version: pkg.version,
            type: pkg.type || 'library',
            description: pkg.description,
            homepage: pkg.homepage,
            license: pkg.license,
            source: pkg.source,
            dist: pkg.dist,
          });
        }
      }
    }

    // Parse packages-dev array
    if (Array.isArray(data['packages-dev'])) {
      for (const pkg of data['packages-dev']) {
        if (pkg.name && pkg.version) {
          devPackages.push({
            name: pkg.name,
            version: pkg.version,
            type: pkg.type || 'library',
            description: pkg.description,
            homepage: pkg.homepage,
            license: pkg.license,
            source: pkg.source,
            dist: pkg.dist,
          });
        }
      }
    }

    return {
      packages,
      devPackages,
      totalCount: packages.length + devPackages.length,
    };
  } catch (error) {
    throw new Error(`Failed to parse composer.lock: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Sort packages by priority (Contao packages first, then alphabetical)
 */
export function sortComposerPackages(packages: ComposerPackage[]): ComposerPackage[] {
  return [...packages].sort((a, b) => {
    // Prioritize Contao packages
    const aIsContao = a.name.startsWith('contao/');
    const bIsContao = b.name.startsWith('contao/');
    
    if (aIsContao && !bIsContao) return -1;
    if (!aIsContao && bIsContao) return 1;
    
    // Then sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get color palette for package type badge
 */
export function getPackageTypeColorPalette(type?: string): string {
  if (!type) return 'gray';
  
  if (type.startsWith('contao')) return 'orange';
  if (type.startsWith('symfony')) return 'blue';
  if (type === 'metapackage') return 'purple';
  if (type === 'library') return 'green';
  if (type === 'project') return 'red';
  if (type === 'composer-plugin') return 'cyan';
  
  return 'gray';
}

/**
 * Detect composer file type from filename
 */
export function getComposerFileType(filename: string): 'json' | 'lock' | 'unknown' {
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.endsWith('composer.json')) return 'json';
  if (lowerFilename.endsWith('composer.lock')) return 'lock';
  return 'unknown';
}

/**
 * Parse composer file content based on file type
 */
export function parseComposerFile(filename: string, content: string): ParsedComposerData {
  const fileType = getComposerFileType(filename);
  
  switch (fileType) {
    case 'json':
      return parseComposerJson(content);
    case 'lock':
      return parseComposerLock(content);
    default:
      throw new Error(`Unsupported file type for ${filename}`);
  }
}