import React from 'react';
import { useColorMode } from './color-mode';
import { CodeBlock as ChakraCodeBlock, IconButton, ClientOnly, Container } from '@chakra-ui/react';
import { shikiAdapter } from '../../utils/shikiAdapter';

export interface CodeBlockProps {
  children: string;
  language?: string;
  showLineNumbers?: boolean;
  showCopy?: boolean;
  maxHeight?: string;
  title?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  language = 'text',
  showLineNumbers = false,
  showCopy = false,
  maxHeight = '300px',
  title,
  className = '',
}) => {
  const { colorMode } = useColorMode();

  // Map common language aliases
  const normalizedLanguage = language === 'sh' ? 'bash' : language;

  // Fallback component for server-side rendering
  const FallbackCodeBlock = () => (
    <pre style={{
      background: colorMode === 'dark' ? '#1a1a1a' : '#f5f5f5',
      color: colorMode === 'dark' ? '#ffffff' : '#000000',
      padding: '1rem',
      borderRadius: '6px',
      fontSize: '14px',
      overflow: 'auto',
      maxHeight,
      whiteSpace: 'pre-wrap',
      border: colorMode === 'dark' ? '1px solid #333' : '1px solid #e2e2e2'
    }}>
      {children}
    </pre>
  );

  return (
    <Container maxW="100%" px={0}>
      <ChakraCodeBlock.AdapterProvider value={shikiAdapter}>
        <ClientOnly fallback={<FallbackCodeBlock />}>
          {() => (
            <ChakraCodeBlock.Root
              code={children}
              language={normalizedLanguage}
              meta={{
                ...(showLineNumbers && { showLineNumbers: true }),
                colorScheme: colorMode
              }}
              colorPalette="gray"
              className={className}
            >
          {(title || showCopy) && (
            <ChakraCodeBlock.Header>
              {title && (
                <ChakraCodeBlock.Title>{title}</ChakraCodeBlock.Title>
              )}
              {showCopy && (
                <ChakraCodeBlock.CopyTrigger asChild>
                  <IconButton variant="ghost" size="xs">
                    <ChakraCodeBlock.CopyIndicator />
                  </IconButton>
                </ChakraCodeBlock.CopyTrigger>
              )}
            </ChakraCodeBlock.Header>
          )}
          
              <ChakraCodeBlock.Content maxHeight={maxHeight} bg="bg" overflow="auto">
                <ChakraCodeBlock.Code>
                  <ChakraCodeBlock.CodeText />
                </ChakraCodeBlock.Code>
              </ChakraCodeBlock.Content>
            </ChakraCodeBlock.Root>
          )}
        </ClientOnly>
      </ChakraCodeBlock.AdapterProvider>
    </Container>
  );
};
