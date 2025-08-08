import * as React from "react";
import { RadioGroup as ChakraRadioGroup } from "@chakra-ui/react";

export type RadioRootProps = ChakraRadioGroup.RootProps;
export const RadioRoot = React.forwardRef<HTMLDivElement, RadioRootProps>(
  function RadioRoot(props, ref) {
    return <ChakraRadioGroup.Root ref={ref} {...props} />;
  }
);

export type RadioItemProps = ChakraRadioGroup.ItemProps;
export const RadioItem = React.forwardRef<HTMLDivElement, RadioItemProps>(
  function RadioItem(props, ref) {
    return (
      <ChakraRadioGroup.Item ref={ref} {...props}>
        <ChakraRadioGroup.ItemControl />
        <ChakraRadioGroup.ItemHiddenInput />
        {props.children}
      </ChakraRadioGroup.Item>
    );
  }
);

export const RadioItemText = ChakraRadioGroup.ItemText;