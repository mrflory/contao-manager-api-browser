import { Box } from "@chakra-ui/react"
import * as React from "react"

export interface AlertProps {
  status?: 'error' | 'warning' | 'info' | 'success'
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Alert({ status = 'info', children, size = 'md', ...props }: AlertProps) {
  const getColors = () => {
    switch (status) {
      case 'error':
        return { bg: 'red.50', border: 'red.200' }
      case 'warning':
        return { bg: 'orange.50', border: 'orange.200' }
      case 'success':
        return { bg: 'green.50', border: 'green.200' }
      default:
        return { bg: 'blue.50', border: 'blue.200' }
    }
  }

  const colors = getColors()

  return (
    <Box
      p={size === 'sm' ? 3 : 4}
      borderRadius="md"
      borderWidth="1px"
      bg={colors.bg}
      borderColor={colors.border}
      {...props}
    >
      {children}
    </Box>
  )
}

export function AlertTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box fontWeight="semibold" mb={1}>
      {children}
    </Box>
  )
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return (
    <Box fontSize="sm" color="gray.600">
      {children}
    </Box>
  )
}