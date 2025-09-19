import React, { useState } from 'react';
import {
  Box,
  Text,
  Input,
  InputGroup,
  Button,
  HStack,
  VStack,
  Badge,
  IconButton
} from '@chakra-ui/react';
import { LuSearch, LuCopy, LuDownload } from 'react-icons/lu';
import { ConsoleOutput, ConsoleOutputLine } from '../../types/errorTypes';

interface EnhancedConsoleOutputProps {
  consoleOutput: ConsoleOutput;
  maxHeight?: string;
  showSearch?: boolean;
  showExport?: boolean;
}

export const EnhancedConsoleOutput: React.FC<EnhancedConsoleOutputProps> = ({
  consoleOutput,
  maxHeight = '300px',
  showSearch = true,
  showExport = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const getLineColor = (type: ConsoleOutputLine['type']): string => {
    switch (type) {
      case 'command': return 'blue.600';
      case 'error': return 'red.600';
      case 'warning': return 'orange.600';
      case 'success': return 'green.600';
      case 'info': return 'purple.600';
      default: return 'gray.700';
    }
  };

  const getLineBackground = (type: ConsoleOutputLine['type']): string => {
    switch (type) {
      case 'error': return 'red.50';
      case 'warning': return 'orange.50';
      case 'success': return 'green.50';
      default: return 'transparent';
    }
  };

  const getLinePrefix = (type: ConsoleOutputLine['type']): string => {
    switch (type) {
      case 'command': return '$ ';
      case 'error': return '❌ ';
      case 'warning': return '⚠️ ';
      case 'success': return '✅ ';
      case 'info': return 'ℹ️ ';
      default: return '';
    }
  };

  const filteredLines = consoleOutput.lines.filter(line => {
    if (showOnlyErrors && line.type !== 'error') return false;
    if (searchTerm && !line.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(consoleOutput.rawOutput);
  };

  const downloadOutput = () => {
    const blob = new Blob([consoleOutput.rawOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-output-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderControls = () => {
    if (!showSearch && !showExport) return null;

    return (
      <HStack gap={2} mb={3} wrap="wrap">
        {showSearch && (
          <HStack gap={2} flex="1" minW="200px">
            <InputGroup startElement={<LuSearch color="gray.400" />}>
              <Input
                placeholder="Search output..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
              />
            </InputGroup>
            <Button
              size="sm"
              variant={showOnlyErrors ? 'solid' : 'outline'}
              colorPalette="red"
              onClick={() => setShowOnlyErrors(!showOnlyErrors)}
            >
              Errors Only
            </Button>
          </HStack>
        )}

        {showExport && (
          <HStack gap={1}>
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Copy to clipboard"
              onClick={copyToClipboard}
            >
              <LuCopy />
            </IconButton>
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Download output"
              onClick={downloadOutput}
            >
              <LuDownload />
            </IconButton>
          </HStack>
        )}
      </HStack>
    );
  };

  const renderStats = () => (
    <HStack gap={2} mb={2}>
      <Badge colorPalette="gray" size="sm">
        {filteredLines.length} lines
      </Badge>
      {consoleOutput.errorCount > 0 && (
        <Badge colorPalette="red" size="sm">
          {consoleOutput.errorCount} errors
        </Badge>
      )}
      {consoleOutput.warningCount > 0 && (
        <Badge colorPalette="orange" size="sm">
          {consoleOutput.warningCount} warnings
        </Badge>
      )}
    </HStack>
  );

  return (
    <Box>
      {renderStats()}
      {renderControls()}

      <Box
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
        bg="gray.900"
      >
        <Box
          maxHeight={maxHeight}
          overflowY="auto"
          p={3}
          fontFamily="mono"
          fontSize="sm"
          lineHeight="1.4"
        >
          {filteredLines.length === 0 ? (
            <Text color="gray.400" fontStyle="italic">
              {searchTerm ? 'No matching lines found' : 'No output available'}
            </Text>
          ) : (
            <VStack align="stretch" gap={0}>
              {filteredLines.map((line, index) => (
                <Box
                  key={index}
                  px={2}
                  py={1}
                  bg={getLineBackground(line.type)}
                  borderRadius="sm"
                  _hover={{ bg: 'gray.100' }}
                >
                  <HStack gap={2} align="flex-start">
                    {line.timestamp && (
                      <Text color="gray.500" fontSize="xs" flexShrink={0}>
                        [{line.timestamp}]
                      </Text>
                    )}
                    <Text
                      color={getLineColor(line.type)}
                      fontWeight={line.type === 'error' ? 'medium' : 'normal'}
                      wordBreak="break-word"
                      whiteSpace="pre-wrap"
                    >
                      {getLinePrefix(line.type)}{line.content}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </Box>

      {searchTerm && (
        <Text fontSize="xs" color="gray.600" mt={1}>
          Showing {filteredLines.length} of {consoleOutput.lines.length} lines
        </Text>
      )}
    </Box>
  );
};