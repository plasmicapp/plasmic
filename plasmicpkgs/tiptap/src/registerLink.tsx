import TiptapLink from "@tiptap/extension-link";
import { useEffect } from "react";
import { useTiptapContext } from "./contexts";
import { TIPTAP_COMPONENT_NAME } from "./registerTiptap";
import { Registerable, registerComponentHelper } from "./utils";

export interface LinkProps {
  className: string;
}

export function Link(props: LinkProps) {
  const { setLink } = useTiptapContext();

  useEffect(() => {
    setLink(
      TiptapLink.configure({
        HTMLAttributes: {
          class: props.className,
        },
      })
    );
    return () => {
      setLink(undefined);
    };
  }, []);

  return null;
}
Link.displayName = "Link";

export function registerLink(loader?: Registerable) {
  registerComponentHelper(loader, Link, {
    name: `${TIPTAP_COMPONENT_NAME}-extension-link`,
    displayName: "Tiptap Link",
    props: {},
    importName: "Link",
    importPath: "@plasmicpkgs/tiptap/skinny/registerLink",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
