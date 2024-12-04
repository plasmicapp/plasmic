import { DeepMap } from "@/wab/commons/deep-map";
import { AppAuthProvider } from "@/wab/shared/ApiSchema";
import { VariantCombo } from "@/wab/shared/Variants";
import { ComponentGenHelper } from "@/wab/shared/codegen/codegen-helpers";
import { ReactHookSpec } from "@/wab/shared/codegen/react-p/react-hook-spec";
import { NodeNamer } from "@/wab/shared/codegen/react-p/serialize-utils";
import { ExportOpts, ProjectConfig } from "@/wab/shared/codegen/types";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { CssProjectDependencies } from "@/wab/shared/core/sites";
import { CssVarResolver } from "@/wab/shared/core/styles";
import { DevFlagsType } from "@/wab/shared/devflags";
import {
  Component,
  ImageAsset,
  Site,
  TplNode,
  VariantGroup,
} from "@/wab/shared/model/classes";
import { VariantComboSorter } from "@/wab/shared/variant-sort";

export type VariantComboChecker = (
  variantCombo: VariantCombo,
  ignoreScreenVariant?: boolean
) => string;

export interface SerializerSiteContext {
  projectFlags: DevFlagsType;
  cssProjectDependencies: CssProjectDependencies;
  cssVarResolver: CssVarResolver;
}

export interface SerializerBaseContext {
  componentGenHelper: ComponentGenHelper;
  nodeNamer: NodeNamer;
  site: Site;
  siteCtx: SerializerSiteContext;
  component: Component;
  reactHookSpecs: ReactHookSpec[];
  projectConfig: ProjectConfig;
  usedGlobalVariantGroups: Set<VariantGroup>;
  variantComboChecker: VariantComboChecker;
  variantComboSorter: VariantComboSorter;
  directCodeGenConfig?: {
    // When the children of an element or component instance is a single string,
    // should we evaluate them in the helper class where
    // args/variants/triggerState/globalVariants are referenced as
    // "this.args"/"this.variants"/"this.triggerState"/"this.globalVariants".
    evalSingleStringChildrenInHelper: boolean;
  };
  exportOpts: ExportOpts;
  aliases: ImportAliasesMap;
  markTpl?: TplNode;
  s3ImageLinks: Record<string, string>;
  projectFlags: DevFlagsType;
  cssVarResolver: CssVarResolver;
  insideRichTextBlock?: boolean;
  usesDataSourceInteraction?: boolean;
  usesLoginInteraction?: boolean;
  usesGlobalActions?: boolean;
  usesComponentLevelQueries?: boolean;
  cache: Record<string, DeepMap<any>>;
  forceAllCsr: boolean;
  appAuthProvider?: AppAuthProvider;
  isPlasmicHosted?: boolean;
  serializeTplNode: (ctx: SerializerBaseContext, node: TplNode) => string;
  exprCtx: ExprCtx;
  /**
   * These tpls only exist during codegen for certain improvements in the user-generated code.
   * Because of this, they do not accept certain props/attrs that are passed to other plasmic tpls,
   * such as overrides and implicit states."
   */
  fakeTpls: TplNode[];
  /**
   * Depending on certain conditions, we can modify the import path of certain hostless components
   * to improve the user-generated code. For instance, we can make simplified forms tree-shakable by
   * importing a simpler form component instead of the full form component for schema forms.
   */
  replacedHostlessComponentImportPath: Map<Component, string>;
}

export type ImportAliasesMap = Map<Component | ImageAsset, string>;
