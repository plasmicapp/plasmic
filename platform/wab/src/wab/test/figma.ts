import { ResizableImage } from "@/wab/client/dom-utils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { Site } from "@/wab/shared/model/classes";
import fs from "fs";
import { map, split, uniq } from "lodash";
import path from "path";

export const createTplMgr = (site: Site) => new TplMgr({ site });

const emptyVariants = {
  getTargetVariants: () => [],
  getPinnedVariants: () => {},
};

export const createVariantTplMgr = (site: Site, tplMgr: TplMgr) => {
  return new VariantTplMgr(
    [
      {
        // @ts-ignore
        component: {
          name: "jest-root",
          variants: [],
        },
        ...emptyVariants,
      },
    ],
    site,
    tplMgr,
    emptyVariants
  );
};

export const createSiteOps = (tplMgr: TplMgr) => {
  return {
    createImageAsset: (
      img: ResizableImage,
      opts: { type?: ImageAssetType; name?: string }
    ) => {
      const dataUri = img.url;
      const type = opts.type!;
      const asset = tplMgr.addImageAsset({
        name: opts.name,
        type: type || ImageAssetType.Icon,
        dataUri,
        width: img.width,
        height: img.height,
        aspectRatio: img.scaledRoundedAspectRatio,
      });
      return {
        asset,
      };
    },
    renameImageAsset: (asset: any, name: string) => {
      tplMgr.renameImageAsset(asset, name);
    },
  };
};

export const getFigmaFilesIds = () => {
  const files = fs.readdirSync(path.join(__dirname, "figma", "files"));
  return uniq(map(files, (file) => split(file, "-")[0]));
};

export const getTestFigmaData = (id) => {
  const figdataPath = path.join(
    __dirname,
    "figma",
    "files",
    `${id}-figdata.json`
  );
  const raw = fs.readFileSync(figdataPath);
  // @ts-ignore
  return JSON.parse(raw);
};
