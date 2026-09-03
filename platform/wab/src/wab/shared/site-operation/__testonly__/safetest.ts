import type {
  Arena,
  Component,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";
import type {
  Safe,
  SafeComponent,
  SafeTplNode,
} from "@/wab/shared/site-operation/safe";

// This file will be checked by tsc to ensure correctness of safe.ts

function __testAssignability__() {
  const site = {} as Site;
  const safeSite = {} as Safe<Site>;

  const siteAssignableToSafeSite: Safe<Site> = site;
  // @ts-expect-error Safe<Site> cannot be assigned to Site
  const safeSiteAssignableToSite: Site = safeSite;

  // nested Components are converted to SafeComponents
  const componentAssignableToComponent: Component = site.components[0];
  const componentAssignableToSafeComponent: SafeComponent = site.components[0];
  // @ts-expect-error SafeComponent cannot be assigned to Component
  const safeComponentAssignableToComponent: Component = safeSite.components[0];
  const safeComponentAssignableToSafeComponent: SafeComponent =
    safeSite.components[0];

  // nested TplNodes are converted to SafeTplNodes
  const tplNodeAssignableToTplNode: TplNode | null | undefined =
    site.globalVariant.forTpl;
  const tplNodeAssignableToSafeTplNode: SafeTplNode | null | undefined =
    site.globalVariant.forTpl;
  // @ts-expect-error SafeTplNode cannot be assigned to TplNode
  const safeTplNodeAssignableToTplNode: TplNode | null | undefined =
    safeSite.globalVariant.forTpl;
  const safeTplNodeAssignableToSafeTplNode: SafeTplNode | null | undefined =
    safeSite.globalVariant.forTpl;

  // nested Arenas are converted to Safe<Arena>s
  const arenaAssignableToArena: Arena = site.arenas[0];
  const arenaAssignableToSafeArena: Safe<Arena> = site.arenas[0];
  // @ts-expect-error Safe<Arena> cannot be assigned to Arena
  const safeArenaAssignableToArena: Arena = safeSite.arenas[0];
  const safeArenaAssignableToSafeArena: Safe<Arena> = safeSite.arenas[0];
}

function __testReadonly__() {
  const component = {} as Component;
  const safeComponent = {} as SafeComponent;

  // Some properties of Component like name are always safe to write.
  component.name = "okay";
  safeComponent.name = "okay";

  // Some properties of Component like tplNode are not safe to write.
  component.tplTree = {} as TplNode;
  // @ts-expect-error SafeComponent.tplTree is readonly
  safeComponent.tplTree = {} as TplNode;

  // All properties of TplNode are not safe to write.
  component.tplTree.uid = 0;
  // @ts-expect-error SafeComponent.tplTree.uid is readonly
  safeComponent.tplTree.uid = 0;

  // Nested TplNodes are not safe to write.
  component.tplTree.typeTag === "TplComponent" &&
    (component.tplTree.component.tplTree = {} as TplNode);
  component.tplTree.typeTag === "TplSlot" &&
    (component.tplTree.defaultContents[0] = {} as TplNode);
  component.tplTree.typeTag === "TplTag" &&
    (component.tplTree.children[0] = {} as TplNode);
  safeComponent.tplTree.typeTag === "TplComponent" &&
    // @ts-expect-error TplComponent.component.tplTree is readonly
    (safeComponent.tplTree.component.tplTree = {} as TplNode);
  safeComponent.tplTree.typeTag === "TplSlot" &&
    // @ts-expect-error TplSlot.defaultContents is readonly
    (safeComponent.tplTree.defaultContents = []);
  safeComponent.tplTree.typeTag === "TplTag" &&
    // @ts-expect-error TplTag.children is readonly
    (safeComponent.tplTree.children = []);
}
