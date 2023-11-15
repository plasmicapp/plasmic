import { Button as BaseButton } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";

export { BaseButton };

export function registerButton(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseButton>
) {
  registerComponentHelper(
    loader,
    BaseButton,
    {
      name: "plasmic-react-aria-button",
      displayName: "BaseButton",
      importPath: "@plasmicpkgs/react-aria/registerButton",
      importName: "BaseButton",
      props: {
        children: {
          type: "slot",
          mergeWithParent: true as any,
        },
        className: {
          type: "class",
          displayName: "Additional states",
          selectors: [
            {
              selector: ":self[data-hovered]",
              label: "Hovered",
            },
            {
              selector: ":self[data-pressed]",
              label: "Pressed",
            },
            {
              selector: ":self[data-focused]",
              label: "Focused",
            },
            {
              selector: ":self[data-focus-visible]",
              label: "Focused by keyboard",
            },
            {
              selector: ":self[data-disabled]",
              label: "Disabled",
            },
          ],
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
