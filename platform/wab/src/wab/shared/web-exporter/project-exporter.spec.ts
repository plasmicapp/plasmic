import { Bundle } from "@/wab/shared/bundler";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";
import { serializeProject } from "@/wab/shared/web-exporter/project-exporter";

describe("Project Serialization", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  it("serialize project with all filters enabled", () => {
    const output = serializeProject(site, {
      components: true,
      screenBreakpoints: true,
      globalVariants: true,
      tokens: true,
      animations: true,
    });
    expect(output).toMatchSnapshot();
  });
});
