import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import {
  ImageAssetOrUrlPicker,
  ImagePreview,
  ImgInfo,
} from "@/wab/client/components/style-controls/ImageSelector";
import { PlainLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import TrashIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Trash";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { isEditable } from "@/wab/shared/core/sites";
import { ImageAsset, isKnownImageAsset } from "@/wab/shared/model/classes";
import { placeholderImgUrl } from "@/wab/shared/urls";
import { Tooltip } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";

export const ImagePropEditor = observer(function ImagePropEditor(props: {
  attr: string;
  studioCtx: StudioCtx;
  value?: ImageAsset | string;
  onPicked: (picked: ImageAsset | string | undefined) => void;
  type: ImageAssetType;
  readOnly?: boolean;
}) {
  const { attr, studioCtx, value, onPicked, type, readOnly } = props;
  const asset = isKnownImageAsset(value) ? value : undefined;
  const uri =
    asset && asset.dataUri
      ? asset.dataUri
      : L.isString(value)
      ? value
      : undefined;
  const [pickingImage, setPickingImage] = React.useState(false);

  return (
    <div className={"flex-fill flex-row justify-between overflow-hidden"}>
      <ImgInfo
        url={uri ?? ""}
        extended
        imagePreview={
          <PlainLinkButton onClick={() => !readOnly && setPickingImage(true)}>
            <ImagePreview
              uri={uri ?? placeholderImgUrl()}
              style={{
                width: 48,
                height: 32,
              }}
              className="mr-ch img-thumb-border"
              size="cover"
            />
          </PlainLinkButton>
        }
        filename={
          <MaybeWrap
            cond={asset ? isEditable(studioCtx.site, asset) : false}
            wrapper={(x) =>
              readOnly ? (
                <Tooltip title="Replace image...">
                  {x as React.ReactElement}
                </Tooltip>
              ) : (
                (x as React.ReactElement)
              )
            }
          >
            <PlainLinkButton onClick={() => !readOnly && setPickingImage(true)}>
              {asset ? asset.name : !readOnly ? "Choose an image..." : ""}
            </PlainLinkButton>
          </MaybeWrap>
        }
      />
      {value && (
        <IconButton
          className={"flex-start"}
          hoverText={"Remove image"}
          onClick={(ev) => {
            onPicked(undefined);
          }}
        >
          <Icon icon={TrashIcon} />
        </IconButton>
      )}
      {pickingImage && (
        <SidebarModal
          title={attr}
          show={true}
          onClose={() => setPickingImage(false)}
        >
          <ImageAssetOrUrlPicker
            studioCtx={studioCtx}
            value={value}
            onPicked={(picked) => {
              onPicked(picked);
              setPickingImage(false);
            }}
            type={type}
            hideCancel={true}
          />
        </SidebarModal>
      )}
    </div>
  );
});
