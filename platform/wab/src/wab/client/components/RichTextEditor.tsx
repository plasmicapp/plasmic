import { CmsDatabaseId } from "@/wab/shared/ApiSchema";
import * as React from "react";
import { useRouteMatch } from "react-router";
import { TinyEditor } from "./TinyEditor";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function RichTextEditor(props: RichTextEditorProps) {
  const route = useRouteMatch<{ databaseId: CmsDatabaseId }>();
  return <TinyEditor {...props} />;
}

export default RichTextEditor;
