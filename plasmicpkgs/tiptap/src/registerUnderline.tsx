import TiptapUnderline from "@tiptap/extension-underline";
import { useEffect } from "react";
import { useTiptapContext } from "./contexts";
import { TIPTAP_COMPONENT_NAME } from "./registerTiptap";
import { Registerable, registerComponentHelper } from "./utils";

export interface UnderlineProps {
  className: string;
}

export function Underline(props: UnderlineProps) {
  const { setUnderline } = useTiptapContext();

  useEffect(() => {
    setUnderline(
      TiptapUnderline.configure({
        HTMLAttributes: {
          class: props.className,
        },
      })
    );
    return () => {
      setUnderline(undefined);
    };
  }, []);

  return null;
}
Underline.displayName = "Underline";

export function registerUnderline(loader?: Registerable) {
  registerComponentHelper(loader, Underline, {
    name: `${TIPTAP_COMPONENT_NAME}-extension-underline`,
    displayName: "Tiptap Underline",
    props: {},
    importName: "Underline",
    importPath: "@plasmicpkgs/tiptap/skinny/registerUnderline",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
