#!/usr/bin/env node

/**
 * React 19 Compatibility Test Script
 * 
 * This script helps identify potential React 19 compatibility issues
 * by checking for common patterns that might break.
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../src');
const issues = [];

// Patterns to check for React 19 compatibility
const compatibilityChecks = [
  {
    name: 'Direct DOM Access',
    pattern: /document\.getElementById(?!.*'root')|document\.querySelector/g,
    severity: 'high',
    description: 'Direct DOM access should be replaced with React refs (excluding root element access)'
  },
  {
    name: 'Legacy Event Types',
    pattern: /React\.SyntheticEvent|React\.FormEvent(?!<)/g,
    severity: 'medium',
    description: 'Consider using more specific event types'
  },
  {
    name: 'useEffect without cleanup',
    pattern: /useEffect\([^}]*\}, \[[^\]]*\]\);/g,
    severity: 'low',
    description: 'Verify useEffect has proper cleanup where needed'
  },
  {
    name: 'Large dependency arrays',
    pattern: /useCallback\([^}]+\}, \[[^\]]{80,}\]/g,
    severity: 'medium',
    description: 'Large dependency arrays in useCallback may cause performance issues'
  }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(sourceDir, filePath);
  
  compatibilityChecks.forEach(check => {
    const matches = [...content.matchAll(check.pattern)];
    matches.forEach(match => {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: relativePath,
        line: lineNumber,
        severity: check.severity,
        issue: check.name,
        description: check.description,
        snippet: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : '')
      });
    });
  });
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      scanFile(filePath);
    }
  });
}

function generateReport() {
  console.log('\n🔍 React 19 Compatibility Analysis\n');
  console.log('='  .repeat(50));
  
  if (issues.length === 0) {
    console.log('✅ No compatibility issues found!');
    return;
  }
  
  // Group by severity
  const groupedIssues = issues.reduce((acc, issue) => {
    acc[issue.severity] = acc[issue.severity] || [];
    acc[issue.severity].push(issue);
    return acc;
  }, {});
  
  ['high', 'medium', 'low'].forEach(severity => {
    if (groupedIssues[severity]) {
      const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`\n${icon} ${severity.toUpperCase()} PRIORITY (${groupedIssues[severity].length} issues)\n`);
      
      groupedIssues[severity].forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.issue}`);
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Issue: ${issue.description}`);
        console.log(`   Code: ${issue.snippet}`);
        console.log('');
      });
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`Total issues found: ${issues.length}`);
  console.log(`High priority: ${(groupedIssues.high || []).length}`);
  console.log(`Medium priority: ${(groupedIssues.medium || []).length}`);
  console.log(`Low priority: ${(groupedIssues.low || []).length}`);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Address high priority issues first');
  console.log('2. Test with React.StrictMode enabled');
  console.log('3. Create React 19 testing branch');
  console.log('4. Update dependencies gradually');
  
  console.log('\n📚 Resources:');
  console.log('- React 19 Migration Guide: https://react.dev/blog/2024/04/25/react-19');
  console.log('- Migration Plan: ./REACT19_MIGRATION_PLAN.md');
}

// Run the analysis
console.log('Scanning React components for compatibility issues...');
scanDirectory(sourceDir);
generateReport();

// Exit with appropriate code
process.exit(issues.filter(i => i.severity === 'high').length > 0 ? 1 : 0);