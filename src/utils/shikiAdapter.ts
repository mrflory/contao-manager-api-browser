import { createShikiAdapter } from '@chakra-ui/react';
import { createHighlighter } from 'shiki';

// Create the highlighter promise once - this is the recommended singleton pattern
const highlighterPromise = createHighlighter({
  langs: ['json', 'sql', 'bash', 'typescript', 'javascript', 'sh', 'text'],
  themes: ['github-light', 'github-dark']
});

// Create the Shiki adapter with the highlighter promise
export const shikiAdapter = createShikiAdapter({
  async load() {
    return await highlighterPromise;
  }
});