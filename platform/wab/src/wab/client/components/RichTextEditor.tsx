import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { ensure } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import { notification } from "antd";
import { last } from "lodash";
import * as React from "react";
import ReactQuill, { Quill, ReactQuillProps } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { promptFileUpload } from "./sidebar/image-asset-controls";

const Delta = Quill.import("delta");

export function RichTextEditor(props: ReactQuillProps) {
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
                  const editor = editorRef.current?.getEditor();
                  const imgId = ensure(
                    last(uploaded.dataUri.split("/")),
                    "Expected imgId"
                  );
                  let imgUrl = uploaded.dataUri;

                  if (!uploaded.mimeType?.includes("svg")) {
                    imgUrl = `${DEVFLAGS.imgOptimizerHost}/img-optimizer/v1/img/${imgId}?f=webp&q=75`;
                    if (uploaded.width > 3840) {
                      // Cap width at 3840
                      imgUrl += "&w=3840";
                    }
                  }
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
