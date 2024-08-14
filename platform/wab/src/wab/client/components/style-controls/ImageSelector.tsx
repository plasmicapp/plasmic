import { ReadableClipboard } from "@/wab/client/clipboard/ReadableClipboard";
import { ImageAssetSidebarPopup } from "@/wab/client/components/sidebar/image-asset-controls";
import { FileUploader, PlainLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import { Textbox, TextboxRef } from "@/wab/client/components/widgets/Textbox";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  ResizableImage,
  maybeUploadImage,
  readAndSanitizeFileAsImage,
} from "@/wab/client/dom-utils";
import ArrowRightIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowRight";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import ImageBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageBlock";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import {
  Cancelable,
  cx,
  ensure,
  makeCancelable,
  spawnWrapper,
} from "@/wab/shared/common";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { allImageAssets, isEditable } from "@/wab/shared/core/sites";
import { ImageAsset, isKnownImageAsset } from "@/wab/shared/model/classes";
import { placeholderImgUrl } from "@/wab/shared/urls";
import { Select, Tooltip, notification } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import React, { CSSProperties } from "react";
import validator from "validator";

export const ImageAssetPreviewAndPicker = observer(
  function ImageAssetPreviewAndPicker(props: {
    studioCtx: StudioCtx;
    value?: ImageAsset | string;
    onPicked: (picked: ImageAsset | string) => void;
    type: ImageAssetType;
    className?: string;
    keepOpen?: boolean; // don't allow user to close the image picker, if there is no image selected
    forFallback?: boolean;
  }) {
    const { studioCtx, value, onPicked, type, keepOpen, forFallback } = props;
    const asset = isKnownImageAsset(value) ? value : undefined;
    const uri =
      asset && asset.dataUri
        ? asset.dataUri
        : L.isString(value)
        ? value
        : undefined;
    const isIcon = type === ImageAssetType.Icon;

    const [pickingImage, setPickingImage] = React.useState(
      !forFallback && (uri === placeholderImgUrl(isIcon) || !uri)
    );
    const [showAssetPopup, setShowAssetPopup] = React.useState(false);

    React.useEffect(() => {
      if (!uri && !forFallback) {
        setPickingImage(true);
      }
    }, [uri, forFallback]);

    const previewHeight = forFallback ? 28 : isIcon ? 50 : 150;

    return (
      <div
        className={cx("flex-col", props.className)}
        data-test-id={"image-picker"}
      >
        {!pickingImage && (
          <>
            <ImagePreview
              uri={uri ?? placeholderImgUrl(isIcon)}
              style={{
                height: previewHeight,
              }}
              hoverMsg={<>Replace image...</>}
              onClick={() => setPickingImage(true)}
              size="contain"
              showCheckboard={true}
            />
            {uri && (
              <div className="mt-sm">
                <ImgInfo
                  url={uri}
                  filename={
                    asset && (
                      <MaybeWrap
                        cond={isEditable(studioCtx.site, asset)}
                        wrapper={(x) => (
                          <Tooltip title="Update image asset">
                            <PlainLinkButton
                              onClick={() => setShowAssetPopup(true)}
                            >
                              {x as React.ReactElement}
                            </PlainLinkButton>
                          </Tooltip>
                        )}
                      >
                        <>
                          <Icon icon={ImageBlockIcon} className="mr-xs" />
                          {asset.name}
                        </>
                      </MaybeWrap>
                    )
                  }
                />
              </div>
            )}
          </>
        )}
        {pickingImage && (
          <div className="mt-m">
            <ImageAssetOrUrlPicker
              studioCtx={studioCtx}
              value={value}
              onPicked={(picked) => {
                onPicked(picked);
                setPickingImage(false);
              }}
              onCancel={() => setPickingImage(false)}
              type={type}
              keepOpen={keepOpen}
            />
          </div>
        )}
        {showAssetPopup && asset && (
          <ImageAssetSidebarPopup
            asset={asset}
            editable // consider using the left tab icons/images setting here?
            onClose={() => setShowAssetPopup(false)}
            studioCtx={studioCtx}
          />
        )}
      </div>
    );
  }
);

type ImgInfoProps = {
  url: string;
  filename?: React.ReactNode;
  imagePreview?: React.ReactNode;
  extended?: boolean;
};
interface ImgInfoState {
  img: HTMLImageElement | undefined;
}

function useImageSize(url: string) {
  const promiseRef = React.useRef<Cancelable<any> | null>(null);
  const [size, setSize] = React.useState<
    { width: number; height: number } | undefined
  >(undefined);
  React.useEffect(() => {
    const img = new Image();
    promiseRef.current = makeCancelable(
      new Promise((resolve) => (img.onload = resolve))
    );
    img.src = url;
    promiseRef.current.promise
      .then(() => {
        setSize({ width: img.width, height: img.height });
      })
      .catch(() => {});

    return () => {
      if (promiseRef.current) {
        promiseRef.current.cancel();
      }
    };
  }, [url]);
  return size;
}

export function ImgInfo(props: ImgInfoProps) {
  const { url, filename, imagePreview, extended } = props;
  const size = url ? useImageSize(url) : undefined;

  if (extended) {
    return (
      <div>
        <div className={"flex flex-vcenter overflow-hidden dimfg"}>
          <div className={"flex-fill flex flex-vcenter"}>{imagePreview}</div>
          {size && (
            <div className="flex-push-right nowrap ml-ch">{`${size.width} × ${size.height}`}</div>
          )}
        </div>
        <div className="text-ellipsis overflow-hidden dimfg">{filename}</div>
      </div>
    );
  }

  return (
    <div className={"flex flex-vcenter overflow-hidden dimfg"}>
      <div className={"flex-fill text-ellipsis flex flex-vcenter"}>
        {filename}
      </div>
      {size && (
        <div className="flex-push-right nowrap ml-ch">{`${size.width} × ${size.height}`}</div>
      )}
    </div>
  );
}

export function ImagePreview(props: {
  uri?: string;
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  hoverMsg?: React.ReactNode;
  onClick?: () => void;
  size?: "cover" | "contain";
  showCheckboard?: boolean;
}) {
  return (
    <div
      className={cx("image-preview", props.className)}
      onClick={props.onClick}
      style={props.style}
    >
      <div
        className={cx("img-thumb__checkers", {
          "img-thumb__checkers--shown": props.showCheckboard,
        })}
      >
        <div
          className={"img-thumb"}
          style={{
            backgroundImage: !props.children
              ? `url("${props.uri ?? placeholderImgUrl()}")`
              : "none",
            backgroundSize: props.size || "cover",
          }}
        >
          {props.children}
        </div>
      </div>
      {props.hoverMsg && (
        <div className="image-preview__msg-overlay">
          <div className="image-preview__msg">{props.hoverMsg}</div>
        </div>
      )}
    </div>
  );
}

export const ImageAssetOrUrlPicker = observer(
  function ImageAssetOrUrlPicker(props: {
    studioCtx: StudioCtx;
    value?: ImageAsset | string;
    onPicked: (picked: ImageAsset | string) => void;
    onCancel?: () => void;
    type: ImageAssetType;
    keepOpen?: boolean;
    hideCancel?: boolean;
  }) {
    const { studioCtx, onPicked, onCancel, type, value, keepOpen, hideCancel } =
      props;
    const [urlInputError, setUrlInputError] = React.useState<
      string | undefined
    >(undefined);
    const formRef = React.useRef<HTMLFormElement>(null);
    const urlInputRef = React.useRef<TextboxRef>(null);

    const isDataUrl = L.isString(value) && value.startsWith("data:");

    const handleImageUploaded = async (image: ResizableImage, file?: File) => {
      const { imageResult, opts } = await studioCtx.app.withSpinner(
        (async () => {
          return await maybeUploadImage(studioCtx.appCtx, image, type, file);
        })()
      );
      if (!imageResult || !opts) {
        return;
      }
      return studioCtx.change(({ success }) => {
        const asset = studioCtx.siteOps().createImageAsset(imageResult, opts);
        if (asset) {
          onPicked(asset.asset);
        }
        return success();
      });
    };

    const handleUrlInput = (e: React.FormEvent) => {
      e.preventDefault();
      const urlInputHandle = ensure(
        urlInputRef.current,
        "Unexpected undefined urlInputRef"
      );
      const urlInputValue = urlInputHandle.value();
      if (!validator.isURL(urlInputValue)) {
        setUrlInputError("Enter a valid URL");
        return;
      }
      urlInputHandle.setValue("");
      onPicked(urlInputValue);
    };

    const urlForm = (
      <form onSubmit={handleUrlInput} ref={formRef}>
        <Textbox
          selectAllOnFocus={true}
          autoFocus={false}
          ref={urlInputRef}
          onChange={() => setUrlInputError(undefined)}
          placeholder={"Enter a URL"}
          // Avoid setting dataUrl in this textbox because it's ugly, but
          // more importantly because it slows down the app to a crawl if
          // it's a big file!
          // Also don't show the url of the placeholder file.
          defaultValue={
            isDataUrl || !L.isString(value) || value === placeholderImgUrl()
              ? ""
              : value
          }
          data-test-id="image-url-input"
          error={!!urlInputError}
          withIcons={["withSuffix"]}
          suffixIcon={
            <IconButton type="seamless" htmlType="submit">
              <Icon icon={ArrowRightIcon} />
            </IconButton>
          }
        />
        <div>
          {urlInputError && (
            <div className={"validation-error"}>{urlInputError}</div>
          )}
        </div>
      </form>
    );

    const selectableAssets = allImageAssets(studioCtx.site, {
      includeDeps: "direct",
    }).filter((x) => x.type === type && x.dataUri);

    return (
      <div className={"panel-dim-block rel"}>
        {/*
          In some cases it's not good to close the image picker if
          some value is not selected, without handling this case
          the following cenario is possible:
            The user adds an img TplTag in the canvas, if he closes
            the image picker the Image section on the right side
            panel would become empty, and is necessary to unfocus
            and focus the img TplTag to appear again
        */}
        {onCancel && (!keepOpen || value) && !hideCancel && (
          <Tooltip title="Cancel">
            <IconButton
              onClick={() => onCancel && onCancel()}
              className="absolute"
              style={{
                right: 4,
                top: 4,
              }}
              size="small"
            >
              <Icon icon={CloseIcon} />
            </IconButton>
          </Tooltip>
        )}
        <div className={"flex-col"}>
          {selectableAssets.length > 0 && (
            <>
              <div className="mb-sm">
                {"Pick an existing "}
                {type === ImageAssetType.Icon ? "icon" : "image"}
              </div>
              <Select
                className={cx({
                  "flex-fill textboxlike code flex-stretch": true,
                })}
                value={isKnownImageAsset(value) ? value.uuid : undefined}
                onChange={(val) =>
                  props.onPicked(
                    ensure(
                      selectableAssets.find((x) => x.uuid === val),
                      "Unexpected undefined asset selected"
                    )
                  )
                }
                showSearch
                filterOption={(val, option) =>
                  !!(
                    option &&
                    option.name.toLowerCase().includes(val.toLowerCase())
                  )
                }
                optionLabelProp="label"
                suffixIcon={<Icon icon={TriangleBottomIcon} />}
                placeholder={`Select an ${
                  type === ImageAssetType.Icon ? "icon" : "image"
                }`}
                options={selectableAssets.map((asset) => ({
                  value: asset.uuid,
                  label: (
                    <>
                      <ImagePreview
                        className="mr-ch"
                        uri={ensure(
                          asset.dataUri,
                          "Unexpected undefinde dataUri in asset"
                        )}
                        style={{ width: 28, height: 28 }}
                      />
                      {asset.name}
                    </>
                  ),
                  name: asset.name,
                }))}
              />
            </>
          )}
          {selectableAssets.length > 0 ? (
            <div className="mv-sm">{"or upload a new image"}</div>
          ) : (
            <div className="mb-sm">{"Upload a new image"}</div>
          )}
          <ImageUploader
            onUploaded={handleImageUploaded}
            accept={
              type === ImageAssetType.Picture
                ? ".gif,.jpg,.jpeg,.png,.tif,.svg"
                : ".svg"
            }
          />
          <div className="mv-sm">{"or paste a new image from clipboard"}</div>
          <ImagePaster onPasted={handleImageUploaded} />
          {type === ImageAssetType.Picture && (
            <>
              <div className="mv-sm">{"or enter a URL"}</div>
              {urlForm}
            </>
          )}
          {type === ImageAssetType.Icon ? (
            <div className="mv-sm">
              {"You can find free SVG icons on galleries like "}
              <a href="https://www.svgrepo.com/" target="_blank">
                {"SVG Repo"}
              </a>
              {"."}
            </div>
          ) : (
            <div className="mv-sm">
              {"You can find free images on galleries like "}
              <a href="https://unsplash.com/" target="_blank">
                {"Unsplash"}
              </a>
              {" and "}
              <a href="https://burst.shopify.com/" target="_blank">
                {"Burst"}
              </a>
              {"."}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export function ImageUploader(props: {
  onUploaded: (image: ResizableImage, file: File) => void;
  accept?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
}) {
  const appCtx = useAppCtx();
  const { onUploaded, accept, children, isDisabled } = props;
  const handleUploadChange = async (fileList: FileList | null) => {
    if (fileList === null || fileList.length === 0) {
      return;
    }
    const file = fileList[0];
    const image = await readAndSanitizeFileAsImage(appCtx, file);
    if (!image) {
      notification.error({
        message: "Invalid image",
      });
      return;
    }
    onUploaded(image, file);
  };
  return (
    <FileUploader
      onChange={handleUploadChange}
      accept={accept ?? ".gif,.jpg,.jpeg,.png,.tif,.svg,.webp"}
      children={children}
      disabled={isDisabled}
    />
  );
}

export function ImagePaster(props: {
  onPasted: (image: ResizableImage) => void;
}) {
  const appCtx = useAppCtx();
  const [isProcessing, setProcessing] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const handler = spawnWrapper(async (event: ClipboardEvent) => {
      if (!event.clipboardData) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setProcessing(true);
      const image = await ReadableClipboard.fromDataTransfer(
        event.clipboardData
      ).getImage(appCtx);
      if (image) {
        props.onPasted(image);
      } else {
        notification.error({
          message: "Detected no image...",
        });
      }
      setProcessing(false);
    });
    ref.current?.addEventListener("paste", handler);
    return () => ref.current?.removeEventListener("paste", handler);
  }, [props.onPasted, ref, isProcessing]);

  return (
    <textarea
      ref={ref}
      className="textbox image-paster"
      placeholder={isProcessing ? "Pasting..." : "Select and paste here"}
      value=""
      disabled={isProcessing}
    />
  );
}
