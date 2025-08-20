import { createShikiAdapter } from '@chakra-ui/react';
import type { Highlighter } from 'shiki';

// Singleton highlighter instance
let highlighterInstance: Highlighter | null = null;
let isInitializing = false;

// Create a singleton Shiki highlighter
const createSingletonHighlighter = async (): Promise<Highlighter> => {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  if (isInitializing) {
    // Wait for the current initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return highlighterInstance!;
  }

  isInitializing = true;

  try {
    const { createHighlighter } = await import('shiki');
    highlighterInstance = await createHighlighter({
      langs: ['json', 'sql', 'bash', 'typescript', 'javascript', 'sh', 'text'],
      themes: ['github-light', 'github-dark']
    });
    return highlighterInstance;
  } finally {
    isInitializing = false;
  }
};

// Create the Shiki adapter with singleton highlighter
export const shikiAdapter = createShikiAdapter({
  async load() {
    return createSingletonHighlighter();
  }
});

// Cleanup function to dispose of the highlighter when needed
export const disposeShikiHighlighter = () => {
  if (highlighterInstance) {
    highlighterInstance.dispose();
    highlighterInstance = null;
  }
};

// Optional: Add cleanup on page unload (for SPA scenarios)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', disposeShikiHighlighter);
}