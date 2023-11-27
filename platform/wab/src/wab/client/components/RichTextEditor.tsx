import { DEVFLAGS } from "@/wab/devflags";
import * as React from "react";
import { QuillEditor } from "./QuillEditor";
import { TinyEditor } from "./TinyEditor";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function RichTextEditor(props: RichTextEditorProps) {
  const Editor =
    DEVFLAGS.cmsRichTextEditor === "tinymce" ? TinyEditor : QuillEditor;
  return <Editor {...props} />;
}
