import React from 'react';
import { useColorMode } from './color-mode';
import { CodeBlock as ChakraCodeBlock, createShikiAdapter, IconButton, ClientOnly, Container } from '@chakra-ui/react';

export interface CodeBlockProps {
  children: string;
  language?: string;
  showLineNumbers?: boolean;
  showCopy?: boolean;
  maxHeight?: string;
  title?: string;
  className?: string;
}

// Create Shiki adapter following Chakra UI v3 documentation
export const shikiAdapter = createShikiAdapter({
  async load() {
    const { createHighlighter } = await import('shiki');
    return createHighlighter({
      langs: ['json', 'sql', 'bash', 'typescript', 'javascript', 'sh', 'text'],
      themes: ['github-light', 'github-dark']
    });
  }
});

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

  return (
    <Container maxW="100%" px={0}>
      <ChakraCodeBlock.AdapterProvider value={shikiAdapter}>
        <ClientOnly>
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
