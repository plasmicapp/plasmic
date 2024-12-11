import { arrayReversed } from "@/wab/commons/collections";
import {
  ApiPermission,
  ApiResource,
  ApiTeam,
  ApiUser,
  PublicStyleSection,
  StyleSectionVisibilities,
  TemplateSpec,
} from "@/wab/shared/ApiSchema";
import { withoutNils } from "@/wab/shared/common";
import { HostLessPackageInfo } from "@/wab/shared/devflags";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import {
  FRAME_CAP,
  FREE_CONTAINER_CAP,
  HORIZ_CONTAINER_CAP,
  LAYOUT_CONTAINER_CAP,
  VERT_CONTAINER_CAP,
} from "@/wab/shared/Labels";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { isEnterprise } from "@/wab/shared/pricing/pricing-utils";
import { smartHumanize } from "@/wab/shared/strs";
import { merge } from "lodash";

export const BASIC_ALIASES = [
  "box",
  "columns",
  "frame",
  "grid",
  "heading",
  "hstack",
  "icon",
  "image",
  "link",
  "linkContainer",
  "section",
  "text",
  "vstack",
] as const;

export const BASIC_ENTITY_ALIASES = ["token"] as const;

export function makeNiceAliasName(alias: InsertAlias | CreateAlias) {
  if (alias === "box") {
    return FREE_CONTAINER_CAP;
  } else if (alias === "hstack") {
    return HORIZ_CONTAINER_CAP;
  } else if (alias === "vstack") {
    return VERT_CONTAINER_CAP;
  } else if (alias === "columns") {
    return "Responsive columns";
  } else if (alias === "frame") {
    return FRAME_CAP;
  } else if (alias === "section") {
    return LAYOUT_CONTAINER_CAP;
  }
  return smartHumanize(alias);
}

export type InsertBasicAlias = (typeof BASIC_ALIASES)[number];

export type CreateBasicEntityAlias = (typeof BASIC_ENTITY_ALIASES)[number];
export type CreateAlias = CreateBasicEntityAlias;

export const COMPONENT_ALIASES = [
  "accordion",
  "alert",
  "appLayout",
  "button",
  "buttonGroup",
  "calendar",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "checkboxGroup",
  "collapse",
  "combobox",
  "countdown",
  "dataDetails",
  "dataFetcher",
  "dataGrid",
  "dataList",
  "dataProvider",
  "dateTimePicker",
  "dialog",
  "drawer",
  "embedCss",
  "embedHtml",
  "form",
  "iframe",
  "input",
  "linkPreview",
  "loadingBoundary",
  "lottie",
  "lottie-async",
  "marquee",
  "modal",
  "navbar",
  "numberInput",
  "pageMeta",
  "parallax",
  "passwordInput",
  "popover",
  "radio",
  "radioGroup",
  "rangeSlider",
  "reveal",
  "richText",
  "select",
  "slider",
  "statistic",
  "switch",
  "table",
  "tilt3d",
  "timer",
  "tooltip",
  "upload",
  "video",
  "youtube",
] as const;

export type InsertComponentAlias = (typeof COMPONENT_ALIASES)[number];

export type InsertAlias = InsertBasicAlias | InsertComponentAlias;

/** These correspond to actual buttons on the left tab strip. */
export const LEFT_TAB_PANEL_KEYS = [
  "outline",
  "components",
  "tokens",
  "mixins",
  "fonts",
  "themes",
  "images",
  "responsiveness",
  "imports",
  "versions",
  "settings",
  "splits",
  "lint",
  "copilot",
] as const;

export type LeftTabKey = (typeof LEFT_TAB_PANEL_KEYS)[number];

/** These are extra left tab UI parts that can be configured.  */
export const LEFT_TAB_UI_KEYS = [
  ...LEFT_TAB_PANEL_KEYS,

  // sections in the images panel can be selectively configured
  "imagesSection",
  "iconsSection",

  "figma",
] as const;

export type LeftTabUiKey = (typeof LEFT_TAB_UI_KEYS)[number];

export const PROJECT_CONFIGS = ["localization", "rename"] as const;

export type ProjectConfig = (typeof PROJECT_CONFIGS)[number];

export type UiAccess = "hidden" | "readable" | "writable";
export function canRead(...access: UiAccess[]) {
  return access.every((a) => a === "writable" || a === "readable");
}
export function canWrite(...access: UiAccess[]) {
  return access.every((a) => a === "writable");
}

export interface UiConfig {
  styleSectionVisibilities?: Partial<StyleSectionVisibilities>;
  canInsertBasics?: Record<InsertBasicAlias, boolean> | boolean;
  canCreateBasics?: Record<CreateBasicEntityAlias, boolean> | boolean;
  canInsertBuiltinComponent?: Record<InsertComponentAlias, boolean> | boolean;
  canInsertHostless?: Record<string, boolean> | boolean;
  hideDefaultPageTemplates?: boolean;
  pageTemplates?: TemplateSpec[];
  insertableTemplates?: TemplateSpec[];
  leftTabs?: Record<LeftTabUiKey, UiAccess>;
  projectConfigs?: Record<ProjectConfig, boolean> | boolean;
  brand?: {
    logoImgSrc?: string;
    logoHref?: string;
    logoAlt?: string;
    logoTooltip?: string;
  };
  canPublishProject?: boolean;
}

/**
 * Merges UiConfigs, where the later ones in the array overwrites earlier ones
 */
export function mergeUiConfigs(
  ...configs_: (UiConfig | null | undefined)[]
): UiConfig {
  const configs = withoutNils(configs_);
  const mergedFirst = <T>(vals: (T | undefined)[]): T | undefined => {
    return arrayReversed(vals).find((x) => x != null);
  };
  const mergeBooleanObjs = (
    objs: (Record<string, boolean> | boolean | undefined | null)[]
  ) => {
    let res: Record<string, boolean> | boolean | undefined = undefined;
    for (const obj of objs) {
      if (obj == null) {
        continue;
      } else if (res == null) {
        res = obj;
      } else if (typeof obj === "boolean" || typeof res === "boolean") {
        res = obj;
      } else {
        for (const [key, val] of Object.entries(obj)) {
          if (val == null) {
            // no opinion on value of key, so ignore
          } else {
            res[key] = val;
          }
        }
      }
    }
    return res;
  };
  const mergeshallowObjs = <T>(
    objs: (Record<string, T> | undefined | null)[]
  ) => {
    let res: Record<string, T> | undefined = undefined;
    for (const obj of objs) {
      if (obj == null) {
        continue;
      } else if (res == null) {
        res = obj;
      } else {
        for (const [key, val] of Object.entries(obj)) {
          if (val == null) {
            // no opinion on value of key, so ignore
          } else {
            res[key] = val;
          }
        }
      }
    }
    return res;
  };
  return {
    styleSectionVisibilities: mergeBooleanObjs(
      configs.map((c) => c.styleSectionVisibilities)
    ) as Partial<StyleSectionVisibilities>,
    canInsertBasics: mergeBooleanObjs(configs.map((c) => c.canInsertBasics)),
    canCreateBasics: mergeBooleanObjs(configs.map((c) => c.canCreateBasics)),
    canInsertBuiltinComponent: mergeBooleanObjs(
      configs.map((c) => c.canInsertBuiltinComponent)
    ),
    canInsertHostless: mergeBooleanObjs(
      configs.map((c) => c.canInsertHostless)
    ),
    leftTabs: mergeshallowObjs(configs.map((c) => c.leftTabs)),
    hideDefaultPageTemplates: mergedFirst(
      configs.map((c) => c.hideDefaultPageTemplates)
    ),
    pageTemplates: mergedFirst(configs.map((c) => c.pageTemplates)),
    insertableTemplates: mergedFirst(configs.map((c) => c.insertableTemplates)),
    projectConfigs: mergeBooleanObjs(configs.map((c) => c.projectConfigs)),
    // Deep merge `brand`
    brand: merge({}, ...configs.map((c) => c.brand)),
    canPublishProject: mergedFirst(configs.map((c) => c.canPublishProject)),
  };
}

type SectionedAliases = Record<string, Record<string, InsertAlias[]>>;

export interface InsertPanelConfig {
  /** Label for section that contains local components and code components. */
  componentsLabel: string;
  /**
   * Mappings from aliases to hostless component name or other special names
   * (see InsertPanel.tsx).
   */
  aliases: Partial<Record<InsertComponentAlias, string>>;
  /**
   * Sections of sections of aliases (2 levels of sections) that show on the
   * top of the insert panel. The keys are displayed as the section titles.
   */
  builtinSections: SectionedAliases;
  overrideSections: {
    website?: SectionedAliases;
    app?: SectionedAliases;
  };
}

function resolveBooleanPreference<T>(
  prefs: undefined | null | boolean | T,
  resolve: (prefs: T) => boolean | undefined,
  defaultAnswer: boolean
) {
  if (prefs == null) {
    return defaultAnswer;
  } else if (typeof prefs === "boolean") {
    return prefs;
  } else {
    return resolve(prefs) ?? defaultAnswer;
  }
}

function isComponentAlias(alias: InsertAlias): alias is InsertComponentAlias {
  return COMPONENT_ALIASES.includes(alias as any);
}

export function canEditStyleSection(
  config: UiConfig,
  section: PublicStyleSection,
  opts: {
    isContentCreator: boolean;
    defaultContentEditorVisible: boolean | undefined;
  }
) {
  const defaultAnswer = opts.isContentCreator
    ? !!opts.defaultContentEditorVisible
    : true;
  return resolveBooleanPreference(
    config.styleSectionVisibilities,
    (prefs) => prefs[section],
    defaultAnswer
  );
}

export function canInsertHostlessPackage(
  config: UiConfig,
  pkgName: string,
  opts: {
    insertPanel: InsertPanelConfig;
    hostlessPackages: HostLessPackageInfo[];
    isContentCreator: boolean;
  }
) {
  const defaultAnswer = opts.isContentCreator ? false : true;
  return resolveBooleanPreference(
    config.canInsertHostless,
    (hostlessPrefs) => hostlessPrefs[pkgName ?? ""],
    defaultAnswer
  );
}

export function canInsertAlias(
  config: UiConfig,
  alias: InsertAlias,
  opts: {
    insertPanel: InsertPanelConfig;
    hostlessPackages: HostLessPackageInfo[];
    isContentCreator: boolean;
  }
): boolean {
  const defaultAnswer = opts.isContentCreator ? false : true;
  if (isComponentAlias(alias)) {
    // a special / code component
    return resolveBooleanPreference(
      config.canInsertBuiltinComponent,
      (componentPrefs) => componentPrefs[alias],
      defaultAnswer
    );
  } else {
    // a basic component
    return resolveBooleanPreference(
      config.canInsertBasics,
      (basicPrefs) => basicPrefs[alias],
      defaultAnswer
    );
  }
}

export function canCreateAlias(config: UiConfig, alias: CreateAlias): boolean {
  return resolveBooleanPreference(
    config.canCreateBasics,
    (basicPrefs) => basicPrefs[alias],
    true
  );
}

export function getLeftTabPermission(
  config: UiConfig,
  tab: LeftTabUiKey,
  opts: {
    isContentCreator: boolean;
  }
) {
  const defaultAnswer = opts.isContentCreator
    ? LEFT_TAB_CONTENT_CREATOR_DEFAULT[tab]
    : "writable";

  if (!config.leftTabs) {
    return defaultAnswer;
  }
  const pref = config.leftTabs[tab];
  return pref ?? defaultAnswer;
}

const LEFT_TAB_CONTENT_CREATOR_DEFAULT: Record<LeftTabUiKey, UiAccess> = {
  outline: "writable",
  components: "hidden",
  tokens: "hidden",
  mixins: "hidden",
  fonts: "hidden",
  themes: "hidden",
  images: "writable",
  iconsSection: "writable",
  imagesSection: "writable",
  responsiveness: "hidden",
  imports: "hidden",
  versions: "writable",
  settings: "hidden",
  splits: "writable",
  lint: "writable",
  copilot: "hidden",
  figma: "hidden",
};

export function canEditProjectConfig(
  config: UiConfig,
  projectConfig?: ProjectConfig
) {
  if (typeof config.projectConfigs === "boolean") {
    return config.projectConfigs;
  }
  if (!projectConfig || !config.projectConfigs) {
    return true;
  }

  return config.projectConfigs[projectConfig] ?? true;
}

export function canEditUiConfig(
  team: ApiTeam | undefined,
  resource: ApiResource,
  user: ApiUser | null,
  perms: ApiPermission[]
) {
  if (!team || !isEnterprise(team.featureTier) || user?.isWhiteLabel) {
    return false;
  }
  const accessLevel = getAccessLevelToResource(resource, user, perms);
  return accessLevelRank(accessLevel) >= accessLevelRank("editor");
}

export function canPublishProject(config: UiConfig) {
  if (typeof config.canPublishProject === "boolean") {
    return config.canPublishProject;
  }

  return true;
}
