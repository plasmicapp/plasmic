import TiptapStrike from "@tiptap/extension-strike";
import { useEffect } from "react";
import { useTiptapContext } from "./contexts";
import { TIPTAP_COMPONENT_NAME } from "./registerTiptap";
import { Registerable, registerComponentHelper } from "./utils";

export interface StrikeProps {
  className: string;
}

export function Strike(props: StrikeProps) {
  const { setStrike } = useTiptapContext();

  useEffect(() => {
    setStrike(
      TiptapStrike.configure({
        HTMLAttributes: {
          class: props.className,
        },
      })
    );
    return () => {
      setStrike(undefined);
    };
  }, []);

  return null;
}
Strike.displayName = "Strike";

export function registerStrike(loader?: Registerable) {
  registerComponentHelper(loader, Strike, {
    name: `${TIPTAP_COMPONENT_NAME}-extension-strike`,
    displayName: "Tiptap Strike",
    props: {},
    importName: "Strike",
    importPath: "@plasmicpkgs/tiptap/skinny/registerStrike",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
