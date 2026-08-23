import { TinyEditor } from "@/wab/client/components/TinyEditor";
import * as React from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function RichTextEditor(props: RichTextEditorProps) {
  return <TinyEditor {...props} />;
}

export default RichTextEditor;
