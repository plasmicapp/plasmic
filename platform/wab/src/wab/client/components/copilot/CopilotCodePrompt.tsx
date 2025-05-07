import { CopilotPromptDialog } from "@/wab/client/components/copilot/CopilotPromptDialog";
import PlasmicCopilotCodePrompt from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotCodePrompt";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";

export interface CopilotCodePromptProps {
  data?: any;
  currentValue?: string;
  onUpdate: (newValue: string) => void;
  // A brief description of what the expression is supposed to be used for
  context?: string;
  type: "code" | "sql";
  // Only set when `isSql` is true
  dataSourceSchema?: DataSourceSchema;
  className: string;
}

export const CopilotCodePrompt = observer(function CopilotCodePrompt({
  onUpdate,
  currentValue,
  data,
  context,
  type,
  dataSourceSchema,
  className,
}: CopilotCodePromptProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <PlasmicCopilotCodePrompt
      className={className}
      openCopilotBtn={{
        props: {
          onClick: () => {
            setDialogOpen(true);
          },
        },
        wrap: (elt) => (
          <>
            <Tooltip title={"Open Copilot"} mouseEnterDelay={0.5}>
              {elt}
            </Tooltip>
            <CopilotPromptDialog
              dialogOpen={dialogOpen}
              onDialogOpenChange={(open) => setDialogOpen(open)}
              onUpdate={onUpdate}
              currentValue={currentValue}
              data={data}
              context={context}
              dataSourceSchema={dataSourceSchema}
              type={type}
            />
          </>
        ),
      }}
    />
  );
});
