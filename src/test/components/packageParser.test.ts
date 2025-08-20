import { parsePackageOperations, getPackageOperationColor, getPackageOperationLabel } from '../../utils/packageParser';

describe('Package Parser', () => {
  const sampleConsoleOutput = `
> Resolving dependencies using Composer Cloud v3.8.2

[7.3MiB/0.29s] Loading composer repositories with package information
[100.6MiB/22.99s] Updating dependencies
[32.5MiB/25.80s] Lock file operations: 1 install, 22 updates, 3 removals
[32.5MiB/25.80s]   - Removing beberlei/assert (v3.3.3)
[32.5MiB/25.80s]   - Removing debril/feed-io (v6.0.3)
[32.5MiB/25.80s]   - Removing thecodingmachine/safe (v2.5.0)
[32.6MiB/25.80s]   - Upgrading contao-components/ace (1.43.1 => 1.43.2)
[32.6MiB/25.81s]   - Upgrading contao-components/contao (9.4.0 => 9.4.1)
[32.6MiB/25.83s]   - Upgrading spomky-labs/otphp (v10.0.3 => 11.3.0)
[32.6MiB/25.83s]   - Downgrading symfony/clock (v7.3.0 => v6.4.24)

Package operations: 20 installs, 20 updates, 3 removals
  - Removing thecodingmachine/safe (v2.5.0)
  - Removing debril/feed-io (v6.0.3)
  - Removing beberlei/assert (v3.3.3)
  - Installing contao-components/ace (1.43.2)
  - Installing contao-components/chosen (2.0.2)
  - Downgrading symfony/clock (v7.3.0 => v6.4.24)
  - Upgrading doctrine/dbal (3.10.0 => 3.10.1)
  - Installing php-feed-io/feed-io (v6.1.1)
`;

  describe('parsePackageOperations', () => {
    it('should parse package operations correctly', () => {
      const result = parsePackageOperations(sampleConsoleOutput);
      
      expect(result).not.toBeNull();
      expect(result!.totalOperations).toBeGreaterThan(0);
      expect(result!.operationBreakdown.length).toBeGreaterThan(0); // We have operations
    });

    it('should correctly identify install operations', () => {
      const result = parsePackageOperations(sampleConsoleOutput);
      
      const installCategory = result!.operationBreakdown.find(cat => cat.category === 'INSTALL');
      expect(installCategory).toBeDefined();
      expect(installCategory!.count).toBeGreaterThan(0);
      
      const aceInstall = installCategory!.operations.find(op => op.name === 'contao-components/ace');
      expect(aceInstall).toBeDefined();
      expect(aceInstall!.type).toBe('install');
      expect(aceInstall!.toVersion).toBe('1.43.2');
    });

    it('should correctly identify upgrade operations', () => {
      const result = parsePackageOperations(sampleConsoleOutput);
      
      const updateCategory = result!.operationBreakdown.find(cat => cat.category === 'UPDATE');
      expect(updateCategory).toBeDefined();
      expect(updateCategory!.count).toBeGreaterThan(0);
      
      const dbalUpgrade = updateCategory!.operations.find(op => op.name === 'doctrine/dbal');
      expect(dbalUpgrade).toBeDefined();
      expect(dbalUpgrade!.type).toBe('update');
      expect(dbalUpgrade!.fromVersion).toBe('3.10.0');
      expect(dbalUpgrade!.toVersion).toBe('3.10.1');
    });

    it('should correctly identify remove operations', () => {
      const result = parsePackageOperations(sampleConsoleOutput);
      
      const removeCategory = result!.operationBreakdown.find(cat => cat.category === 'REMOVE');
      expect(removeCategory).toBeDefined();
      expect(removeCategory!.count).toBe(3);
      
      const assertRemove = removeCategory!.operations.find(op => op.name === 'beberlei/assert');
      expect(assertRemove).toBeDefined();
      expect(assertRemove!.type).toBe('remove');
      expect(assertRemove!.fromVersion).toBe('v3.3.3');
    });

    it('should correctly identify downgrade operations', () => {
      const result = parsePackageOperations(sampleConsoleOutput);
      
      const downgradeCategory = result!.operationBreakdown.find(cat => cat.category === 'DOWNGRADE');
      expect(downgradeCategory).toBeDefined();
      expect(downgradeCategory!.count).toBeGreaterThan(0);
      
      const clockDowngrade = downgradeCategory!.operations.find(op => op.name === 'symfony/clock');
      expect(clockDowngrade).toBeDefined();
      expect(clockDowngrade!.type).toBe('downgrade');
      expect(clockDowngrade!.fromVersion).toBe('v7.3.0');
      expect(clockDowngrade!.toVersion).toBe('v6.4.24');
    });

    it('should handle operations without lock operations', () => {
      const result = parsePackageOperations(sampleConsoleOutput);
      
      const lockCategory = result!.operationBreakdown.find(cat => cat.category === 'LOCK');
      // Lock operations may or may not be present
      if (lockCategory) {
        expect(lockCategory.count).toBeGreaterThan(0);
      }
    });

    it('should return null for empty console output', () => {
      expect(parsePackageOperations('')).toBeNull();
      expect(parsePackageOperations('No package operations found')).toBeNull();
    });
  });

  describe('getPackageOperationColor', () => {
    it('should return correct colors for operation types', () => {
      expect(getPackageOperationColor('install')).toBe('green');
      expect(getPackageOperationColor('lock')).toBe('green');
      expect(getPackageOperationColor('update')).toBe('blue');
      expect(getPackageOperationColor('upgrade')).toBe('blue');
      expect(getPackageOperationColor('remove')).toBe('red');
      expect(getPackageOperationColor('downgrade')).toBe('orange');
      expect(getPackageOperationColor('unknown')).toBe('gray');
    });
  });

  describe('getPackageOperationLabel', () => {
    it('should return correct labels for operation categories', () => {
      expect(getPackageOperationLabel('INSTALL')).toBe('Installed');
      expect(getPackageOperationLabel('UPDATE')).toBe('Updated');
      expect(getPackageOperationLabel('REMOVE')).toBe('Removed');
      expect(getPackageOperationLabel('DOWNGRADE')).toBe('Downgraded');
      expect(getPackageOperationLabel('LOCK')).toBe('Locked');
      expect(getPackageOperationLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });
});