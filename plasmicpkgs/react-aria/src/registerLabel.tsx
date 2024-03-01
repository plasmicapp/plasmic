import { Label } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export const BaseLabel = Label;

export function registerLabel(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseLabel>
) {
  registerComponentHelper(
    loader,
    BaseLabel,
    {
      name: makeComponentName("label"),
      displayName: "Aria Label",
      importPath: "@plasmicpkgs/react-aria/skinny/registerLabel",
      importName: "BaseLabel",
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
