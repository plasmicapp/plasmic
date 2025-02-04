import { ClickStopper } from "@/wab/client/components/widgets";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { PlasmicInlineEditable } from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicInlineEditable";
import { InlineEdit } from "@/wab/commons/components/InlineEdit";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { isReactElementOfType } from "@/wab/shared/react-utils";
import * as React from "react";

interface InlineEditableProps {
  className?: string;
  disabled?: boolean;
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

function InlineEditable(props: InlineEditableProps) {
  const { children, disabled, value, onChange, className, placeholder, icon } =
    props;

  return (
    <InlineEdit
      render={({ onDone, editing, onStart }) => (
        <PlasmicInlineEditable
          disabled={disabled}
          root={{
            className,
            onClick: () => {
              if (!editing) {
                onStart();
              }
            },
          }}
          icon={icon}
          editing={editing}
          placeholder={placeholder}
          textbox={{
            wrap: (x) =>
              isReactElementOfType(Textbox, x) ? (
                <ClickStopper style={{ width: "100%" }} preventDefault>
                  <OnClickAway onDone={onDone}>
                    {React.cloneElement(x, {
                      autoFocus: true,
                      selectAllOnFocus: true,
                      defaultValue: value || undefined,
                      onEscape: onDone,
                      onBlur: onDone,
                      onEdit: (newVal: string) => {
                        onChange(newVal);
                        onDone();
                      },
                    })}
                  </OnClickAway>
                </ClickStopper>
              ) : (
                x
              ),
          }}
          children={children}
        />
      )}
    />
  );
}

export default InlineEditable;
