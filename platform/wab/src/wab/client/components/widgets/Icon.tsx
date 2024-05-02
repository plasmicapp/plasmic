import cn from "classnames";
import React from "react";

export function Icon(
  props: React.ComponentProps<"svg"> & {
    monochromeExempt?: boolean;
    icon: React.ComponentType<React.ComponentProps<"svg">>;
    size?: number | string;
  }
) {
  const {
    icon,
    className,
    monochromeExempt,
    size = 16,
    style,
    ...rest
  } = props;
  const IconType = icon;

  return (
    <IconType
      className={cn(`custom-svg-icon`, className, {
        "monochrome-exempt": monochromeExempt,
      })}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      {...rest}
    />
  );
}
