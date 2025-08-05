import { PublicLink } from "@/wab/client/components/PublicLink";
import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { ImagePreview } from "@/wab/client/components/style-controls/ImageSelector";
import {
  DefaultImageListItemProps,
  PlasmicImageListItem,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicImageListItem";
import { toClassName } from "@/wab/shared/codegen/util";
import { asOne, ensure } from "@/wab/shared/common";
import { ImageAsset } from "@/wab/shared/model/classes";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { observer } from "mobx-react";
import * as React from "react";

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
              href={fillRoute(APP_ROUTES.projectDocsIcon, {
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
