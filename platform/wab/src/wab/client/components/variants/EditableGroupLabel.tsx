import { VariantGroup } from "@/wab/classes";
import {
  EditableLabel,
  EditableLabelHandles,
} from "@/wab/client/components/widgets/EditableLabel";
import { VARIANTS_CAP } from "@/wab/shared/Labels";
import { observer } from "mobx-react";
import * as React from "react";

interface EditableGroupLabelProps {
  onEdit: (name: string) => void;
  defaultEditing?: boolean;
  group: VariantGroup;
}

function EditableGroupLabel_(
  { group, onEdit, defaultEditing }: EditableGroupLabelProps,
  ref: React.Ref<EditableLabelHandles>
) {
  return (
    <EditableLabel
      labelFactory={(p) => <div {...p} className="flex-fill" />}
      value={group.param.variable.name}
      ref={ref}
      doubleClickToEdit
      defaultEditing={defaultEditing}
      inputBoxPlaceholder={`${VARIANTS_CAP} group name`}
      onEdit={onEdit}
    />
  );
}

export const EditableGroupLabel = observer(
  React.forwardRef(EditableGroupLabel_)
);
