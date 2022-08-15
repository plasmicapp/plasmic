import { HTMLChakraProps } from "@chakra-ui/system";
import React from "react";
export function Option({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: any;
}) {
  return (
    <option className={className} value={value}>
      {children}
    </option>
  );
}

interface RootProps extends Omit<HTMLChakraProps<"div">, "color"> {}

export interface OptionProps {
  /**
   * Props to forward to the root `div` element
   */
  rootProps?: RootProps;
}
