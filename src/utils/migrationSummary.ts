/**
 * Utility for analyzing migration operations and creating detailed summaries
 * Based on the original implementation from UpdateWorkflowOld.tsx
 */

export interface MigrationOperationSummary {
  stepId: string;
  totalOperations: number;
  operationBreakdown: Array<{
    category: string;
    count: number;
    operations: any[];
  }>;
  operationDetails: Record<string, any[]>;
  deleteOperations: any[];
  hasDeletes: boolean;
  migrationType: string;
  migrationHash: string;
}

/**
 * Helper function to analyze migration operations and create detailed summary
 */
export const createMigrationSummary = (migrationData: any, stepId?: string): MigrationOperationSummary | null => {
  if (!migrationData || !migrationData.operations) {
    return null;
  }

  const operationCounts: Record<string, number> = {};
  const operationDetails: Record<string, any[]> = {};
  const deleteOperations: any[] = [];
  
  // Initialize operation categories
  const categories = ['CREATE_TABLE', 'DROP_TABLE', 'CREATE_INDEX', 'DROP_INDEX', 'ALTER_TABLE', 'OTHER'];
  categories.forEach(cat => {
    operationCounts[cat] = 0;
    operationDetails[cat] = [];
  });

  let hasDeletes = false;

  // Analyze each operation using regex patterns from MigrationView.vue
  migrationData.operations.forEach((operation: any) => {
    const operationName = operation.name || '';
    let classified = false;
    
    // CREATE TABLE pattern
    const createTableMatch = /^CREATE TABLE ([^ ]+) .+$/.exec(operationName);
    if (createTableMatch) {
      operationCounts.CREATE_TABLE++;
      operationDetails.CREATE_TABLE.push({
        ...operation,
        tableName: createTableMatch[1],
        requiresDeletes: false
      });
      classified = true;
    }
    
    // DROP TABLE pattern  
    const dropTableMatch = /^DROP TABLE (.+)$/.exec(operationName);
    if (dropTableMatch && !classified) {
      operationCounts.DROP_TABLE++;
      operationDetails.DROP_TABLE.push({
        ...operation,
        tableName: dropTableMatch[1],
        requiresDeletes: true
      });
      deleteOperations.push(operation);
      hasDeletes = true;
      classified = true;
    }
    
    // CREATE INDEX pattern
    const createIndexMatch = /^CREATE INDEX ([^ ]+) ON ([^ ]+) \\(([^)]+)\\)$/.exec(operationName);
    if (createIndexMatch && !classified) {
      operationCounts.CREATE_INDEX++;
      operationDetails.CREATE_INDEX.push({
        ...operation,
        indexName: createIndexMatch[1],
        tableName: createIndexMatch[2],
        columns: createIndexMatch[3],
        requiresDeletes: false
      });
      classified = true;
    }
    
    // DROP INDEX pattern
    const dropIndexMatch = /^DROP INDEX ([^ ]+) ON ([^ ]+)$/.exec(operationName);
    if (dropIndexMatch && !classified) {
      operationCounts.DROP_INDEX++;
      operationDetails.DROP_INDEX.push({
        ...operation,
        indexName: dropIndexMatch[1],
        tableName: dropIndexMatch[2],
        requiresDeletes: true
      });
      deleteOperations.push(operation);
      hasDeletes = true;
      classified = true;
    }
    
    // ALTER TABLE pattern
    const alterTableMatch = /^ALTER TABLE ([^ ]+) (.+)$/.exec(operationName);
    if (alterTableMatch && !classified) {
      const tableName = alterTableMatch[1];
      const alterStatement = alterTableMatch[2];
      
      // Parse ALTER TABLE sub-operations
      let stm = '';
      alterStatement.split("'").forEach((ex, i) => {
        if (i % 2) {
          stm = `${stm}'${ex.replace(',', '%comma%')}'`;
        } else {
          stm = `${stm}${ex}`;
        }
      });
      
      const subOps = stm.split(',').map((p) => p.trim().replace('%comma%', ','));
      const subOperations: any[] = [];
      let hasDrops = false;
      
      subOps.forEach((subOp) => {
        const addFieldMatch = /^ADD ([^ ]+) (.+)$/.exec(subOp);
        const changeFieldMatch = /^CHANGE ([^ ]+) ([^ ]+) (.+)$/.exec(subOp);
        const dropFieldMatch = /^DROP (.+)$/.exec(subOp);
        
        if (addFieldMatch) {
          subOperations.push({
            type: 'ADD',
            fieldName: addFieldMatch[1],
            definition: addFieldMatch[2],
            requiresDeletes: false
          });
        } else if (changeFieldMatch) {
          subOperations.push({
            type: 'CHANGE',
            oldField: changeFieldMatch[1],
            newField: changeFieldMatch[2],
            definition: changeFieldMatch[3],
            requiresDeletes: false
          });
        } else if (dropFieldMatch) {
          subOperations.push({
            type: 'DROP',
            fieldName: dropFieldMatch[1],
            requiresDeletes: true
          });
          hasDrops = true;
        } else {
          subOperations.push({
            type: 'OTHER',
            statement: subOp,
            requiresDeletes: false
          });
        }
      });
      
      operationCounts.ALTER_TABLE++;
      operationDetails.ALTER_TABLE.push({
        ...operation,
        tableName,
        subOperations,
        requiresDeletes: hasDrops
      });
      
      if (hasDrops) {
        deleteOperations.push(operation);
        hasDeletes = true;
      }
      classified = true;
    }
    
    // Fallback for unmatched operations
    if (!classified) {
      operationCounts.OTHER++;
      operationDetails.OTHER.push({
        ...operation,
        requiresDeletes: true // Assume unknown operations might be deletes
      });
      deleteOperations.push(operation);
      hasDeletes = true;
    }
  });

  // Filter out zero counts and create summary
  const nonZeroOperations = categories
    .filter(cat => operationCounts[cat] > 0)
    .map(cat => ({ 
      category: cat, 
      count: operationCounts[cat],
      operations: operationDetails[cat]
    }));

  return {
    stepId: stepId || 'unknown', // Include step ID for cycle isolation
    totalOperations: migrationData.operations.length,
    operationBreakdown: nonZeroOperations,
    operationDetails,
    deleteOperations,
    hasDeletes,
    migrationType: migrationData.type || 'unknown',
    migrationHash: migrationData.hash
  };
};