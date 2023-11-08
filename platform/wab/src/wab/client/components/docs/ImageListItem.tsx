import { observer } from "mobx-react-lite";
import * as React from "react";
import { ImageAsset } from "../../../classes";
import { asOne, ensure } from "../../../common";
import { toClassName } from "../../../shared/codegen/util";
import { U } from "../../cli-routes";
import {
  DefaultImageListItemProps,
  PlasmicImageListItem,
} from "../../plasmic/plasmic_kit_docs_portal/PlasmicImageListItem";
import { PublicLink } from "../PublicLink";
import { ImagePreview } from "../style-controls/ImageSelector";
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
