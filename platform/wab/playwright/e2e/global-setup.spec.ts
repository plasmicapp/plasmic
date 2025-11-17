import { test as setup } from "@playwright/test";
import { makeApiClient } from "../fixtures/test";

/**
 * Global setup test that runs before all other tests to configure dev flags.
 * Consolidates all dev flags from various test files into a single setup.
 */
setup("configure global dev flags", async ({ request, baseURL }) => {
  const apiClient = makeApiClient(request, baseURL);
  const initialFlags = await apiClient.getDevFlags();

  // Consolidated dev flags from all test files
  const allDevFlags = {
    ...initialFlags,
    // auto-open.spec.ts
    autoOpen: true,
    autoOpen2: true,

    // imported-token-overrides.spec.ts
    importedTokenOverrides: true,

    // simplified-all-form-items.spec.ts
    simplifiedForms: true,

    // data-rep.spec.ts, http.spec.ts, postgres.spec.ts,
    // state-management-dependent.spec.ts, dynamic-initial-value.spec.ts
    plexus: false,

    // dynamic-initial-value.spec.ts
    runningInCypress: true,

    schemaDrivenForms: true,
    branching: true,
    comments: true,

    // tutorial.spec.ts
    templateTours: {
      gE5G4u5n7anv8KR9zDcgU9: "complete", // PROJECT_IDS.base
    },
    hostLessComponents: [
      {
        type: "hostless-package",
        name: "More HTML elements",
        syntheticPackage: true,
        sectionLabel: "Design systems",
        isInstallOnly: true,
        imageUrl: "https://static1.plasmic.app/insertables/unstyled.png",
        codeName: "unstyled",
        codeLink: "",
        onlyShownIn: "new",
        items: [
          {
            type: "hostless-component",
            componentName: "Unstyled",
            displayName: "More HTML elements",
            imageUrl: "https://static1.plasmic.app/insertables/unstyled.png",
          },
        ],
        projectId: [],
      },
      {
        type: "hostless-package",
        name: "App blocks",
        sectionLabel: "Basics",
        hiddenWhenInstalled: true,
        codeName: "plasmic-rich-components",
        codeLink:
          "https://github.com/plasmicapp/plasmic/tree/master/plasmicpkgs/plasmic-rich-components",
        items: [
          {
            type: "hostless-component",
            componentName: "hostless-rich-table",
            displayName: "Table",
            imageUrl: "https://static1.plasmic.app/table.svg",
            gray: true,
          },
          {
            type: "hostless-component",
            componentName: "plasmic-antd5-form",
            displayName: "Form",
            imageUrl: "https://static1.plasmic.app/form.svg",
          },
        ],
        projectId: [
          "jkU663o1Cz7HrJdwdxhVHk", // PROJECT_IDS["rich-components"]
          "ohDidvG9XsCeFumugENU6J", // PROJECT_IDS.antd5
        ],
      },
      {
        type: "hostless-package",
        name: "Form",
        sectionLabel: "Basics",
        hiddenWhenInstalled: true,
        codeName: "antd5-form",
        codeLink:
          "https://github.com/plasmicapp/plasmic/tree/master/plasmicpkgs/plasmic-rich-components",
        items: [
          {
            type: "hostless-component",
            componentName: "plasmic-antd5-form",
            displayName: "Form",
            imageUrl: "https://static1.plasmic.app/form.svg",
          },
        ],
        projectId: "ohDidvG9XsCeFumugENU6J", // PROJECT_IDS.antd5
      },
    ],
  };
  console.log("Setting dev flags for tests...");
  await apiClient.upsertDevFlags(allDevFlags);
});
