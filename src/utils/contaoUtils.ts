/**
 * Utility functions for Contao-specific operations
 */

/**
 * Generate the Contao admin URL from a Contao Manager URL
 * @param managerUrl The Contao Manager URL (e.g., https://example.com/contao-manager.phar.php)
 * @returns The Contao admin URL (e.g., https://example.com/contao)
 */
export function getContaoAdminUrl(managerUrl: string): string {
  if (managerUrl.includes('contao-manager.phar.php')) {
    return managerUrl.replace('contao-manager.phar.php', 'contao');
  }
  // If URL doesn't contain the manager script, append /contao
  const baseUrl = managerUrl.endsWith('/') ? managerUrl.slice(0, -1) : managerUrl;
  return `${baseUrl}/contao`;
}

/**
 * Open a URL in a new tab with security best practices
 * @param url The URL to open
 */
export function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
