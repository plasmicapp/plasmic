import { transformBundlerErrors } from "@/wab/server/loader/error-handler";

describe("loader error-handler", () => {
  it("should handle bundling with missing component", () => {
    expect(
      transformBundlerErrors(
        `Build failed with 2 error:
render__target.tsx:69:71: ERROR: Could not resolve "./comp__missing"
render__simple.tsx:69:71: ERROR: Could not resolve "./comp__missing"`,
        [
          {
            id: "target",
            name: "TargetComp",
            projectId: "P1",
            projectName: "Project1",
          },
          {
            id: "simple",
            name: "SimpleComp",
            projectId: "P1",
            projectName: "Project1",
          },
          {
            id: "missing",
            name: "_MissingComp",
            projectId: "P2",
            projectName: "Project2",
          },
        ]
      )
    ).toEqual(
      `
Found 2 errors while bundling the components:
Component "TargetComp" is trying to import component "_MissingComp".
Component "SimpleComp" is trying to import component "_MissingComp".

Those components are in the following projects:
"Project1" (ID:P1)
"Project2" (ID:P2)

They are hidden (prefixed with an underscore) or the plasmic-init configuration is improperly set up.

Please make sure that the components are correctly referenced in the Studio.
Contact support if you need help.
      `.trim()
    );

    expect(
      transformBundlerErrors(
        `Build failed with 1 error:
render__target.tsx:69:71: ERROR: Could not resolve "./comp__missing"`,
        [
          {
            id: "target",
            name: "TargetComp",
            projectId: "P1",
            projectName: "Project1",
          },
        ]
      )
    ).toEqual(
      `
Found 1 errors while bundling the components:
Component "TargetComp" is trying to import an unknown component.

Those components are in the following projects:
"Project1" (ID:P1)

They are hidden (prefixed with an underscore) or the plasmic-init configuration is improperly set up.

Please make sure that the components are correctly referenced in the Studio.
Contact support if you need help.
      `.trim()
    );
  });
});
