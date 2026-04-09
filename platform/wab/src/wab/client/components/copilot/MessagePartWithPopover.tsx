import { MessagePartLabel } from "@/wab/client/components/copilot/MessagePartLabel";
import { MessagePartPopoverContent } from "@/wab/client/components/copilot/MessagePartPopoverContent";
import { Popover } from "antd";
import * as React from "react";

export function MessagePartWithPopover({
  label,
  state,
  popoverTitle,
  popoverContent,
}: {
  label: string;
  state: "loading" | "done" | "error";
  popoverTitle: string;
  popoverContent: React.ReactNode;
}) {
  return (
    <Popover
      placement="leftBottom"
      trigger="hover"
      content={
        <MessagePartPopoverContent
          title={popoverTitle}
          content={{
            wrapChildren: () => popoverContent,
          }}
        />
      }
    >
      <MessagePartLabel label={label} state={state} />
    </Popover>
  );
}
