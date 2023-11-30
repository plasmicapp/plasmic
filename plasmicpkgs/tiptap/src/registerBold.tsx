import TiptapBold from "@tiptap/extension-bold";
import { useEffect } from "react";
import { useTiptapContext } from "./contexts";
import { TIPTAP_COMPONENT_NAME } from "./registerTiptap";
import { Registerable, registerComponentHelper } from "./utils";

export interface BoldProps {
  className: string;
}

export function Bold(props: BoldProps) {
  const { setBold } = useTiptapContext();

  useEffect(() => {
    setBold(
      TiptapBold.configure({
        HTMLAttributes: {
          class: props.className,
        },
      })
    );
    return () => {
      setBold(undefined);
    };
  }, []);

  return null;
}
Bold.displayName = "Bold";

export function registerBold(loader?: Registerable) {
  registerComponentHelper(loader, Bold, {
    name: `${TIPTAP_COMPONENT_NAME}-extension-bold`,
    displayName: "Tiptap Bold",
    props: {},
    importName: "Bold",
    importPath: "@plasmicpkgs/tiptap/skinny/registerBold",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
