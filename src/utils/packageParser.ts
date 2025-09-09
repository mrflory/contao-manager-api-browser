export interface PackageOperation {
  type: 'install' | 'update' | 'remove' | 'downgrade' | 'lock';
  name: string;
  fromVersion?: string;
  toVersion?: string;
  versionInfo?: string;
}

export interface PackageSummary {
  totalOperations: number;
  operationBreakdown: {
    category: string;
    count: number;
    operations: PackageOperation[];
  }[];
  operationDetails: Record<string, PackageOperation[]>;
  summaryText?: string; // Raw summary line like "Package operations: 20 installs, 20 updates, 3 removals"
}

/**
 * Parse composer console output to extract package operations
 */
export const parsePackageOperations = (console: string): PackageSummary | null => {
  if (!console) return null;

  const operations: PackageOperation[] = [];
  const operationCounts: Record<string, number> = {};
  const operationDetails: Record<string, PackageOperation[]> = {};
  let summaryText: string | undefined;

  // Initialize categories
  const categories = ['INSTALL', 'UPDATE', 'REMOVE', 'DOWNGRADE', 'LOCK'];
  categories.forEach(cat => {
    operationCounts[cat] = 0;
    operationDetails[cat] = [];
  });

  // Split console output into lines
  const lines = console.split('\n');

  // First, look for summary lines like "Package operations: 20 installs, 20 updates, 3 removals"
  for (const line of lines) {
    const summaryMatch = line.match(/^(?:Package|Lock file) operations:.*(?:installs?|updates?|removals?)/);
    if (summaryMatch) {
      summaryText = line.trim();
      break;
    }
  }

  for (const line of lines) {
    let operation: PackageOperation | null = null;

    // Pattern: "  - Installing package (version)"
    const installMatch = line.match(/^\s*-\s+Installing\s+([^\s]+)\s+\(([^)]+)\)/);
    if (installMatch) {
      operation = {
        type: 'install',
        name: installMatch[1],
        toVersion: installMatch[2],
        versionInfo: installMatch[2]
      };
    }

    // Pattern: "  - Upgrading package (oldVersion => newVersion)"
    const upgradeMatch = line.match(/^\s*-\s+Upgrading\s+([^\s]+)\s+\(([^)]+)\s+=>\s+([^)]+)\)/);
    if (upgradeMatch) {
      operation = {
        type: 'update',
        name: upgradeMatch[1],
        fromVersion: upgradeMatch[2],
        toVersion: upgradeMatch[3],
        versionInfo: `${upgradeMatch[2]} => ${upgradeMatch[3]}`
      };
    }

    // Pattern: "  - Downgrading package (oldVersion => newVersion)"
    const downgradeMatch = line.match(/^\s*-\s+Downgrading\s+([^\s]+)\s+\(([^)]+)\s+=>\s+([^)]+)\)/);
    if (downgradeMatch) {
      operation = {
        type: 'downgrade',
        name: downgradeMatch[1],
        fromVersion: downgradeMatch[2],
        toVersion: downgradeMatch[3],
        versionInfo: `${downgradeMatch[2]} => ${downgradeMatch[3]}`
      };
    }

    // Pattern: "  - Removing package (version)"
    const removeMatch = line.match(/^\s*-\s+Removing\s+([^\s]+)\s+\(([^)]+)\)/);
    if (removeMatch) {
      operation = {
        type: 'remove',
        name: removeMatch[1],
        fromVersion: removeMatch[2],
        versionInfo: removeMatch[2]
      };
    }

    // Pattern: "  - Locking package (version)" 
    const lockMatch = line.match(/^\s*-\s+Locking\s+([^\s]+)\s+\(([^)]+)\)/);
    if (lockMatch) {
      operation = {
        type: 'lock',
        name: lockMatch[1],
        toVersion: lockMatch[2],
        versionInfo: lockMatch[2]
      };
    }

    if (operation) {
      operations.push(operation);
      
      const category = operation.type.toUpperCase();
      operationCounts[category]++;
      operationDetails[category].push(operation);
    }
  }

  // If we found a summary text but no detailed operations, still return the summary
  if (operations.length === 0 && !summaryText) {
    return null;
  }

  // Create summary breakdown
  const operationBreakdown = categories
    .filter(cat => operationCounts[cat] > 0)
    .map(cat => ({
      category: cat,
      count: operationCounts[cat],
      operations: operationDetails[cat]
    }));

  return {
    totalOperations: operations.length,
    operationBreakdown,
    operationDetails,
    summaryText
  };
};

/**
 * Get operation badge color for package operations
 */
export const getPackageOperationColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'install':
    case 'lock':
      return 'green';
    case 'update':
    case 'upgrade':
      return 'blue';
    case 'remove':
      return 'red';
    case 'downgrade':
      return 'orange';
    default:
      return 'gray';
  }
};

/**
 * Get operation display label
 */
export const getPackageOperationLabel = (category: string): string => {
  const labels = {
    'INSTALL': 'Installed',
    'UPDATE': 'Updated', 
    'REMOVE': 'Removed',
    'DOWNGRADE': 'Downgraded',
    'LOCK': 'Locked'
  };
  return labels[category as keyof typeof labels] || category;
};