import { createSystem, defaultConfig } from "@chakra-ui/react"

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#e3f2fd' },
          100: { value: '#bbdefb' },
          200: { value: '#90caf9' },
          300: { value: '#64b5f6' },
          400: { value: '#42a5f5' },
          500: { value: '#007cba' }, // Main brand color
          600: { value: '#1976d2' },
          700: { value: '#1565c0' },
          800: { value: '#0d47a1' },
          900: { value: '#0a3f8e' },
        },
      },
      fonts: {
        heading: { value: 'system-ui, -apple-system, sans-serif' },
        body: { value: 'system-ui, -apple-system, sans-serif' },
      },
    },
  },
  globalCss: {
    body: {
      bg: 'bg.subtle',
    },
  },
})
export default system