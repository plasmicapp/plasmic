import { readTool } from "@/wab/client/copilot/tools/read";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import { Bundle } from "@/wab/shared/bundler";
import { allAnimationSequences } from "@/wab/shared/core/sites";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";

import _bundle from "@/wab/client/copilot/tests/bundles/starter-project-desktop-first.json";

describe("read copilot tool", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  const { studioCtx } = fakeStudioCtx({
    site,
    devFlagOverrides: { noObserve: true },
  });

  describe("serializes project level data and specific uuids", () => {
    it("reads project components", async () => {
      const output = await readTool.execute(studioCtx, {
        project: { components: true },
      });
      expect(output).toMatchSnapshot();
    });

    it("reads project screen breakpoints and global variants", async () => {
      const output = await readTool.execute(studioCtx, {
        project: { screenBreakpoints: true, globalVariants: true },
      });
      expect(output).toMatchSnapshot();
    });

    it("reads project tokens with resolved values", async () => {
      const output = await readTool.execute(studioCtx, {
        project: { tokens: true },
      });
      expect(output).toContain("resolvedValue");
      expect(output).toMatchSnapshot();
    });

    it("reads project animations as a minimal list", async () => {
      const output = await readTool.execute(studioCtx, {
        project: { animations: true },
      });
      expect(output).toMatchSnapshot();
    });

    it("reads project with all filters enabled", async () => {
      const output = await readTool.execute(studioCtx, {
        project: {
          components: true,
          screenBreakpoints: true,
          globalVariants: true,
          tokens: true,
          animations: true,
        },
      });
      expect(output).toMatchSnapshot();
    });
  });

  it("reads specific animations by UUID with full @keyframes", async () => {
    const [anim, anim2] = allAnimationSequences(site, {
      includeDeps: "direct",
    });
    const output = await readTool.execute(studioCtx, {
      animations: [anim.uuid, anim2.uuid],
    });
    expect(output).toMatchSnapshot();
  });

  it("reads a specific resources by UUID", async () => {
    const comp1 = site.components[0];
    const comp2 = site.components[1];

    const tpl1 = flattenTpls(comp1.tplTree)[0];
    const token = site.styleTokens[0];

    const output = await readTool.execute(studioCtx, {
      components: [comp1.uuid, comp2.uuid],
      elements: [{ componentUuid: comp1.uuid, elementUuid: tpl1.uuid }],
      tokens: [token.uuid],
    });
    expect(output).toMatchSnapshot();
  });

  it("returns invalid-resource for non-existent invalid uuids", async () => {
    const output = await readTool.execute(studioCtx, {
      components: ["non-existent-uuid"],
      elements: [
        {
          componentUuid: "non-existent-comp",
          elementUuid: "non-existent-tpl",
        },
      ],
      tokens: ["non-existent-uuid"],
    });
    expect(output).toMatchSnapshot();
  });
});
