import type { HighlighterGeneric } from "shiki"
import { createShikiAdapter } from "@chakra-ui/react"

export const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
  theme: {
    light: 'github-light',
    dark: 'github-dark'
  },
  async load() {
    const { createHighlighter } = await import("shiki")
    return createHighlighter({
      langs: ['json', 'sql', 'bash', 'typescript', 'javascript', 'sh', 'text', 'html'],
      themes: ['github-light', 'github-dark']
    })
  },
})