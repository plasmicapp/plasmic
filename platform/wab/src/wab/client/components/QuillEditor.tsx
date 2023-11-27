import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { notification } from "antd";
import * as React from "react";
import {
  getCmsImageUrl,
  promptFileUpload,
} from "./sidebar/image-asset-controls";

import ReactQuill, { Quill, ReactQuillProps } from "react-quill";
import "react-quill/dist/quill.snow.css";
const Delta = Quill.import("delta");

export function QuillEditor(props: ReactQuillProps) {
  const appCtx = useAppCtx();
  const editorRef = React.useRef<ReactQuill>(null);
  // The modules is an important "dirty prop"; any change here requires
  // Quill to be re-instantiated.  So we define it here, instead of
  // in the rendering function.
  const modules = React.useMemo(
    () => ({
      toolbar: {
        container: [
          // Hiding these formatting-only in favor of more semantic markdown-ish documents
          // [{ font: [] }, { size: [] }],
          [{ header: [1, 2, 3, 4, 5, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [
            { list: "ordered" },
            { list: "bullet" },
            { indent: "-1" },
            { indent: "+1" },
          ],
          ["link", "image", "video", "formula"],
          ["blockquote", "code-block"],
          [{ script: "super" }, { script: "sub" }],
          ["direction", { align: [] }],
          ["clean"],
        ],
        handlers: {
          image: async () => {
            await appCtx.app.withSpinner(
              (async () => {
                try {
                  const uploaded = await promptFileUpload(appCtx);
                  if (!uploaded) {
                    return;
                  }
                  const imgUrl = getCmsImageUrl(uploaded);
                  const editor = editorRef.current?.getEditor();
                  if (editor) {
                    const range = editor.getSelection(true);
                    editorRef.current
                      ?.getEditor()
                      .updateContents(
                        new Delta()
                          .retain(range.index)
                          .delete(range.length)
                          .insert({ image: imgUrl })
                      );
                  }
                } catch (err) {
                  notification.error({ message: err.message });
                }
              })()
            );
          },
        },
      },
    }),
    [appCtx, editorRef]
  );
  return (
    <ReactQuill ref={editorRef} modules={modules} theme="snow" {...props} />
  );
}
