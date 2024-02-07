import EditableResourceName from "@/wab/client/components/EditableResourceName";
import { ClickStopper } from "@/wab/client/components/widgets";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { InlineEdit } from "@/wab/commons/components/InlineEdit";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { Stated } from "@/wab/commons/components/Stated";
import { notification } from "antd";
import React from "react";

interface InlineEditableResourceProps {
  visibleValue?: React.ReactNode;
  value: string;
  isFake?: boolean;
  onChange: (value: string) => Promise<void>;
}

export default function InlineEditableResource(
  props: InlineEditableResourceProps
) {
  const { visibleValue, value, isFake, onChange } = props;
  return (
    <InlineEdit
      render={({ onDone, editing, onStart }) => {
        if (editing) {
          return (
            <div
              style={{ width: 300 }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                }
              }}
            >
              <ClickStopper preventDefault>
                <Stated defaultValue={false}>
                  {(submitting, setSubmitting) => (
                    <OnClickAway onDone={onDone}>
                      <Textbox
                        styleType="seamless"
                        noOutline
                        autoFocus
                        selectAllOnFocus
                        defaultValue={value}
                        onEdit={async (val) => {
                          setSubmitting(true);
                          await onChange(val);
                          setSubmitting(false);
                          onDone();
                        }}
                        onEscape={onDone}
                        onBlur={onDone}
                        disabled={submitting}
                      />
                    </OnClickAway>
                  )}
                </Stated>
              </ClickStopper>
            </div>
          );
        }
        return (
          <EditableResourceName
            onEdit={() => {
              if (isFake) {
                notification.warn({
                  message:
                    "This operation can't be executed right now. Try again in a few seconds.",
                });
                return;
              }
              onStart();
            }}
            name={visibleValue ?? value}
          />
        );
      }}
    />
  );
}
