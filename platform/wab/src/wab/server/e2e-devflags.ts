import { mergeSane } from "@/wab/shared/common";
import type { DevFlagsType } from "@/wab/shared/devflags";
import { E2E_DEVFLAGS_COOKIE_NAME } from "@/wab/shared/e2e";
import type { Request } from "express-serve-static-core";

const E2E_DEVFLAGS: Partial<DevFlagsType> = {
  e2eDevFlagsApplied: true,

  // data-rep.spec.ts, http.spec.ts, postgres.spec.ts,
  // state-management-dependent.spec.ts, dynamic-initial-value.spec.ts
  plexus: false,

  // data-sources/*, dynamic-pages.spec.ts, forms/schema.spec.ts,
  // hostless-commerce.spec.ts — the legacy integrations UI is only shown
  // when this is on (or the project already uses a data source).
  enableDataQueries: true,

  branching: true,

  // copilot-mentions.spec.ts — the mentions UI is gated behind this.
  enableChatCopilot: true,
  // Backstop behind the `noCopilotApi` fixture: if a request ever escapes,
  // it must not reach a real model. Deliberately invalid.
  chatCopilotModelProviderOpts: {
    provider: "NotAProvider",
    modelName: "not-a-model",
    maxTokens: 1,
  } as unknown as DevFlagsType["chatCopilotModelProviderOpts"],
  uiCopilotModelProviderOpts: {
    provider: "NotAProvider",
    modelName: "not-a-model",
    maxTokens: 1,
  } as unknown as DevFlagsType["uiCopilotModelProviderOpts"],

  // tutorial.spec.ts
  templateTours: {
    "8eH4mLFb7TqLYDMGjj5BLd": "portfolio",
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
      name: "Reveal On Scroll",
      sectionLabel: "Effects",
      codeName: "react-awesome-reveal",
      codeLink:
        "https://github.com/plasmicapp/plasmic/tree/master/plasmicpkgs/react-awesome-reveal",
      items: [
        {
          type: "hostless-component",
          componentName: "hostless-reveal",
          displayName: "Reveal",
          videoUrl: "https://static1.plasmic.app/reveal.mp4",
        },
      ],
      projectId: "58GpZjZCWTaJ8AUhpCwt2K",
    },
    {
      type: "hostless-package",
      name: "Navigation",
      sectionLabel: "Layout",
      codeName: "plasmic-nav",
      codeLink:
        "https://github.com/plasmicapp/plasmic/tree/master/plasmicpkgs/plasmic-nav",
      items: [
        {
          type: "hostless-component",
          componentName: "hostless-plasmic-navigation-bar",
          displayName: "Navbar",
          imageUrl: "https://static1.plasmic.app/plasmic-nav-thumbnail.svg",
        },
      ],
      projectId: "7nJ7UcFmq9UzB6eXfC5z4a",
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

export function getE2eDevFlags(
  req: Request,
): Partial<DevFlagsType> | undefined {
  const cookie: string | undefined = req.cookies[E2E_DEVFLAGS_COOKIE_NAME];
  if (req.config.production || !cookie) {
    return undefined;
  }
  const flags = structuredClone(E2E_DEVFLAGS);
  // Any value but "1" is a test's own flags as JSON, for values it only knows
  // at runtime (like a freshly published project id).
  return cookie === "1" ? flags : mergeSane(flags, JSON.parse(cookie));
}
