import { ClickStopper } from "@/wab/client/components/widgets";
import {
  DefaultEditableResourceNameProps,
  PlasmicEditableResourceName,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicEditableResourceName";
import React from "react";

interface EditableResourceNameProps extends DefaultEditableResourceNameProps {
  onEdit: () => void;
}

function EditableResourceName(props: EditableResourceNameProps) {
  const { onEdit, ...rest } = props;
  return (
    <PlasmicEditableResourceName
      {...rest}
      editButton={{
        wrap: (node) => (
          <ClickStopper
            style={{
              alignSelf: "center",
            }}
            preventDefault
          >
            {node}
          </ClickStopper>
        ),
        props: { onClick: onEdit },
      }}
    />
  );
}

export default EditableResourceName as React.FunctionComponent<EditableResourceNameProps>;
