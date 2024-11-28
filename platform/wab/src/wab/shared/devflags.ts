import {
  ApiFeatureTier,
  FeatureTierId,
  ProjectId,
  StripePriceId,
  TeamId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { assert, ensureType, mergeSane } from "@/wab/shared/common";
import { DEFAULT_DEVFLAG_OVERRIDES } from "@/wab/shared/devflag-overrides";
import {
  featureTiers,
  newFeatureTiers,
} from "@/wab/shared/pricing/pricing-utils";
import { InsertPanelConfig, UiConfig } from "@/wab/shared/ui-config-utils";
import { cloneDeep, pick } from "lodash";

export interface StarterSectionConfig {
  title: string; // Shown as the heading
  tag: string; // tags should be unique!
  projects: StarterProjectConfig[];
  infoTooltip?: string; // Shows up as a tooltop over the info icon
  docsUrl?: string; // Link for "View docs"
  moreUrl?: string; // Link for "More"
  isPlasmicOnly?: boolean;
}
export interface StarterGlobalContextConfig {
  name: string;
  props: {
    name: string;
    value: string | null;
  }[];
}
export interface StarterProjectConfig {
  name: string; // name of the starter
  projectId?: string; // project to clone
  baseProjectId?: string; // project whose latest published version we wish to clone
  tag: string; // tags should be unique!
  description: string; // description in card (name auto-retrieved from server)
  author?: string; // for template attribution
  authorLink?: string; // link to author
  iconName?: string; // name of icon component to display next to title - resolved in StarterGroup
  imageUrl?: string; // Preview image URL (e.g. on S3)
  highlightType?: "first" | "second" | "third"; // for coloring the cards
  href?: string; // if it's just a link (Developer Quickstart should be the only such thing)
  publishWizard?: boolean; // true if should show the publish wizard on the first open
  showPreview?: boolean; // true if this starter can be previewed in /templates/${tag}
  // show notification for users when the global context values aren't modified
  globalContextConfigs?: StarterGlobalContextConfig[];
  isPlasmicOnly?: boolean;
  withDropShadow?: boolean;
  cloneWithoutName?: boolean;
}

export type InsertableTemplateTokenResolution =
  | "inline"
  | "reuse-by-name"
  | "reuse-by-value"
  | "reuse-by-name-and-value"
  | "retain-by-name" // deprecated
  | "retain-by-value" // deprecated
  | "retain-by-name-and-value"; // deprecated

export type InsertableTemplateComponentResolution =
  | "inline"
  | "reuse"
  | "duplicate" // deprecated
  | "import"; // deprecated

/**
 * Represents a collection of related templates (e.g. Hero sections)
 */
export interface InsertableTemplatesGroup {
  sectionKey?: string;
  sectionLabel?: string;
  onlyShownIn?: "old" | "new";
  type: "insertable-templates-group";
  name: string;
  items: InsertableTemplatesSelectable[];
  imageUrl?: string;
  isPageTemplatesGroup?: boolean;
  hidden?: boolean;
}

export interface Installable {
  type: "ui-kit";
  name: string;
  sectionLabel?: string;
  isInstallOnly: true;
  isNew?: boolean;
  projectId: string;
  imageUrl?: string;
  entryPoint: {
    type: "component" | "page" | "arena";
    name: string;
  };
}

/**
 * Represents a single template (pulled from a component)
 */
export interface InsertableTemplatesItem {
  type: "insertable-templates-item";
  projectId: string; // Where to find the template
  componentName: string; // Name of component to insert
  imageUrl?: string; // A preview image
  displayName?: string;
  onlyShownIn?: "old" | "new";
  tokenResolution?: InsertableTemplateTokenResolution;
  componentResolution?: InsertableTemplateComponentResolution;
  hidden?: boolean;
}

/**
 * Represents a single template (pulled from a component)
 */
export interface InsertableTemplatesComponent {
  type: "insertable-templates-component";
  projectId: string; // Where to find the template
  componentName: string; // Name of component to insert
  /**
   * Globally unique name of the template; should match up with
   * Component.templateInfo.name of the corresponding component.
   * By convention, starts with plasmic-*
   */
  templateName: string;
  imageUrl?: string; // A preview image
  displayName?: string;
  tokenResolution?: InsertableTemplateTokenResolution;
  componentResolution?: InsertableTemplateComponentResolution;
  hidden?: boolean;
}

/**
 * Represents a collection of icons
 * Unlike templates, where we'll specify individual components,
 * here we'll just grab all icons from the project
 */
export interface InsertableIconsGroup {
  type: "insertable-icons-group";
  name: string;
  projectId: string;
  hidden?: boolean;
}

export type InsertableTemplatesSelectable =
  | InsertableTemplatesItem
  | InsertableTemplatesGroup
  | InsertableIconsGroup
  | InsertableTemplatesComponent;

export interface HostLessPackageInfo {
  syntheticPackage?: boolean;
  type: "hostless-package";
  name: string;
  sectionLabel: string;
  hiddenWhenInstalled?: boolean;
  codeName?: string;
  codeLink?: string;
  projectId: string | string[];
  items: HostLessComponentInfo[];
  hidden?: boolean;
  showInstall?: boolean;
  whitelistDomains?: string[];
  whitelistTeams?: string[];
  isInstallOnly?: boolean;
  imageUrl?: string;
  onlyShownIn?: "old" | "new";
}

export interface HostLessComponentInfo {
  type: "hostless-component";
  componentName: string;
  displayName: string;
  gray?: boolean;
  monospaced?: boolean; // for monospace font
  imageUrl?: string;
  videoUrl?: string;
  hidden?: boolean;
  isFake?: boolean;
  description?: string;
  hiddenOnStore?: boolean;
  onlyShownIn?: "old" | "new";
  requiredHostVersion?: number;
  args?: { [prop: string]: any };
}

type InsertableByTypeString<T extends InsertableTemplatesSelectable["type"]> =
  T extends "insertable-templates-item"
    ? InsertableTemplatesItem
    : T extends "insertable-templates-component"
    ? InsertableTemplatesComponent
    : T extends "insertable-templates-group"
    ? InsertableTemplatesGroup
    : T extends "insertable-icons-group"
    ? InsertableIconsGroup
    : never;

export function flattenInsertableTemplatesByType<
  T extends InsertableTemplatesSelectable["type"]
>(
  item: InsertableTemplatesSelectable | undefined,
  type: T
): InsertableByTypeString<T>[] {
  if (!item) {
    return [];
  } else if (item.type === type) {
    return [item as InsertableByTypeString<T>];
  } else if (item.type === "insertable-templates-group") {
    return item.items.flatMap((i) => flattenInsertableTemplatesByType(i, type));
  } else {
    return [];
  }
}

export function flattenInsertableTemplates(
  item?: InsertableTemplatesSelectable
): InsertableTemplatesItem[] {
  if (!item || item.type === "insertable-icons-group") {
    return [];
  } else if (item.type === "insertable-templates-item") {
    return [item];
  } else if (item.type === "insertable-templates-group") {
    return item.items.flatMap((i) => flattenInsertableTemplates(i));
  } else if (item.type === "insertable-templates-component") {
    return [];
  } else {
    assert(
      false,
      "Not expected insertable template type: " + typeof item === "object"
        ? JSON.stringify(item)
        : item
    );
  }
}

export function flattenInsertableIconGroups(
  item?: InsertableTemplatesSelectable
): InsertableIconsGroup[] {
  if (!item || item.type === "insertable-templates-item") {
    return [];
  } else if (item.type === "insertable-icons-group") {
    return [item];
  } else if (item.type === "insertable-templates-group") {
    return item.items.flatMap((i) => flattenInsertableIconGroups(i));
  } else if (item.type === "insertable-templates-component") {
    return [];
  } else {
    assert(
      false,
      "Not expected insertable template type: " + typeof item === "object"
        ? JSON.stringify(item)
        : item
    );
  }
}

const INSERT_PANEL_CONTENT: InsertPanelConfig = {
  aliases: {
    accordion: "plasmic-antd5-collapse",
    alert: "template:plasmic-alert",
    appLayout: "hostless-rich-layout",
    button: "default:button",
    buttonGroup: "plasmic-antd5-radio-group/button",
    calendar: "hostless-rich-calendar",
    card: "template:plasmic-card",
    carousel: "hostless-slider",
    chart: "hostless-react-chartjs-2-simple-chart",
    checkbox: "default:checkbox",
    dataDetails: "hostless-rich-details",
    dataFetcher: "builtincc:plasmic-data-source-fetcher",
    dataList: "hostless-rich-list",
    dataProvider: "hostless-data-provider",
    dateTimePicker: "plasmic-antd5-date-picker",
    dialog: "template:plasmic-dialog",
    drawer: "template:plasmic-drawer",
    embedCss: "global-embed-css",
    embedHtml: "hostless-embed",
    form: "plasmic-antd5-form",
    iframe: "hostless-iframe",
    input: "default:text-input",
    loadingBoundary: "hostless-loading-boundary",
    lottie: "hostless-lottie-react",
    navbar: "hostless-plasmic-navigation-bar",
    numberInput: "plasmic-antd5-input-number",
    pageMeta: "builtincc:hostless-plasmic-head",
    parallax: "hostless-scroll-parallax",
    passwordInput: "plasmic-antd5-input-password",
    popover: "hostless-radix-popover",
    radioGroup: "plasmic-antd5-radio-group",
    reveal: "hostless-reveal",
    richText: "hostless-react-quill",
    select: "default:select",
    statistic: "template:plasmic-statistic",
    switch: "default:switch",
    table: "hostless-rich-table",
    tilt3d: "hostless-parallax-tilt",
    timer: "hostless-timer",
    tooltip: "template:plasmic-tooltip",
    upload: "plasmic-antd5-upload",
    video: "hostless-html-video",
    youtube: "hostless-youtube",
  },
  overrideSections: {
    website: {
      "Default components": {
        Common: [
          "text",
          "section",
          "columns",
          "image",
          "icon",
          "button",
          "form",
        ],
      },
    },
  } as Record<string, Record<string, Record<string, string[]>>>,
  builtinSections: {
    "Default components": {
      Common: [
        "table",
        "text",
        "button",
        "input",
        "select",
        "image",
        "form",
        "section",
        "columns",
      ],
      General: ["button", "text", "heading", "link"],
      Display: [
        "table",
        "dataList",
        "dataDetails",
        "chart",
        "carousel",
        "card",
        "statistic",
      ],
      "Data entry": [
        "form",
        "input",
        "checkbox",
        "select",
        "dateTimePicker",
        "radioGroup",
        "numberInput",
        "passwordInput",
        "upload",
      ],
      Media: ["image", "icon", "video", "youtube"],
      Layout: ["section", "columns", "vstack", "hstack", "grid", "box"],
      Navigation: ["appLayout", "navbar", "link", "linkContainer"],
      Interactions: ["reveal", "parallax", "tilt3d", "lottie"],
      HTML: ["iframe", "embedHtml", "embedCss"],
      Advanced: ["dataFetcher", "loadingBoundary", "dataProvider", "pageMeta"],
    },
  },
};

const production = process.env.NODE_ENV === "production";

const DEFAULT_DEVFLAGS = {
  appContentBaseUrl: "https://docs.plasmic.app/app-content",
  artboardEval: true,
  autoSave: true,
  brands: {
    "": {
      logoHref: ensureType<string | undefined>(undefined),
      logoImgSrc: ensureType<string | undefined>(undefined),
      logoTooltip: "Back to dashboard",
    },
    SOME_TEAM_ID: {
      logoHref: "https://responsival.com",
      logoImgSrc:
        "https://assets-global.website-files.com/60a6b5ea9c13555ad76844c1/61311bbe3d92e0aafc264094_blink_1.svg",
      logoTooltip: "",
    },
  },
  content: true,
  contentEditorMode: false,
  codegenHost: process.env.CODEGEN_HOST || "https://codegen.plasmic.app",
  codegenOriginHost:
    process.env.CODEGEN_ORIGIN_HOST ||
    process.env.CODEGEN_HOST ||
    "http://codegen-origin.plasmic.app",
  adminTeamDomain: production ? "plasmic.app" : "admin.example.com",
  defaultHostUrl:
    process.env.REACT_APP_DEFAULT_HOST_URL ||
    "https://host.plasmicdev.com/static/host.html",
  defaultOpenStylePanels: true,
  dynamicPages: true,
  enablePlasmicHosting: true,
  // Used to invalidate etag cacheing mechanism altogether
  disableETagCaching: false,
  // Used to invalidate etags that use it
  eTagsVersionPrefix: "0",
  // The tiers to get dynamically retrieve from the server
  featureTierNames: featureTiers,
  useNewFeatureTiers: true,
  newFeatureTierNames: newFeatureTiers,
  freeTier: ensureType<ApiFeatureTier>({
    createdAt: "2021-08-05T23:39:21.570Z",
    updatedAt: "2023-05-22T23:39:21.570Z",
    deletedAt: null,
    createdById: null,
    updatedById: null,
    deletedById: null,
    id: "freeTier" as FeatureTierId,
    name: "Free",
    monthlySeatPrice: 0,
    monthlySeatStripePriceId: "price_1JLFtfHIopbCiFei4rR6omdz" as StripePriceId,
    monthlyBasePrice: null,
    monthlyBaseStripePriceId: null,
    annualSeatPrice: 0,
    annualSeatStripePriceId: "price_1LG1ZcHIopbCiFeigziyEF6W" as StripePriceId,
    annualBasePrice: null,
    annualBaseStripePriceId: null,
    minUsers: 0,
    maxUsers: 3,
    privateUsersIncluded: 10,
    maxPrivateUsers: 10,
    publicUsersIncluded: 10000,
    maxPublicUsers: 10000,
    versionHistoryDays: 14,
    maxWorkspaces: null,
    designerRole: false,
    contentRole: false,
    editContentCreatorMode: false,
    splitContent: false,
    localization: false,
    analytics: false,
    monthlyViews: 50000,
  }),
  freeTrial: false,
  freeTrialTierName: "Growth",
  newFreeTrialTierName: "Team",
  freeTrialDays: 15,
  productHuntPromo: false,
  freeTrialPromoDays: 60,
  createTeamPrompt: true,
  hideHelpForUsers: [".*@example.com"],
  hideStartersForUsers: [".*@example.com"],
  insertPanelContent: INSERT_PANEL_CONTENT,
  insertableTemplates: ensureType<InsertableTemplatesGroup | undefined>(
    undefined
  ),
  installables: ensureType<Installable[]>([]),
  hostLessComponents: ensureType<HostLessPackageInfo[] | undefined>([
    {
      type: "hostless-package",
      name: "Plume Customizable Components",
      syntheticPackage: true,
      sectionLabel: "Design systems",
      isInstallOnly: true,
      imageUrl: "https://static1.plasmic.app/plasmic-logo.png",
      codeName: "plume",
      codeLink: "",
      onlyShownIn: "new",
      items: [
        {
          type: "hostless-component",
          componentName: "Plume",
          displayName: "Plume Design System",
          imageUrl: "https://static1.plasmic.app/plasmic-logo.png",
        },
      ],
      projectId: [],
    },
    {
      type: "hostless-package",
      name: "More HTML elements",
      syntheticPackage: true,
      sectionLabel: "Design systems",
      isInstallOnly: true,
      imageUrl:
        "https://plasmic-static1.s3.us-west-2.amazonaws.com/insertables/unstyled.png",
      codeName: "unstyled",
      codeLink: "",
      onlyShownIn: "new",
      items: [
        {
          type: "hostless-component",
          componentName: "Unstyled",
          displayName: "More HTML elements",
          imageUrl:
            "https://plasmic-static1.s3.us-west-2.amazonaws.com/insertables/unstyled.png",
        },
      ],
      projectId: [],
    },
  ]),
  // Turns on PlasmicImg for all
  usePlasmicImg: false,
  usePlasmicTranslation: false,
  showPlasmicImgModal: false,
  imgOptimizerHost: "https://img.plasmic.app",
  introYoutubeId: "K_YzFBd7b2I",
  noFlipTags: true,
  proxyDomainSuffixes: [".devtun.plasmic.app", ".prox1.plasmic.link"],
  revisionNum: undefined,
  richtext2: true,
  secretApiTokenTeams: ["teamId"],
  selectInserted: true,
  showFullPreviewWarning: true,
  skipFreeVars: true,
  starterSections: [] as StarterSectionConfig[],
  versions: true,
  showMultipleAvatars: true,
  hiddenQuickstartPlatforms: ensureType<string[]>([]),
  mungeErrorMessages: {
    "AuthError: CSRF token mismatch":
      "Your login session has expired. Please reload to log in again.",
  },
  showCopilot: true,

  loaderBundler: "esbuild",
  esbuildProjectIds: [] as string[],
  hostLessWorkspaceId: undefined as WorkspaceId | undefined,
  manuallyUpdatedHostLessProjectIds: [] as string[],
  whitespaceNormalProjectIds: [] as string[],
  useWhitespaceNormal: false,
  autoUpgradeHostless: true,

  writeApiSizeLimit: 70000000, // 70MB
  writeApiExcludedProjectIds: [] as string[],

  // Disabled by default
  runningInCypress: false,
  posthog: true,
  copilotTab: false,
  copilotClaude: false,
  cleanRedundantOverrides: false,
  cms: false,
  comments: false,
  commentsTeamIds: [] as TeamId[],
  rightTabs: true,
  codePreview: false,
  demo: false,
  direct: false,
  enableReactDevTools: false, // used in studio.js
  hideBlankStarter: false,
  hideSingleSlots: false,
  hideSyncStatusIndicator: false,
  interactiveCanvas: true,
  insert2022Q4: true,
  sso: false,
  omnibar: false,
  orderVariantsByUid: false,
  paywalls: false,
  showCondVariants: false,
  showIntroSplash: false,
  skipInvariants: false,
  uncatchErrors: false,
  // Prefers loading state over expression fallback
  useLoadingState: false,
  showHiddenHostLessComponents: false,
  ccStubs: false,
  workspaces: false,
  noObserve: false,
  plexus: false,
  incrementalObservables: false,
  spacing: true,
  spacingArea: true,
  setHostLessProject: false,
  plasmicHostingSubdomainSuffix: "plasmic.run",
  splits: true,
  mutateState: false,
  refActions: false,
  multiSelect: false,
  dataTabTourForUsersBefore: "2023-02-28",
  pageLayout: false,
  mainContentSlots: false,
  insertTemplatesIntoMainContentSlots: false,
  simplifiedScreenVariants: false,
  simplifiedForms: false,
  schemaDrivenForms: false,
  hostUrl: "",
  globalTrustedHosts: ["https://example123.fake"],
  warningsInCanvas: false,
  previewSteps: false,

  // Permanently disabled, just internal tools/scripts.
  autoInitEmptyThemeStyles: false,
  allowPlasmicTeamEdits: false,

  // variant experiments
  variants: false,
  unconditionalEdits: false,
  ephemeralRecording: false,
  framerTargeting: true,

  // debugging user projects
  debug: false, // turns on other debug flags in `normalizeDevFlags`
  loadingDebug: false, // shows canvas frame loading debug UI
  logToConsole: !production,

  // github settings
  githubClientId: "Iv1.8a4a47b0b0d4bf88",
  githubAppName: "plasmic-app",

  // change simplified defaults
  simplifiedLayout: false,

  imageControls: false,

  componentThumbnails: false,

  // Enables the margin and padding spacing visualizer improvements
  spacingVisualizer202209: true,
  gapControls: false,
  contentOnly: false,
  publishWithTags: true,
  ancestorsBoxes: true,
  branching: false,
  disableBranching: false,
  branchingTeamIds: [] as TeamId[],
  commitsOnBranches: false,
  appAuth: false,
  advancedAppAuth: false,
  serverPublishProjectIds: [] as ProjectId[],
  focusable: false,
  envPanel: false,
  linting: false,

  // Number of arenas to keep in memory
  liveArenas: 6,

  analytics: false,
  analyticsPaywall: false,
  monthlyViewsPaywall: false,
  verifyMonthlyViews: false,

  debugCmsForms: false,

  hiddenDataSources: [] as string[],

  // Custom top frame URLs; if Studio is loaded from a custom
  // domain, then this allows us to recognize it as the top frame
  // Hard-coding this for now as db-based flag overrides are
  // not yet loaded when it is needed.
  topFrameUrls: ["https://studio.plsmc.dev"] as string[],

  defaultContentCreatorConfig: {
    styleSectionVisibilities: {
      visibility: false,
      typography: false,
      sizing: false,
      spacing: false,
      positioning: false,
      background: false,
      transform: false,
      transitions: false,
      layout: false,
      overflow: false,
      border: false,
      shadows: false,
      effects: false,
      states: false,
      interactions: false,
    },
  } as UiConfig,

  googleAuthRequiredEmailDomains: ["plasmic.app"],

  onboardingTours: false,

  newProjectModal: false,

  authUsersTab: false,

  /*
  Template tours should map projectId to tourId, this way when a user creates a new project
  by cloning a template, we can show them the tour for that template.
  */
  templateTours: {} as Record<string, string>,

  arbitraryCssSelectors: false,

  autoOpen: false,
};

Object.assign(DEFAULT_DEVFLAGS, DEFAULT_DEVFLAG_OVERRIDES);

export type DevFlagsType = typeof DEFAULT_DEVFLAGS;
export const DEVFLAGS = cloneDeep(DEFAULT_DEVFLAGS);

export function normalizeDevFlags(flags: DevFlagsType) {
  if (flags.variants) {
    flags.unconditionalEdits = true;
    flags.ephemeralRecording = true;
  }

  if (flags.debug) {
    flags.autoSave = false;
    flags.ccStubs = true;
    flags.logToConsole = true;
    flags.enableReactDevTools = true;
  }
}

export function applyDevFlagOverrides(
  target: DevFlagsType,
  overrides: Partial<DevFlagsType>
) {
  mergeSane(target, overrides);
  normalizeDevFlags(target);
}

export function applyPlasmicUserDevFlagOverrides(target: DevFlagsType) {
  mergeSane(target, {
    ancestorsBoxes: true,
    multiSelect: true,
    insert2022Q4: true,
    plexus: true,
    incrementalObservables: true,
    branching: true,
    comments: true,
    pageLayout: true,
    refActions: true,
    logToConsole: true,
    rightTabs: true,
    appAuth: true,
    focusable: true,
    envPanel: true,
    interactiveCanvas: true,
    hiddenDataSources: [] as string[],
    mainContentSlots: true,
    insertTemplatesIntoMainContentSlots: true,
    simplifiedScreenVariants: true,
    simplifiedForms: true,
    schemaDrivenForms: true,
    onboardingTours: true,
    showInsertableTemplateComponents: true,
    advancedAppAuth: true,
    posthog: true,
    linting: true,
    componentThumbnails: true,
    authUsersTab: true,
    warningsInCanvas: true,
    previewSteps: true,
    arbitraryCssSelectors: true,
    autoOpen: true,
  } as Partial<DevFlagsType>);
}

const perProjectFlags: (keyof DevFlagsType)[] = [
  "usePlasmicImg",
  "usePlasmicTranslation",
  "useLoadingState",
  "useWhitespaceNormal",
];

export function getProjectFlags(
  site: {
    flags: { [f: string]: string | number | boolean | null | undefined };
  },
  target = DEVFLAGS
): DevFlagsType {
  return Object.assign(
    JSON.parse(JSON.stringify(target)),
    pick(site.flags, perProjectFlags)
  );
}
