import { DEVFLAGS } from "@/wab/devflags";
import { CmsDatabaseId } from "@/wab/shared/ApiSchema";
import * as React from "react";
import { useRouteMatch } from "react-router";
import { QuillEditor } from "./QuillEditor";
import { TinyEditor } from "./TinyEditor";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function RichTextEditor(props: RichTextEditorProps) {
  const route = useRouteMatch<{ databaseId: CmsDatabaseId }>();
  const Editor =
    DEVFLAGS.tinymceDatabaseIds.includes(route.params.databaseId) ||
    DEVFLAGS.forceTinymce
      ? TinyEditor
      : QuillEditor;
  return <Editor {...props} />;
}

export default RichTextEditor;
