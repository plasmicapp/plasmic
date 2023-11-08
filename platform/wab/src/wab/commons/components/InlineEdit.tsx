import React, { ReactNode, useState } from "react";

export interface InlineEditHelpers {
  editing: boolean;
  onDone: () => void;
  onStart: () => void;
}

export interface InlineEditProps {
  render: (helpers: InlineEditHelpers) => ReactNode;
  defaultEditing?: boolean;
}

export interface InlineEditRef {
  setEditing: (editing: boolean) => void;
}

export const InlineEdit = React.forwardRef(function InlineEdit(
  { render, defaultEditing = false }: InlineEditProps,
  ref: React.Ref<InlineEditRef>
) {
  const [editing, setEditing] = useState(defaultEditing);
  React.useImperativeHandle(ref, () => ({
    setEditing,
  }));
  const onDone = () => setEditing(false);
  const onStart = () => setEditing(true);
  return (
    <>
      {render({
        editing,
        onStart,
        onDone,
      })}
    </>
  );
});
