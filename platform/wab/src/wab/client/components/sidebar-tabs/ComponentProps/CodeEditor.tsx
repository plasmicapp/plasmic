import type { FullCodeEditor } from "@/wab/client/components/coding/FullCodeEditor";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import {
  FileUploadLink,
  ObserverLoadable,
} from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { readUploadedFileAsText } from "@/wab/client/dom-utils";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { validJsIdentifierChars } from "@/wab/shared/codegen/util";
import { ensure, swallow } from "@/wab/shared/common";
import { tryEvalExpr } from "@/wab/shared/eval";
import { isValidJavaScriptCode } from "@/wab/shared/parser-utils";
import { notification, Tooltip } from "antd";
import { default as classNames } from "classnames";
import jsonrepair from "jsonrepair";
import { observer } from "mobx-react";
import React from "react";
import { FocusScope } from "react-aria";

const softStrSizeLimit = 500 * 1024; // 500KB
const hardStrSizeLimit = 5000 * 1024; // 5MB

export function checkStrSizeLimit(val: string) {
  if (val.length > hardStrSizeLimit) {
    notification.warn({
      message: "Value is longer than 5MB",
      description: "Please provide a shorter value.",
    });
    return false;
  }
  if (val.length > softStrSizeLimit) {
    notification.warn({
      message: "Value is longer than 500KB",
      description:
        "This long content will be embedded into your page, which will increase load time.",
    });
  }
  return true;
}

export function checkSyntaxError(val: string) {
  try {
    return (
      isValidJavaScriptCode(`(${val})`) ||
      isValidJavaScriptCode(val, { throwIfInvalid: true })
    );
  } catch (err) {
    if (err instanceof SyntaxError) {
      notification.warn({
        message: "Syntax error",
        description: `The expression has a syntax error, it's required to fix it before saving. ${err.message}`,
      });
      return false;
    }
  }

  return true;
}

export function checkDisallowedUseOfLibs(val: string) {
  const validVariableChars = validJsIdentifierChars({
    allowUnderscore: true,
    allowDollarSign: true,
  });
  const unexpectedLibUsageRegExp = new RegExp(
    [
      "(^|((?![",
      ...validVariableChars,
      "])[\\s\\S]))",
      "\\$\\$",
      "(?!\\s*\\.\\s*",
      "[",
      ...validVariableChars,
      "]+",
      ")",
      "($|((?![",
      ...validVariableChars,
      "])[\\s\\S]))",
    ].join(""),
    "g"
  );

  if (val.match(unexpectedLibUsageRegExp)) {
    notification.warn({
      message: (
        <>
          Unexpected usage of <code>$$</code>
        </>
      ),
      description: (
        <>
          The <code>$$</code> object can only be used to access libraries
          directly, for example: <code>$$.libName</code>, as a way to import the
          used libraries and functions into your code snippet.
          <br /> <br />
          Please do not use <code>$$</code> as a "normal" variable.
        </>
      ),
      duration: 20,
    });
    return false;
  }
  return true;
}

export const CodeEditor = observer(function CodeEditor(props: {
  title: string;
  value: string | {} | null | undefined;
  onChange: (value: string | null | undefined) => void;
  lang: "html" | "css" | "javascript" | "typescript" | "json" | "text";
  defaultFullscreen?: boolean;
  isCustomCode?: boolean;
  saveAsObject?: boolean;
  requireObject?: boolean;
  data?: Record<string, any>;
  isDisabled?: boolean;
  disabledTooltip?: React.ReactNode;
  "data-plasmic-prop"?: string;
}) {
  const {
    value,
    onChange,
    lang,
    defaultFullscreen,
    isCustomCode,
    saveAsObject,
    requireObject,
    data,
  } = props;
  const stringValue =
    (lang === "json" && saveAsObject) || (value && typeof value === "object")
      ? swallow(() => JSON.stringify(value, undefined, 2))
      : (value as string | null | undefined);
  const [show, setShow] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(defaultFullscreen);
  const editor = React.useRef<FullCodeEditor>(null);
  const [draft, setDraft] = React.useState<string>();
  const CodeModal = fullscreen ? Modal : SidebarModal;
  const codeModalRef = React.useRef(CodeModal);
  codeModalRef.current = CodeModal;
  let evaluatedValue: string | null | undefined = "";
  if (isCustomCode && data && value && typeof value !== "object") {
    const evalExpr = tryEvalExpr(value as string, data);
    evaluatedValue = evalExpr.err
      ? stringValue
      : swallow(() => JSON.stringify(evalExpr.val, undefined, undefined));
  } else {
    evaluatedValue = stringValue;
  }
  const onCancel = () => {
    // This function might be called if we are unmounting a Modal
    // to mount the other one
    if (codeModalRef.current === CodeModal) {
      setShow(false);
      setDraft(undefined);
      setFullscreen(defaultFullscreen);
    } else {
      setDraft(editor.current?.getValue());
    }
  };
  const trySave = (val: string) => {
    if (!checkStrSizeLimit(val)) {
      return false;
    }
    if (lang === "json") {
      try {
        val = jsonrepair(val);
      } catch {}
    }
    if (lang === "json" && requireObject) {
      if (val[0] !== "{") {
        notification.warn({
          message: "Invalid JSON object",
          description: "Only JSON objects (wrapped in {}) are supported.",
        });
        return false;
      }
    }
    if (lang === "json" && saveAsObject) {
      try {
        const jsonObj = JSON.parse(val);
        onChange(jsonObj);
        setDraft(undefined);
        return true;
      } catch (err) {
        notification.warn({
          message: "Invalid JSON",
          description: `${err}`,
        });
        return false;
      }
    } else {
      onChange(val);
      setDraft(undefined);
      return true;
    }
  };
  const modalProps = fullscreen
    ? {
        visible: show,
        width: 1024,
        bodyStyle: { overflowX: "scroll" as any },
        footer: null,
        onCancel,
      }
    : {
        show,
        onClose: onCancel,
      };

  return (
    <>
      <div
        className="code-editor-input"
        onClick={() => !props.isDisabled && setShow(true)}
        data-plasmic-prop={props["data-plasmic-prop"]}
      >
        <Tooltip title={props.isDisabled && props.disabledTooltip}>
          <span
            className={classNames("text-align-left", {
              "text-set": isCustomCode ? evaluatedValue : stringValue,
              "text-unset": !(isCustomCode ? evaluatedValue : stringValue),
            })}
          >
            {isCustomCode ? evaluatedValue : stringValue ?? "unset"}
          </span>
        </Tooltip>
      </div>
      <CodeModal {...modalProps} title={props.title}>
        <MaybeWrap
          cond={fullscreen ?? false}
          wrapper={(x) => <FocusScope contain>{x}</FocusScope>}
        >
          <div
            style={{
              height: "auto",
              minHeight: fullscreen ? 512 : 350,
            }}
            className="flex-col"
          >
            {fullscreen && (
              <div className="mb-lg flex-col">
                <div className="mb-sm">
                  {"Enter your content or "}
                  <FileUploadLink
                    onChange={async (files) => {
                      if (files === null || files.length === 0) {
                        return;
                      }
                      const file = files[0];
                      if (
                        file.type.startsWith("text/") ||
                        ["css", "html", "javascript", "json"].some((str) =>
                          file.type.includes(str)
                        )
                      ) {
                        const contents = await readUploadedFileAsText(file);
                        trySave(contents);
                      } else {
                        notification.error({
                          message: "Unknown file format",
                          description: "Please make sure to upload a text file",
                        });
                      }
                    }}
                  >
                    upload a file
                  </FileUploadLink>
                  .
                </div>
              </div>
            )}
            <ObserverLoadable
              loader={() =>
                import("@/wab/client/components/coding/FullCodeEditor").then(
                  ({ FullCodeEditor }) => FullCodeEditor
                )
              }
              contents={(FullCodeEditor) => (
                <FullCodeEditor
                  ref={editor}
                  hideLineNumbers={true}
                  language={lang}
                  defaultValue={draft ?? stringValue ?? ""}
                  data={data}
                  onSave={trySave}
                  editorHeight={fullscreen ? 396 : 310}
                />
              )}
            />
            <div className="flex flex-right mt-lg mr-xlg">
              <Button
                onClick={() => {
                  setShow(false);
                  setDraft(undefined);
                  setFullscreen(defaultFullscreen);
                  editor.current?.resetValue();
                }}
              >
                Cancel
              </Button>
              <Button
                className={"ml-lg"}
                onClick={() => {
                  if (
                    trySave(
                      ensure(
                        editor.current,
                        "Editor must exist to save"
                      ).getValue()
                    )
                  ) {
                    setShow(false);
                    setDraft(undefined);
                  }
                }}
                type={"primary"}
                data-test-id={"save-code"}
              >
                Save
              </Button>
              {!fullscreen && (
                <Button
                  className={"ml-lg"}
                  onClick={() => {
                    codeModalRef.current = Modal;
                    setFullscreen(true);
                  }}
                  type={"primary"}
                >
                  Fullscreen
                </Button>
              )}
            </div>
          </div>
        </MaybeWrap>
      </CodeModal>
    </>
  );
});
