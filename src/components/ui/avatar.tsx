import { Avatar as ChakraAvatar } from "@chakra-ui/react"
import * as React from "react"

export interface AvatarProps extends ChakraAvatar.RootProps {
  name?: string
  src?: string
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  function Avatar(props, ref) {
    const { name, src, children, ...rest } = props
    return (
      <ChakraAvatar.Root ref={ref} {...rest}>
        {src && <ChakraAvatar.Image src={src} />}
        <ChakraAvatar.Fallback name={name} />
        {children}
      </ChakraAvatar.Root>
    )
  },
)

// Create an Avatar object with all components for easier importing
export const AvatarComponents = {
  Root: ChakraAvatar.Root,
  Image: ChakraAvatar.Image,
  Fallback: ChakraAvatar.Fallback,
  Icon: ChakraAvatar.Icon,
  // Group: ChakraAvatar.Group,
}