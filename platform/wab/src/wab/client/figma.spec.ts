import * as domUtils from "@/wab/client/dom-utils";
import { denormalizeFigmaData, tplNodeFromFigmaData } from "@/wab/client/figma";
import {
  uploadFigmaImages,
  uploadNodeImages,
} from "@/wab/client/figma-importer/assets";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fakeAppCtx } from "@/wab/client/test/fake-init-ctx";
import { Bundler } from "@/wab/shared/bundler";
import * as common from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import {
  createSiteOps,
  createTplMgr,
  createVariantTplMgr,
  getFigmaFilesIds,
  getTestFigmaData,
} from "@/wab/test/figma";
jest.mock("@/wab/client/components/coding/FullCodeEditor.tsx", () => ({
  FullCodeEditor: () => null,
  CodePreview: () => null,
}));

describe("Figma module", function () {
  describe("tplNodeFromFigmaData", function () {
    const ids = getFigmaFilesIds();
    /**
     * Each id represents a test case to be checked.
     *
     * A test case is defined by:
     *  `id`-figdata.json:
     *    This is the data is obtained by running the plugin figma to code and is
     *    what is going to be passed to `tplNodeFromFigmaData`.
     */

    ids.forEach((id) => {
      it(`convert ${id}`, async () => {
        // Create mock elements
        let uid = 1;
        (common as any).mkShortId = () => String(++uid);
        (common as any).mkUuid = () => String(++uid);
        (domUtils as any).maybeUploadImage = async (_, img, type, file) => {
          await img.tryDownscale();
          return {
            imageResult: img,
            opts: {
              type: type,
              name: file instanceof File ? file?.name : file,
            },
          };
        };
        const site = createSite();
        const tplMgr = createTplMgr(site);
        const vtm = createVariantTplMgr(site, tplMgr);
        const siteOps = createSiteOps(tplMgr);
        const { appCtx } = fakeAppCtx();

        const figmaData = getTestFigmaData(id);
        const uploadedImages = await uploadFigmaImages(
          figmaData,
          appCtx as any
        );
        const { nodes, imagesToRename } = denormalizeFigmaData(figmaData);
        const nodeImages = await uploadNodeImages(nodes, appCtx as any);

        const node = tplNodeFromFigmaData(
          {} as StudioCtx, // TODO: Figure out why fakeStudioCtx() breaks the test
          vtm,
          site,
          siteOps as any,
          nodes,
          uploadedImages,
          nodeImages,
          imagesToRename,
          false
        );
        expect(!!node).toBeTruthy();

        const bundler = new Bundler();

        // Force the iids to start from 1
        (bundler as any).getNewIid = (() => {
          let nextIid = 1;
          return () => {
            const iid = nextIid;
            nextIid++;
            return `${iid}`;
          };
        })();

        const nodeBundle = bundler.bundle(node!, "", "");

        expect(nodeBundle).toMatchSnapshot();
      });
    });
  });
});
