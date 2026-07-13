import { AppCtx } from "@/wab/client/app-ctx";
import { FrameClip } from "@/wab/client/clipboard/local";
import { RenameArenaProps } from "@/wab/client/commands/arena/renameArena";
import { toast } from "@/wab/client/components/Messages";
import { promptRemapCodeComponent } from "@/wab/client/components/modals/codeComponentModals";
import { confirm, reactConfirm } from "@/wab/client/components/quick-modals";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { NewComponentInfo } from "@/wab/client/components/widgets/NewComponentModal";
import {
  ImageAssetOpts,
  ResizableImage,
  maybeUploadImage,
} from "@/wab/client/dom-utils";
import { deleteComponent } from "@/wab/client/operations/delete-component";
import { deleteComponentState } from "@/wab/client/operations/delete-component-state";
import { deleteResourcesWithUsages } from "@/wab/client/operations/delete-resources";
import { deleteStyleToken } from "@/wab/client/operations/delete-style-token";
import { deleteVariant } from "@/wab/client/operations/delete-variant";
import { deleteVariantGroup } from "@/wab/client/operations/delete-variant-group";
import { updateComponentState } from "@/wab/client/operations/update-component-state";
import { promptComponentTemplate, promptPageName } from "@/wab/client/prompts";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { trackEvent } from "@/wab/client/tracking";
import { extractDataTokenUsages } from "@/wab/commons/DataToken";
import { joinReactNodes } from "@/wab/commons/components/ReactUtil";
import {
  deriveInitFrameSettings,
  ensureActivatedScreenVariantsForArena,
  getActivatedVariantsForFrame,
  getArenaFrames,
  getArenaName,
  isComponentArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import {
  ANIMATION_SEQUENCES_LOWER,
  DATA_QUERY_LOWER,
  DATA_TOKEN_LOWER,
  MIXIN_LOWER,
  SERVER_QUERY_LOWER,
  TOKEN_LOWER,
} from "@/wab/shared/Labels";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  VariantGroupType,
  areEquivalentScreenVariants,
  findDuplicateComponentVariant,
  getDisplayVariants,
  getOrderedScreenVariantSpecs,
  isCodeComponentVariant,
  isGlobalVariantGroup,
  isPrivateStyleVariant,
  isScreenVariantGroup,
  isStandaloneVariantGroup,
  isStyleVariant,
  makeVariantName,
  removeTplVariantSettings,
  removeTplVariantSettingsContaining,
} from "@/wab/shared/Variants";
import {
  cachedExprsInSite,
  componentToReferencers,
  componentsReferencerToPageHref,
  findComponentsUsingComponentVariant,
  findComponentsUsingGlobalVariant,
  findQueryInvalidationExprWithRefs,
  flattenComponent,
  getComponentsUsingImageAsset,
} from "@/wab/shared/cached-selectors";
import { toVarName } from "@/wab/shared/codegen/util";
import { arrayRemove } from "@/wab/shared/collections";
import {
  assert,
  ensure,
  mkUuid,
  removeAtIndexes,
  removeWhere,
  switchType,
  uniqueName,
} from "@/wab/shared/common";
import {
  addCustomComponentFrame,
  getComponentArenaBaseFrame,
  getComponentArenaCustomFrames,
  getManagedFrameForVariant,
  isCustomComponentFrame,
  isGlobalVariantFrame,
  isSuperVariantFrame,
  removeFramesFromComponentArenaForVariants,
  removeManagedFramesFromComponentArenaForVariantGroup,
} from "@/wab/shared/component-arenas";
import {
  CodeComponent,
  ComponentType,
  DefaultComponentKind,
  PageComponent,
  findStateForParam,
  getComponentDisplayName,
  isCodeComponent,
  isPageComponent,
  isPlumeComponent,
  removeVariantGroup,
} from "@/wab/shared/core/components";
import { extractTransitiveDepsFromComponents } from "@/wab/shared/core/project-deps";
import { siteFinalStyleTokensDirectDeps } from "@/wab/shared/core/site-style-tokens";
import {
  ensureScreenVariantsOrderOnMatrices,
  getComponentArena,
  getPageArena,
  getReferencingComponents,
  getResponsiveStrategy,
  getSiteArenas,
  swapPageLinks,
  visitComponentRefs,
} from "@/wab/shared/core/sites";
import {
  NormalStateVariableType,
  StateAccessType,
  findImplicitUsages,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import {
  extractAnimationSequenceUsages,
  extractMixinUsages,
  extractTokenUsages,
} from "@/wab/shared/core/styles";
import { MutableToken, OverrideableToken } from "@/wab/shared/core/tokens";
import {
  ExprReference,
  findExprsInComponent,
  findExprsInNode,
  flattenTpls,
  isTplSlot,
  isTplVariantable,
  replaceTplTreeByEmptyBox,
} from "@/wab/shared/core/tpls";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { asSvgDataUrl, parseSvgXml } from "@/wab/shared/data-urls";
import { Pt } from "@/wab/shared/geom";
import {
  AnimationSequence,
  Arena,
  ArenaFrame,
  Component,
  ComponentArena,
  ComponentDataQuery,
  ComponentServerQuery,
  ComponentVariantGroup,
  DataToken,
  Expr,
  GlobalVariantGroup,
  ImageAsset,
  Mixin,
  PageArena,
  ProjectDependency,
  Site,
  Split,
  State,
  StyleToken,
  Variant,
  VariantGroup,
  isKnownComponent,
  isKnownComponentVariantGroup,
  isKnownEventHandler,
} from "@/wab/shared/model/classes";
import {
  getFrameColumnIndex,
  removeManagedFramesFromPageArenaForVariants,
} from "@/wab/shared/page-arenas";
import { getPlumeEditorPlugin } from "@/wab/shared/plume/plume-registry";
import {
  flattenDataTokenUsage,
  isQueryUsedInExpr,
} from "@/wab/shared/refactoring";
import {
  FrameSize,
  ResponsiveStrategy,
  frameSizeGroups,
} from "@/wab/shared/responsiveness";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import {
  TplVisibility,
  getVariantSettingVisibility,
  setTplVisibility,
} from "@/wab/shared/visibility-utils";
import { notification } from "antd";
import L from "lodash";
import React from "react";

/**
 * Place for site-wide logic that both performs data model manipulation
 * (usually just by deferring to TplMgr), and updates client state.
 * All operations that mutate multiple component tplTrees should be here
 */
export class SiteOps {
  constructor(private studioCtx: StudioCtx) {}

  async updateActiveScreenVariantGroup(group: GlobalVariantGroup) {
    assert(
      isScreenVariantGroup(group),
      "Expected given variant group to be a screen variant group"
    );
    const prevGroup = this.site.activeScreenVariantGroup;

    await this.studioCtx.changeObserved(
      () => this.site.components,
      ({ success }) => {
        this.site.activeScreenVariantGroup = group;
        if (prevGroup) {
          const oldToNewVariant = new Map(
            prevGroup.variants.map((prevV) => [
              prevV,
              group.variants.find((newV) =>
                areEquivalentScreenVariants(newV, prevV)
              ),
            ])
          );
          for (const component of this.site.components) {
            for (const tpl of flattenComponent(component)) {
              if (isTplVariantable(tpl)) {
                for (const vs of tpl.vsettings) {
                  if (vs.variants.some((v) => oldToNewVariant.get(v))) {
                    vs.variants = vs.variants.map(
                      (v) => oldToNewVariant.get(v) ?? v
                    );
                  }
                }
              }
            }
          }
        }

        // remove varianted style token values from previous active screen variant group
        siteFinalStyleTokensDirectDeps(this.site).forEach((token) => {
          if (
            token instanceof MutableToken ||
            token instanceof OverrideableToken
          ) {
            prevGroup?.variants.forEach((v) => token.removeVariantedValue([v]));
          }
        });

        for (const arena of getSiteArenas(this.site)) {
          if (isComponentArena(arena)) {
            if (prevGroup) {
              removeFramesFromComponentArenaForVariants(
                arena,
                prevGroup.variants
              );
              removeManagedFramesFromComponentArenaForVariantGroup(
                arena,
                prevGroup
              );
            }
          } else {
            ensureActivatedScreenVariantsForArena(this.site, arena);
          }
        }
        ensureScreenVariantsOrderOnMatrices(this.site);
        return success();
      }
    );
  }

  addMatchingArenaFrame(screenVariant?: Variant) {
    const strategy = getResponsiveStrategy(this.site);
    const isMobileFirst = strategy === ResponsiveStrategy.mobileFirst;

    const spec = screenVariant && parseScreenSpec(screenVariant.mediaQuery!);
    const activeScreenGroup = this.site.activeScreenVariantGroup;
    const orderedScreenVariants = activeScreenGroup
      ? getOrderedScreenVariantSpecs(this.site, activeScreenGroup)
      : [];

    const fallbackWidth = spec?.maxWidth || spec?.minWidth || 0;
    const matchingSize = frameSizeGroups
      .flatMap((groups) => groups.sizes)
      .find((size) =>
        screenVariant
          ? // If creating frame for a specific screen variant,
            // we find the first screen size available that matches
            // that breakpoint
            spec!.match(size.width) &&
            orderedScreenVariants
              .filter((v) =>
                isMobileFirst
                  ? v.screenSpec.minWidth! > spec!.minWidth!
                  : v.screenSpec.maxWidth! < spec!.maxWidth!
              )
              .every((v) => !v.screenSpec.match(size.width))
          : isMobileFirst
          ? // If creating frame for the base screen variant,
            // we check the strategy and find the most suitable
            // screen size
            /iphone/i.test(size.name)
          : /desktop/i.test(size.name)
      ) ?? {
      name: "Custom size",
      width: fallbackWidth,
      height: (fallbackWidth * 2) / 3,
    };

    this.addScreenSizeToPageArenas(matchingSize);
  }

  pasteFrameClip(clip: FrameClip, originalFrame?: ArenaFrame): boolean {
    const arena = ensure(
      this.studioCtx.currentArena,
      "studioCtx should have a currentArena to allow pasting a frame clip"
    );
    const newFrame = this.tplMgr.cloneFrame(clip.frame, true);
    if (isMixedArena(arena)) {
      this.tplMgr.addExistingArenaFrame(
        arena,
        newFrame,
        this.studioCtx.currentViewportMidpt()
      );
      this.studioCtx.setStudioFocusOnFrame({ frame: newFrame, autoZoom: true });
      this.studioCtx.centerFocusedFrame();
      return true;
    } else if (isComponentArena(arena)) {
      if (arena.component === newFrame.container.component) {
        const originalFramePosition =
          arena.customMatrix.rows[0]?.cols.findIndex(
            (it) => it.frame === originalFrame
          );
        const newFramePosition =
          originalFramePosition !== undefined && originalFramePosition > -1
            ? originalFramePosition + 1
            : undefined;
        addCustomComponentFrame(
          this.studioCtx.site,
          arena,
          newFrame,
          newFramePosition
        );
        this.studioCtx.setStudioFocusOnFrame({
          frame: newFrame,
          autoZoom: true,
        });
        this.studioCtx.centerFocusedFrame(this.studioCtx.zoom);
        return true;
      } else {
        notification.error({
          message: `You cannot paste an artboard for "${newFrame.container.component.name}" here.`,
        });
        return false;
      }
    } else if (isPageArena(arena)) {
      notification.error({
        message: `You cannot paste an artboard here.`,
      });
      return false;
    }
    return false;
  }

  clearFrameComboSettings(frame: ArenaFrame) {
    const variants = getDisplayVariants({
      site: this.site,
      frame,
    }).map((e) => e.variant);

    // ensure it's a combo
    if (variants.length > 1) {
      flattenTpls(frame.container.component.tplTree).forEach((tpl) => {
        if (isTplVariantable(tpl)) {
          removeTplVariantSettings(tpl, variants);
        }
      });
    }
  }

  async removeArenaFrame(
    frame: ArenaFrame,
    opts: { pruneUnnamedComponent: boolean } = { pruneUnnamedComponent: true }
  ) {
    const arena = ensure(
      this.getArenaByFrame(frame),
      "Frame is expected to have an arena"
    );
    if (isMixedArena(arena)) {
      return this.change(() => this.removeMixedArenaFrame(arena, frame, opts));
    } else if (isComponentArena(arena)) {
      return this.removeComponentArenaFrame(arena, frame);
    } else {
      return this.change(() => this.removePageArenaFrame(arena, frame));
    }
  }

  removeMixedArenaFrame(
    arena: Arena,
    frame: ArenaFrame,
    opts: { pruneUnnamedComponent: boolean } = { pruneUnnamedComponent: true }
  ) {
    const wasFocused = this.studioCtx.focusedContentFrame() === frame;
    const frameIndex = arena.children.indexOf(frame);
    this.tplMgr.removeExistingArenaFrame(arena, frame, opts);

    if (wasFocused) {
      if (arena.children.length === 0) {
        this.studioCtx.setStudioFocusOnFrame({
          frame: undefined,
          autoZoom: false,
        });
      } else {
        this.studioCtx.setStudioFocusOnFrame({
          frame: arena.children[
            Math.min(frameIndex, arena.children.length - 1)
          ] as ArenaFrame,
          autoZoom: false,
        });
      }
    }
    this.fixChromeAfterRemoveFrame();
  }

  removeMixedArena(arena: Arena) {
    for (const frame of getArenaFrames(arena)) {
      this.tplMgr.removeExistingArenaFrame(arena, frame, {
        pruneUnnamedComponent: true,
      });
    }
    this.tplMgr.removeArena(arena);
    this.fixChromeAfterRemoveFrame();

    if (this.studioCtx.currentArena === arena) {
      this.studioCtx.switchToFirstArena();
    }
  }

  private findVariantGroupReferences(
    component: Component,
    group: VariantGroup
  ): ExprReference[] {
    const state = ensure(
      findStateForParam(component, group.param),
      "Variant group param must correspond to state"
    );
    return findExprsInComponent(component).filter(({ expr }) =>
      isStateUsedInExpr(state, expr)
    );
  }

  private notifyVariantGroupReferenced(
    component: Component,
    refs: ExprReference[],
    message = "Cannot delete variant group"
  ) {
    const viewCtx = this.studioCtx.focusedViewCtx();
    const maybeNode = refs.find((r) => r.node)?.node;
    const key = mkUuid();
    notification.error({
      key,
      message,
      description: (
        <>
          It is referenced in the current component.{" "}
          {viewCtx?.component === component && maybeNode ? (
            <a
              onClick={() => {
                viewCtx.setStudioFocusByTpl(maybeNode);
                notification.close(key);
              }}
            >
              [Go to reference]
            </a>
          ) : null}
        </>
      ),
    });
  }

  async removeComponentArenaFrame(arena: ComponentArena, frame: ArenaFrame) {
    const wasFocused = this.studioCtx.focusedContentFrame() === frame;

    if (
      isGlobalVariantFrame(arena, frame) ||
      isSuperVariantFrame(arena, frame) ||
      isCustomComponentFrame(arena, frame)
    ) {
      await this.change(() => {
        this.clearFrameComboSettings(frame);
        const index = getComponentArenaCustomFrames(arena).indexOf(frame);
        this.tplMgr.removeExistingArenaFrame(arena, frame);
        if (wasFocused) {
          const newCustomFrames = getComponentArenaCustomFrames(arena);
          if (newCustomFrames.length === 0) {
            this.studioCtx.setStudioFocusOnFrame({
              frame: getComponentArenaBaseFrame(arena),
            });
          } else {
            this.studioCtx.setStudioFocusOnFrame({
              frame:
                newCustomFrames[Math.min(index, newCustomFrames.length - 1)],
            });
          }
        }
        this.fixChromeAfterRemoveFrame();
      });
      return;
    }

    const variants = [...getActivatedVariantsForFrame(this.site, frame)];
    assert(
      variants.length === 1,
      "Only one variant should be active in a frame to be removed"
    );
    const variant = variants[0];
    const parent = variant.parent;

    if (parent?.variants.length) {
      const refs = this.findVariantGroupReferences(arena.component, parent);
      if (refs.length > 0) {
        this.notifyVariantGroupReferenced(arena.component, refs);
        return;
      }
      const implicitUsages = isKnownComponentVariantGroup(parent)
        ? findImplicitUsages(this.site, parent.linkedState)
        : [];
      if (implicitUsages.length > 0) {
        const components = L.uniq(
          implicitUsages.map((usage) => usage.component)
        );
        notification.error({
          message: "Cannot delete variant group",
          description: `It is referenced in ${components
            .map((c) => getComponentDisplayName(c))
            .join(", ")}.`,
        });
        return;
      }
    }
    const reallyDelete = await this.confirmDeleteVariant(
      variant,
      arena.component,
      { confirm: "always" }
    );
    if (!reallyDelete) {
      return;
    }

    await this.studioCtx.changeObserved(
      () => {
        return Array.from(
          findComponentsUsingComponentVariant(
            this.site,
            arena.component,
            variant
          )
        );
      },
      ({ success }) => {
        this.clearFrameComboSettings(frame);
        const index = variant.parent
          ? variant.parent.variants.indexOf(variant)
          : -1;
        this.tplMgr.tryRemoveVariant(variant, arena.component);

        if (variant.parent?.variants.length === 0) {
          removeVariantGroup(this.site, arena.component, variant.parent);
        } else if (wasFocused) {
          if (index < 0) {
            // For style variants, just refocus on base
            this.studioCtx.setStudioFocusOnFrame({
              frame: getComponentArenaBaseFrame(arena),
            });
          } else {
            const group = ensure(
              variant.parent,
              "Variant is expected to have a group"
            );
            const nextVariant =
              group.variants[Math.min(index, group.variants.length - 1)];
            const nextFrame = nextVariant
              ? getManagedFrameForVariant(this.site, arena, nextVariant)
              : undefined;
            this.studioCtx.setStudioFocusOnFrame({
              frame: nextFrame ?? getComponentArenaBaseFrame(arena),
            });
          }
        }
        this.fixChromeAfterRemoveFrame();
        return success();
      }
    );
  }

  private async confirmDeleteVariant(
    variant: Variant,
    component: Component | undefined,
    opts: {
      confirm: "always" | "if-referenced";
    }
  ) {
    const usingComps = !component
      ? findComponentsUsingGlobalVariant(this.site, variant)
      : findComponentsUsingComponentVariant(this.site, component, variant);
    if (opts.confirm === "always" || usingComps.size > 0) {
      return await reactConfirm({
        title: (
          <div>
            Are you sure you want to delete variant{" "}
            <strong>{makeVariantName({ variant, site: this.site })}</strong>?
          </div>
        ),
        message: (
          <>
            {usingComps.size > 0 && (
              <p>
                It is being used by{" "}
                {joinReactNodes(
                  [...usingComps].map((comp) =>
                    makeComponentName(this.site, comp)
                  ),
                  ", "
                )}
                .
              </p>
            )}
          </>
        ),
      });
    }
    return true;
  }

  removePageArenaFrame(arena: PageArena, frame: ArenaFrame) {
    const combinationRow = arena.customMatrix.rows.find((r) =>
      r.cols.some((c) => c.frame === frame)
    );
    this.clearFrameComboSettings(frame);
    if (!combinationRow) {
      const frameIndex = getFrameColumnIndex(
        this.studioCtx.currentArena as PageArena,
        frame
      );

      this.site.pageArenas.forEach((pageArena) =>
        pageArena.matrix.rows.forEach((pageArenaRow) =>
          removeAtIndexes(pageArenaRow.cols, [frameIndex])
        )
      );
    } else {
      removeWhere(combinationRow.cols, (c) => c.frame === frame);
    }
    this.fixChromeAfterRemoveFrame();
  }

  removePageArenaVariant(pageArena: PageArena, variant: Variant) {
    flattenTpls(pageArena.component.tplTree).forEach((tpl) => {
      if (isTplVariantable(tpl)) {
        removeTplVariantSettingsContaining(tpl, [variant]);
      }
    });
    removeManagedFramesFromPageArenaForVariants(pageArena, [variant]);
    this.fixChromeAfterRemoveFrame();
  }

  private fixChromeAfterRemoveFrame() {
    this.studioCtx.pruneInvalidViewCtxs();
  }

  moveFrameToArena(
    originArena: Arena,
    movingFrame: ArenaFrame,
    destinationArena: Arena
  ) {
    this.tplMgr.removeExistingArenaFrame(originArena, movingFrame, {
      pruneUnnamedComponent: false,
    });
    this.studioCtx.pruneInvalidViewCtxs();
    this.tplMgr.addExistingArenaFrame(
      destinationArena,
      movingFrame,
      new Pt(0, 0)
    );

    this.studioCtx.switchToArena(destinationArena);
  }

  updateImageAsset(asset: ImageAsset, image: ResizableImage) {
    asset.dataUri = image.url;
    asset.width = image.width;
    asset.height = image.height;
    asset.aspectRatio = image.scaledRoundedAspectRatio;
    return asset;
  }

  renameImageAsset(asset: ImageAsset, name: string) {
    this.tplMgr.renameImageAsset(asset, name);
  }

  createImageAsset(image: ResizableImage, opts: ImageAssetOpts) {
    return this.tplMgr.getOrCreateImageAsset(image, opts);
  }

  async createFrameForNewComponent(folderPath?: string) {
    const componentInfo = await promptComponentTemplate(
      this.studioCtx,
      folderPath
    );
    if (!componentInfo) {
      return;
    }
    await this.studioCtx.changeUnsafe(() =>
      this.createFrameForNewComponentWithName(componentInfo)
    );
  }

  createFrameForNewComponentWithName(info: NewComponentInfo) {
    const component = this.studioCtx.addComponent(info.name, {
      type: ComponentType.Plain,
      ...info,
      noSwitchArena: true,
    });
    const currentArena = this.studioCtx.currentArena;
    const componentArena = getComponentArena(this.site, component);
    if ((currentArena && isMixedArena(currentArena)) || !componentArena) {
      this.createNewFrameForMixedArena(component, {});
    } else {
      this.studioCtx.switchToArena(componentArena);
    }
  }

  async createFrameForNewPage() {
    const name = await promptPageName();
    if (name) {
      await this.studioCtx.changeUnsafe(() =>
        this.createFrameForNewPageWithName(name)
      );
    }
  }

  createFrameForNewPageWithName(name: string) {
    // Segment track
    trackEvent("Create component", {
      projectName: this.studioCtx.siteInfo.name,
      componentName: name,
      type: ComponentType.Page,
      action: "add-component",
    });

    const tplMgr = this.studioCtx.tplMgr();
    const page = tplMgr.addComponent({ name: name, type: ComponentType.Page });
    const currentArena = this.studioCtx.currentArena;
    const pageArena = getPageArena(this.site, page);
    if ((currentArena && isMixedArena(currentArena)) || !pageArena) {
      this.createNewFrameForMixedArena(page, {});
    } else {
      this.studioCtx.switchToArena(pageArena);
    }
  }

  createNewFrameForMixedArena(
    component: Component,
    opts: {
      width?: number;
      height?: number;
    } = {}
  ) {
    const arena = this.studioCtx.currentArena;
    assert(isMixedArena(arena), "Current arena should be a mixed arena");

    const derivedViewOpts = deriveInitFrameSettings(
      this.site,
      arena,
      component
    );
    const frame = this.tplMgr.addNewMixedArenaFrame(arena, "", component, {
      ...derivedViewOpts,
      ...opts,
      insertPt: this.studioCtx.currentViewportMidpt(),
    });
    this.studioCtx.setStudioFocusOnFrame({ frame: frame, autoZoom: true });
    return frame;
  }

  async maybePromptForTransitiveImports(
    msg: React.ReactNode,
    transitiveDeps: ProjectDependency[]
  ) {
    if (transitiveDeps.length === 0) {
      return true;
    }

    const message = (
      <>
        <p>{msg}</p>
        <ul>
          {transitiveDeps.map((dep) => {
            const projectId =
              this.studioCtx.projectDependencyManager.getDependencyData(
                dep.pkgId
              )?.latestPkgVersionMeta?.pkg?.projectId;
            return (
              <li key={dep.uid}>
                {projectId ? (
                  <a
                    href={fillRoute(APP_ROUTES.project, { projectId })}
                    target="_blank"
                  >
                    {dep.name}
                  </a>
                ) : (
                  dep.name
                )}
              </li>
            );
          })}
        </ul>
      </>
    );

    return await confirm({ message });
  }

  promoteComponentToDefaultKind(
    studioCtx: StudioCtx,
    component: Component,
    kind: DefaultComponentKind
  ) {
    studioCtx.site.defaultComponents[kind] = component;
  }

  tryRemoveComponent(component: Component) {
    assert(
      !component.superComp || isCodeComponent(component),
      "Cannot remove sub-components"
    );

    const result = deleteComponent(
      component,
      this.studioCtx.site,
      this.studioCtx,
      this.tplMgr
    );
    if (result.result === "error") {
      notification.error({ message: result.message });
    }
  }

  tryRenameArenas(entries: RenameArenaProps[]) {
    if (entries.length === 0) {
      return;
    }
    for (const { arena, newName } of entries) {
      const oldName = getArenaName(arena);
      if (oldName === newName) {
        continue;
      }

      switchType(arena)
        .when(Arena, (it) => this.studioCtx.tplMgr().renameArena(it, newName))
        .when([PageArena, ComponentArena], (it) =>
          this.studioCtx.siteOps().tryRenameComponent(it.component, newName)
        );

      // Switch to currentArena to force the URL to update with the new name
      if (arena === this.studioCtx.currentArena) {
        this.studioCtx.switchToArena(arena, { replace: true });
      }
    }
  }

  tryRenameComponent(component: Component, newName: string) {
    this.tplMgr.renameComponent(component, newName);
    this.studioCtx.maybeWarnComponentRenaming(newName, component.name);
  }

  async tryDuplicatingComponent(
    component: Component,
    opts: { focusNewComponent: boolean } = { focusNewComponent: true }
  ) {
    const componentType = isPageComponent(component) ? "page" : "component";

    const transitiveDeps = extractTransitiveDepsFromComponents(this.site, [
      component,
    ]);

    const badTransitiveDepsNames = L.uniq(
      transitiveDeps
        .filter((dep) =>
          this.studioCtx.projectDependencyManager.getDependencyData(dep.pkgId)
        )
        .map((dep) => dep.name)
    );

    if (badTransitiveDepsNames.length > 0) {
      notification.error({
        message: `Multiple versions of the projects: ${badTransitiveDepsNames.join(
          ", "
        )} detected.
        Before duplicating this ${componentType}, make sure all imported projects use the same version.`,
      });
      return;
    }

    if (
      !(await this.maybePromptForTransitiveImports(
        <>
          The {componentType} you are cloning uses things from the following
          projects. To clone this {componentType}, you will also need to import
          these projects. Are you sure you want to continue?
        </>,
        transitiveDeps
      ))
    ) {
      return;
    }

    const newName = uniqueName(
      this.site.components.map((it) => it.name),
      component.name
    );

    return this.studioCtx.change(({ success }) => {
      for (const dep of transitiveDeps) {
        this.studioCtx.projectDependencyManager.addTransitiveDepAsDirectDep(
          dep
        );
      }

      const newComp = this.tplMgr.cloneComponent(component, newName, true);

      if (opts.focusNewComponent) {
        const arena = this.studioCtx.currentArena;
        if (isMixedArena(arena)) {
          this.studioCtx
            .siteOps()
            .createNewFrameForMixedArena(newComp.component);
        } else {
          this.studioCtx.switchToComponentArena(newComp.component);
        }
      }

      return success();
    });
  }

  async swapComponents(fromComp: Component, toComp: Component) {
    const referencersSet = componentToReferencers(this.site).get(fromComp);

    return await this.studioCtx.changeObserved(
      () => {
        return Array.from(referencersSet ?? []);
      },
      ({ success }) => {
        this.studioCtx.tplMgr().swapComponents(fromComp, toComp);
        return success();
      }
    );
  }

  async swapPagesLinks(fromPage: PageComponent, toPage: PageComponent) {
    return await this.studioCtx.changeObserved(
      () => [...componentsReferencerToPageHref(this.site, fromPage)],
      ({ success }) => {
        swapPageLinks(this.studioCtx.site, fromPage, toPage);
        return success();
      }
    );
  }
  /**
   * Returns true if `fromComponent` instances have successfully been replaced and
   * it's been deleted, and false if the user closed the form
   */
  async tryRemapCodeComponent(
    component: CodeComponent,
    titleMessage: React.ReactNode
  ) {
    if (!this.studioCtx.site.components.includes(component)) {
      // may be a sub component that was removed when parent was removed
      return true;
    }
    const referencersSet = componentToReferencers(this.site).get(component);

    if (referencersSet && referencersSet.size > 0) {
      const componentToRemap = await promptRemapCodeComponent({
        studioCtx: this.studioCtx,
        component,
        refComponents: Array.from(referencersSet),
        title: titleMessage,
      });
      if (!componentToRemap) {
        return false;
      }

      await this.studioCtx.changeObserved(
        () => {
          return Array.from(referencersSet ?? []);
        },
        ({ success }) => {
          if (componentToRemap === "delete") {
            visitComponentRefs(
              this.studioCtx.site,
              component,
              (tplComponent, owner) => {
                if (isKnownComponent(owner) && owner.tplTree === tplComponent) {
                  // We need to replace the root, just create an empty free box with
                  // all vsettings
                  replaceTplTreeByEmptyBox(owner);
                } else {
                  $$$(tplComponent).remove({ deep: true });
                }
              },
              (refExpr, ownerTpl) => {
                findExprsInNode(ownerTpl).forEach(({ expr }) => {
                  if (isKnownEventHandler(expr)) {
                    expr.interactions.forEach((interaction) => {
                      if (
                        interaction.args.find((arg) => arg.expr === refExpr)
                      ) {
                        interaction.args = [];
                      }
                    });
                  }
                });
              }
            );
          } else {
            // Swap with the component to remap to
            this.tplMgr.swapComponents(component, componentToRemap);
          }
          this.tryRemoveComponent(component);
          return success();
        }
      );
    } else {
      await this.studioCtx.change(({ success }) => {
        this.tryRemoveComponent(component);
        return success();
      });
    }
    return true;
  }

  /**
   * Currently observes the entire site for upgrading project dependencies.
   * Would be nice if we could do it incrementally only for the components we change.
   * Another option would be to have this operation happen server-side and reload the
   * whole updated bundle.
   */
  async upgradeProjectDeps(
    targetDeps: ProjectDependency[],
    opts?: { noUndoRecord?: boolean }
  ) {
    await this.studioCtx.changeObserved(
      () => {
        return this.site.components;
      },
      ({ success }) => {
        this.tplMgr.upgradeProjectDeps(targetDeps);
        this.studioCtx.ensureAllComponentStackFramesHasOnlyValidVariants();
        return success();
      },
      opts
    );
  }

  /**
   * Currently observes the entire site for upgrading project dependencies.
   * See comment for `upgradeProjectDeps`
   */
  async removeProjectDependency(projectDependency: ProjectDependency) {
    await this.studioCtx.changeObserved(
      () => {
        return this.site.components;
      },
      ({ success }) => {
        this.tplMgr.removeProjectDep(projectDependency);
        this.studioCtx.ensureAllComponentStackFramesHasOnlyValidVariants();
        return success();
      }
    );
  }

  updateState(
    state: State,
    update: {
      accessType?: StateAccessType;
      variableType?: NormalStateVariableType;
      initialValue?: Expr | null;
    }
  ) {
    const component = ensure(
      this.site.components.find((c) => c.states.includes(state)),
      "Expected some component to contain the given state"
    );

    const result = updateComponentState(state, update, {
      site: this.site,
      component,
      tplMgr: this.tplMgr,
    });
    if (result.result === "error") {
      notification.error({
        message: update.accessType
          ? `Cannot set access type to "${update.accessType}"`
          : update.initialValue !== undefined
          ? "Cannot set initial value"
          : "Cannot update variable",
        description: result.message,
      });
    }
  }

  removeState(component: Component, state: State) {
    const result = deleteComponentState(state, {
      site: this.site,
      component,
    });
    if (result.result === "error") {
      const viewCtx = this.studioCtx.focusedViewCtx();
      const refNode = result.referencingNode;
      const key = mkUuid();
      notification.error({
        key,
        message: "Cannot delete variable",
        description: (
          <>
            {result.message}{" "}
            {viewCtx?.component === component && refNode ? (
              <a
                onClick={() => {
                  viewCtx.setStudioFocusByTpl(refNode);
                  notification.close(key);
                }}
              >
                [Go to reference]
              </a>
            ) : null}
          </>
        ),
      });
      return false;
    }
    return true;
  }

  async removeComponentQuery(component: Component, query: ComponentDataQuery) {
    const refs = findExprsInComponent(component).filter(({ expr }) =>
      isQueryUsedInExpr(query.name, expr)
    );
    if (refs.length > 0) {
      const viewCtx = this.studioCtx.focusedViewCtx();
      const maybeNode = refs.find((r) => r.node)?.node;
      const key = mkUuid();
      notification.error({
        key,
        message: `Cannot delete ${DATA_QUERY_LOWER}`,
        description: (
          <>
            It is referenced in the current component.{" "}
            {viewCtx?.component === component && maybeNode ? (
              <a
                onClick={() => {
                  viewCtx.setStudioFocusByTpl(maybeNode);
                  notification.close(key);
                }}
              >
                [Go to reference]
              </a>
            ) : null}
          </>
        ),
      });
      return;
    }

    const componentRef = findQueryInvalidationExprWithRefs(this.site, [
      query.uuid,
    ]);
    await this.studioCtx.changeObserved(
      () => componentRef.map(({ ownerComponent }) => ownerComponent),
      ({ success }) => {
        this.tplMgr.removeComponentQuery(component, query);
        return success();
      }
    );
  }

  async removeComponentServerQuery(
    component: Component,
    query: ComponentServerQuery
  ) {
    const refs = findExprsInComponent(component).filter(({ expr }) =>
      isQueryUsedInExpr(query.name, expr)
    );
    if (refs.length > 0) {
      const viewCtx = this.studioCtx.focusedViewCtx();
      const maybeNode = refs.find((r) => r.node)?.node;
      const key = mkUuid();
      notification.error({
        key,
        message: `Cannot delete ${SERVER_QUERY_LOWER}`,
        description: (
          <>
            It is referenced in the current component.{" "}
            {viewCtx?.component === component && maybeNode ? (
              <a
                onClick={() => {
                  viewCtx.setStudioFocusByTpl(maybeNode);
                  notification.close(key);
                }}
              >
                [Go to reference]
              </a>
            ) : null}
          </>
        ),
      });
      return;
    }

    await this.studioCtx.changeObserved(
      () => [],
      ({ success }) => {
        this.tplMgr.removeComponentServerQuery(component, query);
        return success();
      }
    );
  }

  async removeVariantGroup(component: Component, group: ComponentVariantGroup) {
    const result = await deleteVariantGroup(
      group,
      component,
      this.site,
      this.studioCtx,
      this.tplMgr
    );

    if (result.result === "error" && !result.cancelled) {
      const key = mkUuid();
      if (result.variantGroupRefs) {
        this.notifyVariantGroupReferenced(
          component,
          result.variantGroupRefs,
          "Cannot delete variant group"
        );
      } else {
        notification.error({
          key,
          message: "Cannot delete variant group",
          description: result.message,
        });
      }
    }
  }

  async removeGlobalVariantGroup(group: VariantGroup) {
    const result = await deleteVariantGroup(
      group,
      undefined,
      this.site,
      this.studioCtx,
      this.tplMgr
    );

    if (result.result === "error" && !result.cancelled) {
      const key = mkUuid();
      notification.error({
        key,
        message: "Cannot delete variant group",
        description: result.message,
      });
    }
  }

  async removeVariant(component: Component, variant: Variant) {
    const result = await deleteVariant(
      variant,
      component,
      this.site,
      this.studioCtx,
      this.tplMgr,
      { behaviour: "confirm-if-referenced" }
    );

    if (result.result === "error" && !result.cancelled) {
      const key = mkUuid();
      if (result.variantGroupRefs) {
        this.notifyVariantGroupReferenced(
          component,
          result.variantGroupRefs,
          "Cannot delete variant"
        );
      } else {
        notification.error({
          key,
          message: "Cannot delete variant",
          description: result.message,
        });
      }
    }
  }

  tryRenameVariant(variant: Variant, newName: string) {
    if (isStandaloneVariantGroup(variant.parent)) {
      this.tryRenameVariantGroup(variant.parent!, newName);
    } else {
      this.tplMgr.renameVariant(variant, newName);
    }
  }

  tryRenameVariantGroup(group: VariantGroup, newName: string) {
    if (group.type === VariantGroupType.Component) {
      const component = ensure(
        this.site.components.find((c) => c.variantGroups.includes(group)),
        "Expected some component to contain the given variant group"
      );
      if (isPlumeComponent(component)) {
        const groupName = toVarName(group.param.variable.name);
        const plugin = getPlumeEditorPlugin(component);
        const isRequired = plugin?.componentMeta.variantDefs.some(
          (def) => def.group === groupName && def.required
        );
        if (isRequired) {
          const key = mkUuid();
          notification.error({
            key,
            message: "Cannot delete variant group",
            description: `Please note that in order for the "${component.name}" component to function properly, the "${group.param.variable.name}" variant must exist.`,
          });
          return;
        }
      }
    }
    this.tplMgr.renameVariantGroup(group, newName);
  }

  async removeGlobalVariant(variant: Variant) {
    const really = await this.confirmDeleteVariant(variant, undefined, {
      confirm: "if-referenced",
    });
    if (!really) {
      return;
    }
    await this.studioCtx.changeObserved(
      () => {
        return Array.from(findComponentsUsingGlobalVariant(this.site, variant));
      },
      ({ success }) => {
        this.tplMgr.tryRemoveVariant(variant, undefined);
        this.studioCtx.ensureGlobalStackFramesHasOnlyValidVariants();
        this.studioCtx.pruneInvalidViewCtxs();
        return success();
      }
    );
  }

  async removeSplitAndGlobalVariant(split: Split, group: VariantGroup) {
    const result = await deleteVariantGroup(
      group,
      undefined,
      this.site,
      this.studioCtx,
      this.tplMgr
    );

    if (result.result === "error") {
      if (!result.cancelled) {
        const key = mkUuid();
        notification.error({
          key,
          message: "Cannot delete variant group",
          description: result.message,
        });
      }
      return;
    }

    await this.studioCtx.changeObserved(
      () => [],
      ({ success }) => {
        this.tplMgr.removeSplit(split);
        return success();
      }
    );
  }

  removeStyleOrCodeComponentVariantIfDuplicateOrEmpty(
    component: Component,
    variant: Variant
  ) {
    const duplicateVariant = findDuplicateComponentVariant(component, variant);

    if (duplicateVariant) {
      this.tplMgr.tryRemoveVariant(variant, component);

      if (!isPrivateStyleVariant(duplicateVariant)) {
        const componentArena = getComponentArena(this.site, component);
        if (componentArena) {
          const existingFrame = getManagedFrameForVariant(
            this.site,
            componentArena,
            duplicateVariant
          );
          this.studioCtx.setStudioFocusOnFrame({ frame: existingFrame });
        }
      }
    } else if (
      (isCodeComponentVariant(variant) &&
        variant.codeComponentVariantKeys?.length === 0) ||
      (isStyleVariant(variant) && variant.selectors.length === 0)
    ) {
      this.tplMgr.tryRemoveVariant(variant, component);
    }

    this.studioCtx.ensureComponentStackFramesHasOnlyValidVariants(component);
    this.studioCtx.pruneInvalidViewCtxs();
  }

  updateVariantGroupMulti(group: VariantGroup, multi: boolean) {
    this.tplMgr.updateVariantGroupMulti(group, multi);

    if (!multi) {
      // If we're switching from multi to single, then make sure we only
      // reference at most one variant from this group in our VariantFrames
      for (const vc of this.studioCtx.viewCtxs) {
        if (isGlobalVariantGroup(group)) {
          vc.globalFrame.keepOnlyOneOfVariants(group);
        } else {
          for (const frame of vc.componentStackFrames()) {
            if (frame.tplComponent.component.variantGroups.includes(group)) {
              frame.keepOnlyOneOfVariants(group);
            }
          }
        }
      }
    }
  }

  convertComponentToPage(component: Component) {
    const refCompsAndPresets = getReferencingComponents(this.site, component);

    if (refCompsAndPresets.length > 0) {
      notification.error({
        message: `A page component cannot be instantiated.`,
        description: `${getComponentDisplayName(
          component
        )} is still being used by ${L.uniq(
          refCompsAndPresets.map((c) => getComponentDisplayName(c))
        ).join(", ")}.`,
      });

      return;
    }
    if (this.site.pageWrapper === component) {
      notification.error({
        message: `A page component cannot be instantiated.`,
        description: `${getComponentDisplayName(
          component
        )} is still being used as the default page wrapper.`,
      });

      return;
    }

    const curArena = this.studioCtx.currentArena;
    const isCurrentArena =
      isComponentArena(curArena) && curArena.component === component;
    this.tplMgr.convertComponentToPage(component);
    toast("Component converted to page.");
    if (isCurrentArena) {
      this.studioCtx.switchToComponentArena(component);
    }
  }

  async convertPageToComponent(component: PageComponent) {
    const curArena = this.studioCtx.currentArena;
    const isCurrentArena =
      curArena && isPageArena(curArena) && curArena.component === component;
    await this.studioCtx.changeObserved(
      () => [
        component,
        ...componentsReferencerToPageHref(this.site, component),
      ],
      ({ success }) => {
        this.tplMgr.convertPageToComponent(component);
        toast("Page converted to reusable component.");
        if (isCurrentArena) {
          // Switch to the corresponding component arena!
          this.studioCtx.switchToComponentArena(component);
        }
        return success();
      }
    );
  }

  convertNonRenderedToInvisible() {
    for (const comp of this.studioCtx.site.components) {
      for (const tpl of flattenTpls(comp.tplTree)) {
        for (const vs of tpl.vsettings) {
          const visibility = getVariantSettingVisibility(vs);
          if (isTplSlot(tpl) && visibility === TplVisibility.DisplayNone) {
            // Slots should always be "Not Rendered" and not DisplayNone; this was a mistake
            setTplVisibility(tpl, vs.variants, TplVisibility.NotRendered);
          }
          if (!isTplSlot(tpl) && visibility === TplVisibility.NotRendered) {
            // everything else getting converted to DisplayNone from NotRendered
            setTplVisibility(tpl, vs.variants, TplVisibility.DisplayNone);
          }
        }
      }
    }
  }

  rebuildDedicatedArenas() {
    this.tplMgr.rebuildDedicatedArenas();
    this.studioCtx.pruneInvalidViewCtxs();
  }

  createVariant(component: Component, group: ComponentVariantGroup) {
    const variant = this.tplMgr.createVariant(component, group);
    this.onVariantAdded(variant);
  }

  createStyleVariant(component: Component, selectors?: string[]) {
    const [variant, isNew] = this.tplMgr.createStyleVariant(
      component,
      selectors
    );
    if (isNew) {
      this.onVariantAdded(variant);
    }
  }

  createCodeComponentVariant(
    component: Component,
    codeComponentName: string,
    codeComponentVariantKeys: string[] = []
  ) {
    const variant = this.tplMgr.createCodeComponentVariant(
      component,
      codeComponentName,
      codeComponentVariantKeys
    );
    this.onVariantAdded(variant);
  }

  createGlobalVariant(group: VariantGroup) {
    assert(isGlobalVariantGroup(group), "Expected a global variant group");
    const variant = this.tplMgr.createGlobalVariant(group);
    this.onVariantAdded(variant);
  }

  addScreenSizeToPageArenas(size: FrameSize) {
    const index = this.tplMgr.addScreenSizeToPageArenas(size);

    // Switch to focusing on the new frame
    const arena = this.studioCtx.currentArena;
    if (isPageArena(arena)) {
      const currentFrame = this.studioCtx.focusedViewCtx()?.arenaFrame();
      const currentRow = arena.matrix.rows.find((r) =>
        r.cols.some((col) => col.frame === currentFrame)
      );
      if (currentRow) {
        this.studioCtx.setStudioFocusOnFrame({
          frame: currentRow.cols[index].frame,
        });
      }
    }
  }

  private onVariantAdded(variant: Variant) {
    const vcontroller = makeVariantsController(this.studioCtx);
    vcontroller?.onAddedVariant(variant, { focusFrame: true });

    this.studioCtx.latestVariantCreated = variant;
  }

  createVariantGroup(component: Component, optionsType: VariantOptionsType) {
    const group = this.tplMgr.createVariantGroup({ component, optionsType });

    this.studioCtx.latestVariantGroupCreated = group;

    if (optionsType === VariantOptionsType.standalone) {
      this.onVariantAdded(group.variants[0]);
    }
  }

  async tryDeleteImageAssets(assets: ImageAsset[]) {
    const resourcesWithUsage = assets.map((asset) => {
      const components = getComponentsUsingImageAsset(this.site, asset);
      return {
        resource: asset,
        usageSummary: { components },
        usageCount: components.length,
      };
    });

    return deleteResourcesWithUsages(
      this.studioCtx,
      resourcesWithUsage,
      (asset) => this.tplMgr.removeImageAsset(asset),
      {
        deleteLabel: "asset",
      }
    );
  }

  async tryDeleteTokens(
    tokens: StyleToken[],
    opts?: {
      behaviour?:
        | "confirm-if-referenced"
        | "delete-if-referenced"
        | "error-if-referenced";
    }
  ) {
    const resourcesWithUsage = tokens.map((token) => {
      const [usages, summary] = extractTokenUsages(this.site, token);
      return {
        resource: token,
        usageSummary: summary,
        usageCount: usages.size,
      };
    });

    return deleteResourcesWithUsages(
      this.studioCtx,
      resourcesWithUsage,
      (token) => deleteStyleToken({ site: this.site, token }),
      {
        behaviour: opts?.behaviour,
        deleteLabel: TOKEN_LOWER,
      }
    );
  }

  async tryDeleteDataTokens(tokens: DataToken[]) {
    const resourcesWithUsage = tokens.map((token) => {
      const usageSummary = extractDataTokenUsages(
        this.studioCtx.siteInfo.id,
        this.site,
        token
      );
      const usageCount =
        usageSummary.components.length + usageSummary.frames.length;
      return { resource: token, usageSummary, usageCount };
    });

    const projectId = this.studioCtx.siteInfo.id;
    return deleteResourcesWithUsages(
      this.studioCtx,
      resourcesWithUsage,
      (token) => {
        // Find all expressions that use this data token and flatten them
        for (const { ownerComponent, exprRefs } of cachedExprsInSite(
          this.site
        )) {
          for (const exprRef of exprRefs) {
            flattenDataTokenUsage(token, exprRef, projectId, ownerComponent);
          }
        }
        arrayRemove(this.site.dataTokens, token);
      },
      {
        deleteLabel: DATA_TOKEN_LOWER,
      }
    );
  }

  async tryDeleteMixins(mixins: Mixin[]) {
    const resourcesWithUsage = mixins.map((mixin) => {
      const [usages, summary] = extractMixinUsages(this.site, mixin);
      return {
        resource: mixin,
        usageSummary: summary,
        usageCount: usages.size,
      };
    });

    return deleteResourcesWithUsages(
      this.studioCtx,
      resourcesWithUsage,
      (mixin) => {
        const [usages] = extractMixinUsages(this.site, mixin);
        usages.forEach((usage) => arrayRemove(usage.mixins, mixin));
        arrayRemove(this.site.mixins, mixin);
      },
      {
        deleteLabel: MIXIN_LOWER,
      }
    );
  }

  async tryDeleteAnimationSequences(
    animationSequences: AnimationSequence[],
    opts?: {
      behaviour?:
        | "confirm-if-referenced"
        | "delete-if-referenced"
        | "error-if-referenced";
    }
  ) {
    const resourcesWithUsage = animationSequences.map((animSeq) => {
      const [usages, summary] = extractAnimationSequenceUsages(
        this.site,
        animSeq
      );
      return {
        resource: animSeq,
        usageSummary: summary,
        usageCount: usages.size,
      };
    });

    return deleteResourcesWithUsages(
      this.studioCtx,
      resourcesWithUsage,
      (animSeq) => {
        const [usages] = extractAnimationSequenceUsages(this.site, animSeq);
        usages.forEach((usage) =>
          removeWhere(usage.animations ?? [], (a) => a.sequence === animSeq)
        );
        arrayRemove(this.site.animationSequences, animSeq);
      },
      {
        behaviour: opts?.behaviour,
        deleteLabel: ANIMATION_SEQUENCES_LOWER,
      }
    );
  }

  async swapTokens(fromToken: StyleToken, toToken: StyleToken) {
    const [_, summary] = extractTokenUsages(this.site, fromToken);
    await this.studioCtx.changeObserved(
      () => {
        return [
          ...summary.components,
          ...summary.frames.map((f) => f.container.component),
        ];
      },
      ({ success }) => {
        this.tplMgr.swapTokens(fromToken, toToken);
        return success();
      }
    );
  }

  private getArenaByFrame(frame: ArenaFrame) {
    return getSiteArenas(this.site).find((arena) =>
      getArenaFrames(arena).includes(frame)
    );
  }

  private get site() {
    return this.studioCtx.site;
  }

  private get tplMgr() {
    return this.studioCtx.tplMgr();
  }

  private change(f: () => void) {
    return this.studioCtx.changeUnsafe(f);
  }
}

export async function uploadSvgImage(
  xml: string,
  useSvgSize: boolean,
  width: number,
  height: number,
  appCtx: AppCtx,
  name?: string
) {
  const svg = parseSvgXml(xml);

  const processedSvg = await appCtx.api.processSvg({ svgXml: xml });
  assert(processedSvg.status === "success", "Invalid processed SVG");
  const sanitized = processedSvg.result.xml;

  // Attempt to use the svg dimensions.
  if (useSvgSize) {
    width = Number(svg.getAttribute("width")) || width;
    height = Number(svg.getAttribute("height")) || height;
  }

  const img = new ResizableImage(
    asSvgDataUrl(sanitized),
    width,
    height,
    processedSvg.result.aspectRatio
  );
  const { imageResult, opts } = await maybeUploadImage(
    appCtx,
    img,
    undefined,
    name
  );
  return { imageResult, opts };
}

export async function addSvgImageAsset(
  xml: string,
  useSvgSize: boolean,
  width: number,
  height: number,
  siteOps: SiteOps,
  appCtx: AppCtx,
  name?: string
) {
  const { imageResult, opts } = await uploadSvgImage(
    xml,
    useSvgSize,
    width,
    height,
    appCtx,
    name
  );
  if (!imageResult || !opts) {
    return {};
  }
  const asset = siteOps.createImageAsset(imageResult, opts);
  return { img: imageResult, asset: asset };
}

function makeComponentName(site: Site, comp: Component) {
  if (comp.type === ComponentType.Frame) {
    for (const arena of site.arenas) {
      if (getArenaFrames(arena).some((f) => f.container.component === comp)) {
        return `an artboard in ${arena.name}`;
      }
    }
    return "unknown artboard";
  } else {
    return <code>{comp.name}</code>;
  }
}
