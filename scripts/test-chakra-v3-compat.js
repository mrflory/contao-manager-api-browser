#!/usr/bin/env node

/**
 * Chakra UI v3 Compatibility Test Script
 * 
 * This script analyzes the codebase for Chakra UI v2 patterns that will need
 * updating for v3 migration. It identifies breaking changes, deprecated patterns,
 * and provides migration guidance.
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../src');
const issues = [];
const componentUsage = {};
const iconUsage = {};

// Patterns to check for Chakra UI v3 compatibility
const compatibilityChecks = [
  {
    name: 'ChakraProvider Usage',
    pattern: /ChakraProvider/g,
    severity: 'high',
    description: 'ChakraProvider must be replaced with Provider from v3',
    migration: 'Replace with <Provider value={system}>'
  },
  {
    name: 'ColorModeScript Usage',
    pattern: /ColorModeScript/g,
    severity: 'high',
    description: 'ColorModeScript is removed in v3, use next-themes instead',
    migration: 'Integrate with next-themes for color mode management'
  },
  {
    name: 'extendTheme Usage',
    pattern: /extendTheme/g,
    severity: 'high',
    description: 'extendTheme API completely changed in v3',
    migration: 'Replace with createSystem and defineConfig'
  },
  {
    name: 'useColorMode Hook',
    pattern: /useColorMode/g,
    severity: 'high',
    description: 'useColorMode hook removed in v3',
    migration: 'Use useTheme from next-themes instead'
  },
  {
    name: 'useColorModeValue Hook',
    pattern: /useColorModeValue/g,
    severity: 'high',
    description: 'useColorModeValue hook removed in v3',
    migration: 'Create custom hook or use CSS color-mix'
  },
  {
    name: '@chakra-ui/icons Imports',
    pattern: /@chakra-ui\/icons/g,
    severity: 'high',
    description: '@chakra-ui/icons package is removed in v3',
    migration: 'Use external icon library like lucide-react'
  },
  {
    name: 'colorScheme Prop',
    pattern: /colorScheme=/g,
    severity: 'medium',
    description: 'colorScheme prop renamed to colorPalette in v3',
    migration: 'Replace colorScheme with colorPalette'
  },
  {
    name: 'isOpen Prop',
    pattern: /isOpen=/g,
    severity: 'medium',
    description: 'isOpen prop simplified to open in v3',
    migration: 'Replace isOpen with open'
  },
  {
    name: 'isLoading Prop',
    pattern: /isLoading=/g,
    severity: 'medium',
    description: 'isLoading prop simplified to loading in v3',
    migration: 'Replace isLoading with loading'
  },
  {
    name: 'Modal Component',
    pattern: /<Modal\s/g,
    severity: 'medium',
    description: 'Modal component renamed to Dialog in v3',
    migration: 'Replace Modal with Dialog component'
  },
  {
    name: 'Collapse Component',
    pattern: /<Collapse\s/g,
    severity: 'medium',
    description: 'Collapse component renamed to Collapsible in v3',
    migration: 'Replace Collapse with Collapsible component'
  },
  {
    name: 'useDisclosure Hook',
    pattern: /useDisclosure/g,
    severity: 'medium',
    description: 'useDisclosure hook may have API changes in v3',
    migration: 'Verify useDisclosure API or create custom hook'
  },
  {
    name: 'useToast Hook',
    pattern: /useToast/g,
    severity: 'medium',
    description: 'useToast hook may have API changes in v3',
    migration: 'Verify toast API and update accordingly'
  },
  {
    name: 'ThemeConfig Type',
    pattern: /ThemeConfig/g,
    severity: 'low',
    description: 'ThemeConfig type removed in v3',
    migration: 'Remove ThemeConfig import and usage'
  }
];

// Chakra UI components to track usage
const chakraComponents = [
  'Box', 'Flex', 'HStack', 'VStack', 'Grid', 'GridItem', 'Container', 'Center', 'Divider',
  'Button', 'IconButton', 'ButtonGroup', 'Link',
  'Text', 'Heading', 'Badge', 'Code',
  'Input', 'Select', 'Checkbox', 'FormControl', 'FormLabel', 'Textarea',
  'Alert', 'AlertIcon', 'AlertTitle', 'AlertDescription', 'Spinner', 'Progress',
  'Modal', 'ModalOverlay', 'ModalContent', 'ModalHeader', 'ModalBody', 'ModalFooter', 'ModalCloseButton',
  'AlertDialog', 'AlertDialogOverlay', 'AlertDialogContent', 'AlertDialogHeader', 'AlertDialogBody', 'AlertDialogFooter',
  'Table', 'TableContainer', 'Thead', 'Tbody', 'Tr', 'Th', 'Td',
  'Tabs', 'TabList', 'TabPanels', 'Tab', 'TabPanel',
  'Accordion', 'AccordionItem', 'AccordionButton', 'AccordionPanel', 'AccordionIcon',
  'Collapse', 'Editable', 'EditableInput', 'EditablePreview', 'Circle', 'Tooltip'
];

// Chakra UI icons to track (all removed in v3)
const chakraIcons = [
  'SunIcon', 'MoonIcon', 'AddIcon', 'ArrowBackIcon', 'DeleteIcon', 'SettingsIcon',
  'EditIcon', 'CheckIcon', 'CloseIcon', 'RepeatIcon', 'TriangleUpIcon', 'TriangleDownIcon',
  'WarningIcon', 'MinusIcon', 'AccordionIcon'
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(sourceDir, filePath);
  
  // Check compatibility issues
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
        migration: check.migration,
        snippet: content.split('\n')[lineNumber - 1]?.trim()?.substring(0, 80) + '...'
      });
    });
  });
  
  // Track component usage
  chakraComponents.forEach(component => {
    const pattern = new RegExp(`<${component}[\\s>]|\\b${component}\\b`, 'g');
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      componentUsage[component] = componentUsage[component] || [];
      componentUsage[component].push({
        file: relativePath,
        count: matches.length
      });
    }
  });
  
  // Track icon usage
  chakraIcons.forEach(icon => {
    const pattern = new RegExp(`\\b${icon}\\b`, 'g');
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      iconUsage[icon] = iconUsage[icon] || [];
      iconUsage[icon].push({
        file: relativePath,
        count: matches.length
      });
    }
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

function generateMigrationSummary() {
  const totalComponents = Object.keys(componentUsage).length;
  const totalIcons = Object.keys(iconUsage).length;
  const totalUsage = Object.values(componentUsage).reduce((sum, files) => 
    sum + files.reduce((fileSum, file) => fileSum + file.count, 0), 0
  );
  
  return {
    totalComponents,
    totalIcons,
    totalUsage,
    complexity: calculateComplexity()
  };
}

function calculateComplexity() {
  const highIssues = issues.filter(i => i.severity === 'high').length;
  const mediumIssues = issues.filter(i => i.severity === 'medium').length;
  const iconCount = Object.keys(iconUsage).length;
  const componentCount = Object.keys(componentUsage).length;
  
  // Complexity scoring
  let score = 0;
  score += highIssues * 3;
  score += mediumIssues * 2;
  score += iconCount * 1;
  score += componentCount * 0.5;
  
  if (score > 50) return 'Very High';
  if (score > 30) return 'High';
  if (score > 15) return 'Medium';
  if (score > 5) return 'Low';
  return 'Very Low';
}

function generateReport() {
  console.log('\n🔍 Chakra UI v3 Migration Analysis\n');
  console.log('='  .repeat(60));
  
  const summary = generateMigrationSummary();
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`Components used: ${summary.totalComponents}`);
  console.log(`Icons used: ${summary.totalIcons} (all need replacement)`);
  console.log(`Total component usage: ${summary.totalUsage}`);
  console.log(`Migration complexity: ${summary.complexity}`);
  
  if (issues.length === 0) {
    console.log('\n✅ No compatibility issues found!');
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
        console.log(`   Migration: ${issue.migration}`);
        if (issue.snippet) {
          console.log(`   Code: ${issue.snippet}`);
        }
        console.log('');
      });
    }
  });
  
  // Component usage breakdown
  console.log('\n📦 Component Usage Analysis:');
  console.log('='  .repeat(40));
  
  const sortedComponents = Object.entries(componentUsage)
    .sort(([,a], [,b]) => {
      const aCount = a.reduce((sum, file) => sum + file.count, 0);
      const bCount = b.reduce((sum, file) => sum + file.count, 0);
      return bCount - aCount;
    });
  
  sortedComponents.slice(0, 10).forEach(([component, files]) => {
    const totalCount = files.reduce((sum, file) => sum + file.count, 0);
    const fileCount = files.length;
    console.log(`${component}: ${totalCount} usages across ${fileCount} file(s)`);
  });
  
  // Icon usage breakdown
  if (Object.keys(iconUsage).length > 0) {
    console.log('\n🎨 Icon Usage (All Need Replacement):');
    console.log('='  .repeat(40));
    
    Object.entries(iconUsage).forEach(([icon, files]) => {
      const totalCount = files.reduce((sum, file) => sum + file.count, 0);
      const fileList = files.map(f => f.file).join(', ');
      console.log(`${icon}: ${totalCount} usage(s) in ${fileList}`);
    });
  }
  
  console.log('\n📋 Migration Strategy:');
  console.log('1. Start with theme.ts migration (createSystem)');
  console.log('2. Update provider setup (ChakraProvider → Provider)');
  console.log('3. Replace color mode hooks (next-themes integration)');
  console.log('4. Migrate icons (install lucide-react or react-icons)');
  console.log('5. Update component props (colorScheme → colorPalette)');
  console.log('6. Test modal/dialog components thoroughly');
  console.log('7. Verify form components and validation');
  
  console.log('\n⚠️  High Risk Components:');
  const highRiskComponents = ['Modal', 'useColorModeValue', 'useColorMode', 'ChakraProvider'];
  highRiskComponents.forEach(comp => {
    if (componentUsage[comp] || issues.some(i => i.issue.includes(comp))) {
      console.log(`   • ${comp} - Requires significant changes`);
    }
  });
  
  console.log('\n📚 Resources:');
  console.log('- Chakra UI v3 Migration Guide: https://chakra-ui.com/llms-v3-migration.txt');
  console.log('- Migration Plan: ./CHAKRA_V3_MIGRATION_PLAN.md');
  console.log('- Component Snippets: npx @chakra-ui/cli snippet add <component>');
  
  console.log(`\n📈 Estimated Migration Time: ${getEstimatedTime(summary.complexity)} days`);
}

function getEstimatedTime(complexity) {
  switch (complexity) {
    case 'Very High': return '15-20';
    case 'High': return '10-15';
    case 'Medium': return '5-10';
    case 'Low': return '2-5';
    case 'Very Low': return '1-2';
    default: return '5-10';
  }
}

// Run the analysis
console.log('Scanning React components for Chakra UI v3 compatibility...');
scanDirectory(sourceDir);
generateReport();

// Exit with appropriate code
const highPriorityIssues = issues.filter(i => i.severity === 'high').length;
const migrationComplexity = generateMigrationSummary().complexity;
console.log(`\n🎯 Migration Readiness: ${highPriorityIssues === 0 ? 'READY' : 'PREPARATION NEEDED'}`);
console.log(`   Complexity: ${migrationComplexity}`);
console.log(`   High Priority Issues: ${highPriorityIssues}`);

process.exit(highPriorityIssues > 5 ? 1 : 0);