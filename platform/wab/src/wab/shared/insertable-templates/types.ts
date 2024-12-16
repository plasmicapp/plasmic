import {
  InsertableTemplateComponentResolution,
  InsertableTemplateTokenResolution,
} from "@/wab/shared/devflags";
import {
  Arena,
  Component,
  ProjectDependency,
  Site,
  Variant,
} from "@/wab/shared/model/classes";
import { PkgInfo } from "@/wab/shared/SharedApi";
import { VariantCombo } from "@/wab/shared/Variants";

export type HostLessDependencies = Record<
  string,
  {
    pkg: PkgInfo;
    projectDependency: ProjectDependency;
  }
>;

export type CloneOpts = {
  skipDuplicateCheck?: true;
};

export interface InsertableTemplateExtraInfo {
  site: Site;
  screenVariant: Variant | undefined;
  hostLessDependencies: HostLessDependencies;
  projectId: string;
  resolution: {
    token?: InsertableTemplateTokenResolution;
    component?: InsertableTemplateComponentResolution;
  };
}

export interface InsertableTemplateComponentExtraInfo
  extends InsertableTemplateExtraInfo {
  component: Component;
}

export interface InsertableTemplateArenaExtraInfo
  extends InsertableTemplateExtraInfo {
  arena: Arena;
}

export interface CopyElementsReference {
  type: "tpl-node";
  uuid: string;
  activeVariantsUuids: string[];
}

export type CopyStateBundleRef =
  | {
      type: "revision";
      revisionNum: number;
    }
  | {
      type: "pkg";
      pkgId: string;
      version: string;
    };

export interface CopyState {
  action: "cross-tab-copy";
  projectId: string;
  componentName: string;
  componentUuid: string;
  branchId?: string;
  bundleRef: CopyStateBundleRef;
  references: CopyElementsReference[];
}

export interface CopyStateExtraInfo
  extends InsertableTemplateComponentExtraInfo {
  references: CopyElementsReference[];
  activeVariants?: VariantCombo;
}

export type TargetVariants = {
  baseVariant: Variant;
  screenVariant?: Variant;
};

export interface InlineComponentContext {
  sourceSite: Site;
  sourceComp: Component;
  targetSite: Site;
  targetBaseVariant: Variant;
  extraInfo: InsertableTemplateComponentExtraInfo;
  plumeSite: Site | undefined;
}
