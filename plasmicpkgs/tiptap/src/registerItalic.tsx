import TiptapItalic from "@tiptap/extension-italic";
import { useEffect } from "react";
import { useTiptapContext } from "./contexts";
import { TIPTAP_COMPONENT_NAME } from "./registerTiptap";
import { Registerable, registerComponentHelper } from "./utils";

export interface ItalicProps {
  className: string;
}

export function Italic(props: ItalicProps) {
  const { setItalic } = useTiptapContext();

  useEffect(() => {
    setItalic(
      TiptapItalic.configure({
        HTMLAttributes: {
          class: props.className,
        },
      })
    );
    return () => {
      setItalic(undefined);
    };
  }, []);

  return null;
}
Italic.displayName = "Italic";

export function registerItalic(loader?: Registerable) {
  registerComponentHelper(loader, Italic, {
    name: `${TIPTAP_COMPONENT_NAME}-extension-italic`,
    displayName: "Tiptap Italic",
    props: {},
    importName: "Italic",
    importPath: "@plasmicpkgs/tiptap/skinny/registerItalic",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
