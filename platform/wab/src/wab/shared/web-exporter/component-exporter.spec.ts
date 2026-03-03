import { Bundle } from "@/wab/shared/bundler";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";
import { serializeComponent } from "@/wab/shared/web-exporter/component-exporter";

describe("Component Serialization", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  it("serialize all components into text representation for prompt", () => {
    const output: Record<string, string> = {};
    for (const component of site.components) {
      output[component.name] = serializeComponent(component);
    }
    expect(output).toMatchSnapshot();
  });
});
