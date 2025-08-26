import type { HighlighterGeneric } from "shiki"
import { createShikiAdapter } from "@chakra-ui/react"

export const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
  async load() {
    const { createHighlighter } = await import("shiki")
    return createHighlighter({
      langs: ['json', 'sql', 'bash', 'typescript', 'javascript', 'sh', 'text'],
      themes: ['github-light', 'github-dark']
    })
  },
})