import { useDocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { SidebarModalProvider } from "@/wab/client/components/sidebar/SidebarModal";
import { ColorButton } from "@/wab/client/components/style-controls/ColorButton";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import Textbox from "@/wab/client/components/widgets/Textbox";
import {
  DefaultIconTogglesPanelProps,
  PlasmicIconTogglesPanel,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicIconTogglesPanel";
import { lengthCssUnits } from "@/wab/css";
import { makeAssetClassName } from "@/wab/shared/codegen/image-assets";
import { observer } from "mobx-react";
import * as React from "react";
import { useLocalStorage } from "react-use";

type IconTogglesPanelProps = DefaultIconTogglesPanelProps;

const IconTogglesPanel = observer(function IconTogglesPanel(
  props: IconTogglesPanelProps
) {
  const docsCtx = useDocsPortalCtx();
  const icon = docsCtx.tryGetFocusedIcon();

  const [dismissed, setDismissed] = useLocalStorage(
    "IconTogglesPanel--dismissIconInfo",
    false
  );

  if (!icon) {
    return null;
  }

  return (
    <PlasmicIconTogglesPanel
      {...props}
      explanation={{
        defaultExpanded: !dismissed,
        children: <IconTogglesInfo />,
        onToggle: (expanded) => {
          if (!expanded && !dismissed) {
            setDismissed(true);
          }
        },
      }}
      header={makeAssetClassName(icon)}
      title={{
        children: (
          <Textbox
            styleType={"bordered"}
            value={docsCtx.getIconToggle(icon, "title")}
            onChange={(e) =>
              docsCtx.setIconToggle(icon, "title", e.target.value || undefined)
            }
            placeholder="Unset"
          />
        ),
      }}
      color={{
        primaryAnnotation: (
          <SidebarModalProvider>
            <ColorButton
              onChange={(val) => docsCtx.setIconToggle(icon, "color", val)}
              sc={docsCtx.studioCtx}
              color={docsCtx.getIconToggle(icon, "color")}
            />
          </SidebarModalProvider>
        ),
      }}
      width={{
        children: (
          <DimTokenSpinner
            min={1}
            value={docsCtx.getIconToggle(icon, "width") || ""}
            onChange={(v) => docsCtx.setIconToggle(icon, "width", v)}
            allowedUnits={lengthCssUnits}
            styleType={["bordered"]}
            placeholder="Unset"
          />
        ),
      }}
      height={{
        children: (
          <DimTokenSpinner
            min={1}
            value={docsCtx.getIconToggle(icon, "height") || ""}
            onChange={(v) => docsCtx.setIconToggle(icon, "height", v)}
            allowedUnits={lengthCssUnits}
            styleType={["bordered"]}
            placeholder="Unset"
          />
        ),
      }}
      resetButton={{
        onClick: () => docsCtx.resetIconToggles(icon),
      }}
    />
  );
});

export default IconTogglesPanel;

function IconTogglesInfo() {
  return (
    <div>
      Each SVG icon added to Plasmic can be used as a React component. Each
      component takes in the usual props you can pass into an <code>svg</code>{" "}
      element. By default, its size is <code>1em</code>.
    </div>
  );
}
