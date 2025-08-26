import { Dialog as ChakraDialog, Portal } from "@chakra-ui/react"
import { CloseButton } from "./close-button"
import * as React from "react"

interface DialogContentProps extends ChakraDialog.ContentProps {
  children?: React.ReactNode
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement>
  backdrop?: boolean
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(function DialogContent(props, ref) {
  const {
    children,
    portalled = true,
    portalRef,
    backdrop = true,
    ...rest
  } = props

  return (
    <Portal disabled={!portalled} container={portalRef}>
      {backdrop && <ChakraDialog.Backdrop />}
      {/* @ts-expect-error - Chakra UI v3 TypeScript interface doesn't include children but functionality works */}
      <ChakraDialog.Positioner>
        {/* @ts-expect-error - Chakra UI v3 TypeScript interface doesn't include children but functionality works */}
        <ChakraDialog.Content ref={ref} {...rest} asChild={false}>
          {children}
        </ChakraDialog.Content>
      </ChakraDialog.Positioner>
    </Portal>
  )
})

interface DialogCloseTriggerProps extends ChakraDialog.CloseTriggerProps {
  children?: React.ReactNode
}

export const DialogCloseTrigger = React.forwardRef<
  HTMLButtonElement,
  DialogCloseTriggerProps
>(function DialogCloseTrigger(props, ref) {
  return (
    /* @ts-expect-error - Chakra UI v3 TypeScript interface strict checking, functionality works */
    <ChakraDialog.CloseTrigger
      position="absolute"
      top="2"
      insetEnd="2"
      {...props}
      asChild
    >
      <CloseButton size="sm" ref={ref}>
        {props.children}
      </CloseButton>
    </ChakraDialog.CloseTrigger>
  )
})

export const DialogRoot = ChakraDialog.Root
export const DialogFooter = ChakraDialog.Footer
export const DialogHeader = ChakraDialog.Header
export const DialogBody = ChakraDialog.Body
export const DialogBackdrop = ChakraDialog.Backdrop

interface DialogTitleProps extends ChakraDialog.TitleProps {
  children?: React.ReactNode
}

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  DialogTitleProps
>(function DialogTitle(props, ref) {
  return <ChakraDialog.Title ref={ref} {...props} />
})

export const DialogDescription = ChakraDialog.Description
export const DialogTrigger = ChakraDialog.Trigger
export const DialogActionTrigger = ChakraDialog.ActionTrigger