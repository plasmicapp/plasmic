import { observer } from "mobx-react-lite";
import * as React from "react";
import { VariantGroup } from "../../../classes";
import { VARIANTS_CAP } from "../../../shared/Labels";
import { EditableLabel, EditableLabelHandles } from "../widgets/EditableLabel";

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

export const EditableGroupLabel = observer(EditableGroupLabel_, {
  forwardRef: true,
});
