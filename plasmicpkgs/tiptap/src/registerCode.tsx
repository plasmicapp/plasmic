import TiptapCode from "@tiptap/extension-code";
import { useEffect } from "react";
import { useTiptapContext } from "./contexts";
import { TIPTAP_COMPONENT_NAME } from "./registerTiptap";
import { Registerable, registerComponentHelper } from "./utils";

export interface CodeProps {
  className: string;
}

export function Code(props: CodeProps) {
  const { setCode } = useTiptapContext();

  useEffect(() => {
    setCode(
      TiptapCode.configure({
        HTMLAttributes: {
          class: props.className,
        },
      })
    );
    return () => {
      setCode(undefined);
    };
  }, []);

  return null;
}
Code.displayName = "Code";

export function registerCode(loader?: Registerable) {
  registerComponentHelper(loader, Code, {
    name: `${TIPTAP_COMPONENT_NAME}-extension-code`,
    displayName: "Tiptap Code",
    props: {},
    importName: "Code",
    importPath: "@plasmicpkgs/tiptap/skinny/registerCode",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
