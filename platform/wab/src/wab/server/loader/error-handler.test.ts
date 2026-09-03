import {
  getAllTsxFilesFromString,
  transformBundlerErrors,
} from "@/wab/server/loader/error-handler";

describe("loader error-handler", () => {
  describe("transformBundlerErrors", () => {
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

      expect(
        transformBundlerErrors(
          `Build failed with 1 error:
render___with-underscore.tsx:69:71: ERROR: Could not resolve "./comp___miss-underscore"`,
          [
            {
              id: "_with-underscore",
              name: "WithUnderscore",
              projectId: "P1",
              projectName: "Project1",
            },
            {
              id: "_miss-underscore",
              name: "_MissingComp",
              projectId: "P2",
              projectName: "Project2",
            },
          ]
        )
      ).toEqual(
        `
Found 1 errors while bundling the components:
Component "WithUnderscore" is trying to import component "_MissingComp".

Those components are in the following projects:
"Project1" (ID:P1)
"Project2" (ID:P2)

They are hidden (prefixed with an underscore) or the plasmic-init configuration is improperly set up.

Please make sure that the components are correctly referenced in the Studio.
Contact support if you need help.
      `.trim()
      );
    });
  });

  describe("getAllTsxFilesFromString", () => {
    it("should match all tsx files in a string", () => {
      expect(
        getAllTsxFilesFromString(
          `Build failed with 1 error:
render__p_qAnx7Cavdb.tsx:69:71: ERROR: Could not resolve "./comp__xeF6Jn1vylil"
render__p_qAnx7Cavdb.tsx:69:71: ERROR: Could not resolve "./comp__xeF6Jn1vylil"
render__p_qAnx7Cazcg.tsx:69:71: ERROR: Could not resolve "./comp__xeF6Jn1vylil"`
        )
      ).toEqual(["render__p_qAnx7Cavdb.tsx", "render__p_qAnx7Cazcg.tsx"]);

      expect(
        getAllTsxFilesFromString(
          `Build failed with 1 error:
render___qAnx7Cavd-A.tsx:69:71: ERROR: Could not resolve "./comp__xeF6Jn1vylil"
render___FXwY-Sc1orN.tsx:69:71: ERROR: Could not resolve "./comp__xeF6Jn1vylil"`
        )
      ).toEqual(["render___qAnx7Cavd-A.tsx", "render___FXwY-Sc1orN.tsx"]);
    });
  });
});
