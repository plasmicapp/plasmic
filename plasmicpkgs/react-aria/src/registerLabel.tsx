import { Label } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export const BaseLabel = Label;

export const LABEL_COMPONENT_NAME = makeComponentName("label");

export function registerLabel(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseLabel>
) {
  registerComponentHelper(
    loader,
    BaseLabel,
    {
      name: LABEL_COMPONENT_NAME,
      displayName: "Aria Label",
      importPath: "@plasmicpkgs/react-aria/skinny/registerLabel",
      importName: "BaseLabel",
      defaultStyles: {
        cursor: "pointer",
      },
      props: {
        children: {
          type: "slot",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
