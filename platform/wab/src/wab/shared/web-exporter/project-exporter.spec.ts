import { Bundle } from "@/wab/shared/bundler";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";
import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";
import { serializeProject } from "@/wab/shared/web-exporter/project-exporter";

describe("Project Serialization", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  it("serialize project with all filters enabled", () => {
    const filters = {
      components: true,
      screenBreakpoints: true,
      globalVariants: true,
      tokens: true,
      animations: true,
      importedProjects: true,
    };

    // Serialize the current project plus every imported project, so the
    // snapshot captures the complete project including its dependencies.
    const output = [
      serializeProject(site, { projectId: "testProjectId", ...filters }),
      ...site.projectDependencies.map((dep) =>
        serializeProject(dep.site, { projectId: dep.projectId, ...filters })
      ),
    ].join("\n");

    expect(output).toMatchSnapshot();
  });
});
