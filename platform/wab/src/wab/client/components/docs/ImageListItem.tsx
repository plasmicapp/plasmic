import { ImageAsset } from "@/wab/classes";
import { U } from "@/wab/client/cli-routes";
import { PublicLink } from "@/wab/client/components/PublicLink";
import { ImagePreview } from "@/wab/client/components/style-controls/ImageSelector";
import {
  DefaultImageListItemProps,
  PlasmicImageListItem,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicImageListItem";
import { asOne, ensure } from "@/wab/common";
import { toClassName } from "@/wab/shared/codegen/util";
import { observer } from "mobx-react";
import * as React from "react";
import { DocsPortalCtx } from "./DocsPortalCtx";

interface ImageListItemProps extends Omit<DefaultImageListItemProps, "icon"> {
  icon: ImageAsset;
  docsCtx: DocsPortalCtx;
}

const ImageListItem = observer(function ImageListItem(
  props: ImageListItemProps
) {
  const { icon, docsCtx, ...rest } = props;
  return (
    <PlasmicImageListItem
      {...rest}
      root={{
        render: ({ children, ...rest2 }) => {
          return (
            <PublicLink
              {...(rest2 as any)}
              children={asOne(children)}
              href={U.projectDocsIcon({
                projectId: docsCtx.studioCtx.siteInfo.id,
                iconIdOrClassName: toClassName(icon.name) || icon.uuid,
                codegenType: docsCtx.getCodegenType(),
              })}
            />
          );
        },
      }}
      isSelected={docsCtx.tryGetFocusedIcon() === icon}
      icon={
        <ImagePreview
          uri={ensure(icon.dataUri, "must have dataUri")}
          className="mr-ch"
          style={{
            width: 16,
            height: 16,
          }}
        />
      }
    >
      {icon.name}
    </PlasmicImageListItem>
  );
});

export default ImageListItem;
