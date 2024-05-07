import { useDocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import ImageListItem from "@/wab/client/components/docs/ImageListItem";
import { Matcher } from "@/wab/client/components/view-common";
import {
  DefaultImagesPanelProps,
  PlasmicImagesPanel,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicImagesPanel";
import { ImageAssetType } from "@/wab/image-asset-type";
import { Alert } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

type ImagesPanelProps = DefaultImagesPanelProps;

const ImagesPanel = observer(function ImagesPanel(props: ImagesPanelProps) {
  const docsCtx = useDocsPortalCtx();
  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);
  const icons = docsCtx.studioCtx.site.imageAssets.filter(
    (value) =>
      value.type === ImageAssetType.Icon &&
      !!value.dataUri &&
      matcher.matches(value.name)
  );

  return (
    <PlasmicImagesPanel
      {...props}
      searchbox={{
        value: query,
        onChange: (e) => setQuery(e.target.value),
        autoFocus: true,
      }}
    >
      <>
        {icons.map((icon) => (
          <ImageListItem key={icon.uid} icon={icon} docsCtx={docsCtx} />
        ))}

        {icons.length === 0 && (
          <Alert
            className="m-m"
            style={{ width: "100%" }}
            type="warning"
            showIcon
            message="No icons."
          />
        )}
      </>
    </PlasmicImagesPanel>
  );
});

export default ImagesPanel;
