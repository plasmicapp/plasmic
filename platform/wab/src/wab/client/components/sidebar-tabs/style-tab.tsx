import { MenuBuilder } from "@/wab/client/components/menu-builder";
import {
  TplComponentNameSection,
  TplTagNameSection,
} from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { ComponentTab } from "@/wab/client/components/sidebar-tabs/ComponentTab/ComponentTab";
import { PageTab } from "@/wab/client/components/sidebar-tabs/PageTab/PageTab";
import {
  Section,
  StyleTabFilter,
  canRenderMixins,
  canRenderPrivateStyleVariants,
  getOrderedSectionRender,
} from "@/wab/client/components/sidebar-tabs/Sections";
import { PopoverFrameProvider } from "@/wab/client/components/sidebar/PopoverFrame";
import { SidebarModalProvider } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { NamedPanelHeader } from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  TplExpsProvider,
  mkStyleComponent,
  providesStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useCurrentRecordingTarget } from "@/wab/client/hooks/useCurrentRecordingTarget";
import SlotIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Slot";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { isDedicatedArena } from "@/wab/shared/Arenas";
import { MIXINS_CAP, PRIVATE_STYLE_VARIANTS_CAP } from "@/wab/shared/Labels";
import {
  getAncestorTplSlot,
  isCodeComponentSlot,
  revertToDefaultSlotContents,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  findOrCreatePrivateStyleVariant,
  getPrivateStyleVariantsForTag,
  isBaseVariant,
} from "@/wab/shared/Variants";
import { cx, spawn } from "@/wab/shared/common";
import {
  getComponentDisplayName,
  isCodeComponent,
  isFrameComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import { isTplAttachedToSite } from "@/wab/shared/core/sites";
import { SlotSelection } from "@/wab/shared/core/slots";
import { getApplicableSelectors } from "@/wab/shared/core/styles";
import {
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import {
  Component,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  isKnownRenderExpr,
  isKnownTplTag,
  isKnownVirtualRenderExpr,
} from "@/wab/shared/model/classes";
import { selectionControlsColor } from "@/wab/styles/css-variables";
import { Alert, Button, Menu } from "antd";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { createContext, useContext } from "react";

export const StyleTabContext = createContext<StyleTabFilter>("all");

/**
 * Represents a pending animation to be added.
 * - "base": Animation on the base variant (for "On Load")
 * - "selector": Animation on a private style variant with the given CSS selector
 */
export type NewAnimation =
  | { type: "base" }
  | { type: "selector"; cssSelector: string }
  | null;

interface NewAnimationContextValue {
  newAnimation: NewAnimation;
  onAnimationAdded: () => void;
}

export const NewAnimationContext = createContext<NewAnimationContextValue>({
  newAnimation: null,
  onAnimationAdded: () => {},
});

export function useNewAnimationContext() {
  return useContext(NewAnimationContext);
}

const StyleTabForTpl = observer(function _StyleTabForTpl(props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;
  const studioCtx = viewCtx.studioCtx;
  const styleTabFilter = useContext(StyleTabContext);
  const [showMixins, setShowMixins] = React.useState(isMixinSet(tpl, viewCtx));
  const [showPrivateStyleVariants, setShowPrivateStyleVariants] =
    React.useState(shouldShowPrivateStyleVariantsSection(tpl, viewCtx));
  const [newAnimation, setNewAnimation] = React.useState<NewAnimation>(null);
  const clearNewAnimation = React.useCallback(() => setNewAnimation(null), []);
  React.useEffect(() => {
    const mixinDisposal = mobx.reaction(
      () => {
        // We read focusedTpl instead of tpl, as tpl may have changed,
        // and this reaction may be running before the surrounding component
        // has been re-rendered.
        const curTpl = viewCtx.focusedTpl(false);
        return !!curTpl && isMixinSet(curTpl, viewCtx);
      },
      (mixinVisible) => setShowMixins(mixinVisible),
      {
        fireImmediately: true,
      }
    );
    const privateStyleVariantsDisposal = mobx.reaction(
      () => {
        const curTpl = viewCtx.focusedTpl(false);
        return (
          !!curTpl && shouldShowPrivateStyleVariantsSection(curTpl, viewCtx)
        );
      },
      (privateStyleVariantsVisible) =>
        setShowPrivateStyleVariants(privateStyleVariantsVisible),
      {
        fireImmediately: true,
      }
    );
    return () => {
      mixinDisposal();
      privateStyleVariantsDisposal();
    };
  }, [tpl, viewCtx]);
  const isTag = isTplTag(tpl);
  const isComponent = isTplComponent(tpl);
  const ancestorSlot = getAncestorTplSlot(tpl, true);

  const expsProvider = new TplExpsProvider(viewCtx, tpl as TplNode);
  const sc = mkStyleComponent({
    expsProvider,
  });
  const currentCombo = viewCtx.variantTplMgr().getCurrentVariantCombo();
  const isBase = isBaseVariant(currentCombo);

  const showStyleSections =
    styleTabFilter === "all" || styleTabFilter === "style-only";

  const vcontroller = makeVariantsController(studioCtx, viewCtx);
  // Compute checks for ApplyMenu visibility
  const canShowAnimations =
    isTag && canRenderPrivateStyleVariants(tpl, viewCtx) && showStyleSections;
  const canShowElementVariants =
    canRenderPrivateStyleVariants(tpl, viewCtx) &&
    !showPrivateStyleVariants &&
    showStyleSections;
  const canShowMixins =
    canRenderMixins(tpl, viewCtx) && !showMixins && showStyleSections;

  const buildApplyMenu = (): React.ReactElement | null => {
    if (!canShowAnimations && !canShowElementVariants && !canShowMixins) {
      return null;
    }

    const builder = new MenuBuilder();

    // Animations submenu (only for TplTag elements)
    if (canShowAnimations && isKnownTplTag(tpl)) {
      const component = viewCtx.currentTplComponent().component;
      const isRoot = tpl === component.tplTree;
      const applicableSelectors = getApplicableSelectors(tpl.tag, true, isRoot);

      builder.genSub("Animations", (push) => {
        push(
          <Menu.Item
            key="base"
            onClick={() => {
              setShowPrivateStyleVariants(true);
              setNewAnimation({ type: "base" });
            }}
          >
            Base
          </Menu.Item>
        );

        // Available selectors (Hover, Pressed, etc.) - each uses a private style variant
        // Filter out "Not X" selectors as they don't make sense for animations
        for (const selector of applicableSelectors.filter(
          (s) => !s.displayName.toLowerCase().startsWith("not ")
        )) {
          push(
            <Menu.Item
              key={selector.cssSelector}
              onClick={async () => {
                await studioCtx.change(({ success }) => {
                  // Find or create private style variant with this selector
                  const variant = findOrCreatePrivateStyleVariant(
                    component,
                    tpl,
                    selector.cssSelector,
                    (selectors) =>
                      studioCtx
                        .tplMgr()
                        .createPrivateStyleVariant(component, tpl, selectors)
                  );
                  // Pin the variant to turn on recording for it
                  vcontroller?.onClickVariant(variant);

                  return success();
                });

                setShowPrivateStyleVariants(true);
                setNewAnimation({
                  type: "selector",
                  cssSelector: selector.cssSelector,
                });
              }}
            >
              {selector.displayName}
            </Menu.Item>
          );
        }
      });
    }

    // Element variants (existing behavior - shows the section)
    if (canShowElementVariants) {
      builder.genSection(undefined, (push) => {
        push(
          <Menu.Item
            key="private-style-variants"
            onClick={() => setShowPrivateStyleVariants(true)}
          >
            {PRIVATE_STYLE_VARIANTS_CAP}
          </Menu.Item>
        );
      });
    }

    // Mixins (existing behavior)
    if (canShowMixins) {
      builder.genSection(undefined, (push) => {
        push(
          <Menu.Item key="mixins" onClick={() => setShowMixins(true)}>
            {MIXINS_CAP}
          </Menu.Item>
        );
      });
    }

    return builder.build({ menuName: "apply-menu" });
  };

  const orderedSections = getOrderedSectionRender(
    tpl,
    viewCtx,
    new Map([
      [Section.Mixins, showMixins],
      [Section.PrivateStyleVariants, showPrivateStyleVariants],
    ]),
    styleTabFilter
  );

  const newAnimationContextValue = React.useMemo(
    () => ({
      newAnimation,
      onAnimationAdded: clearNewAnimation,
    }),
    [newAnimation, clearNewAnimation]
  );

  return providesStyleComponent(sc)(
    <NewAnimationContext.Provider value={newAnimationContextValue}>
      {isTplSlot(tpl) && <TplSlotMessage tpl={tpl} viewCtx={viewCtx} />}
      {ancestorSlot && !isBase && !isCodeComponentSlot(ancestorSlot) && (
        <NonBaseTplSlotDescendantMessage
          viewCtx={viewCtx}
          slot={ancestorSlot}
        />
      )}
      {isTag && (
        <TplTagNameSection
          viewCtx={viewCtx}
          tpl={tpl as TplTag}
          buildMenu={buildApplyMenu}
        />
      )}
      {isComponent && (
        <TplComponentNameSection
          viewCtx={viewCtx}
          tpl={tpl as TplComponent}
          buildMenu={buildApplyMenu}
        />
      )}
      {orderedSections.map((render) => render())}
    </NewAnimationContext.Provider>
  );
});

/** Get the focused component, either from the ViewCtx (focused arena frame), or from the arena itself (so, even if you have nothing selected but are on a dedicated page/component arena. */
export function getFocusedComponentFromViewCtxOrArena(
  studioCtx: StudioCtx,
  viewCtx: ViewCtx | undefined
) {
  const arena = studioCtx.currentArena;

  return (
    viewCtx?.currentComponent() ??
    (isDedicatedArena(arena) ? arena.component : undefined)
  );
}

export const ComponentOrPageTab = observer(function ComponentOrPageTab(props: {
  studioCtx: StudioCtx;
  viewCtx: ViewCtx;
  isHalf?: boolean;
}) {
  const { studioCtx, viewCtx, isHalf } = props;
  const component = viewCtx.currentComponent();
  const focused = viewCtx.focusedSelectable();
  const tpl = viewCtx.focusedTpl(false);
  const hasElementPanel =
    (focused || tpl) && component && !isFrameComponent(component);
  if (!component) {
    return null;
  }

  const shouldShowPageTab = isPageComponent(component);
  const shouldShowComponentTab =
    !shouldShowPageTab && !isFrameComponent(component);

  return (
    <PopoverFrameProvider containerSelector=".canvas-editor__right-pane">
      <SidebarModalProvider containerSelector=".canvas-editor__right-pane">
        <div
          className={cx({
            "canvas-editor__right-pane__top": true,
            "canvas-editor__right-pane__top--with-bottom":
              isHalf && hasElementPanel,
          })}
        >
          {shouldShowPageTab && (
            <div
              className="canvas-editor__right-stack-pane"
              data-test-id="page-panel"
            >
              <PageTab
                page={component}
                studioCtx={studioCtx}
                viewCtx={viewCtx}
                isHalf={isHalf}
              />
            </div>
          )}
          {shouldShowComponentTab && (
            <div
              className="canvas-editor__right-stack-pane"
              // data-test-id="component-panel"
            >
              <ComponentTab
                studioCtx={studioCtx}
                viewCtx={viewCtx}
                component={component}
                isHalf={isHalf}
              />
            </div>
          )}
        </div>
      </SidebarModalProvider>
    </PopoverFrameProvider>
  );
});

export const StyleTab = observer(function StyleTab(props: {
  studioCtx: StudioCtx;
  viewCtx?: ViewCtx;
}) {
  const { studioCtx, viewCtx } = props;
  const tpl = viewCtx?.focusedTpl(true);

  React.useEffect(() => {
    if (tpl && !isTplAttachedToSite(studioCtx.site, tpl)) {
      spawn(
        studioCtx.change<never>(
          ({ success }) => {
            studioCtx.setStudioFocusOnFrameContents(undefined);
            studioCtx.focusReset.dispatch();
            return success();
          },
          {
            noUndoRecord: true,
          }
        )
      );
    }
  }, [tpl]);

  if (tpl && !isTplAttachedToSite(studioCtx.site, tpl)) {
    // We will fix this invalid state in the useEffect hook
    // and render null to avoid errors due to this invalid state
    return null;
  }

  if (!viewCtx) {
    return null;
  }

  return <StyleTabBottomPanel studioCtx={studioCtx} viewCtx={viewCtx} />;
});

const StyleTabBottomPanel = observer(function StyleTabBottomPanel(props: {
  studioCtx: StudioCtx;
  viewCtx: ViewCtx;
}) {
  const { viewCtx } = props;

  const focused = viewCtx.focusedSelectable();
  const tpl = viewCtx.focusedTpl(false);
  const component = viewCtx.currentComponent();

  const currentTarget = useCurrentRecordingTarget();

  return (
    <PopoverFrameProvider containerSelector=".style-tab">
      <SidebarModalProvider containerSelector=".style-tab">
        <div className="canvas-editor__right-pane__bottom style-tab">
          <div
            className="canvas-editor__right-pane__bottom__scroll"
            style={
              focused
                ? {
                    borderLeft:
                      currentTarget === "baseVariant"
                        ? "1px solid transparent"
                        : `1px solid var(${selectionControlsColor})`,
                  }
                : undefined
            }
          >
            {focused instanceof SlotSelection ? (
              <SlotSelectionMessage node={focused} viewCtx={viewCtx} />
            ) : tpl === component.tplTree && isCodeComponent(component) ? (
              <CodeComponentRootMessage component={component} />
            ) : isCodeComponent(component) && isTplSlot(tpl) ? (
              <CodeComponentTplSlotMessage component={component} />
            ) : tpl ? (
              <>
                <StyleTabForTpl viewCtx={viewCtx} tpl={tpl} />
              </>
            ) : null}
          </div>
        </div>
      </SidebarModalProvider>
    </PopoverFrameProvider>
  );
});

function CodeComponentRootMessage(props: { component: Component }) {
  return (
    <div className={"canvas-editor__right-float-pane"}>
      <SidebarSection>
        <div className="panel-row mt-lg">
          <Alert
            type="info"
            showIcon={true}
            message={
              <div>
                This is the root of code component{" "}
                <code>{getComponentDisplayName(props.component)}</code>. It is
                not editable.
              </div>
            }
          />
        </div>
      </SidebarSection>
    </div>
  );
}

function CodeComponentTplSlotMessage(props: { component: Component }) {
  return (
    <div className={"canvas-editor__right-float-pane"}>
      <SidebarSection>
        <div className="panel-row mt-lg">
          <Alert
            type="info"
            showIcon={true}
            message={
              <div>
                This the slot of code component{" "}
                <code>{getComponentDisplayName(props.component)}</code>. Please
                edit its content in the canvas.
              </div>
            }
          />
        </div>
      </SidebarSection>
    </div>
  );
}

const SlotSelectionMessage = observer(function SlotSelectionMessage(props: {
  viewCtx: ViewCtx;
  node: SlotSelection;
}) {
  const { viewCtx, node } = props;
  const tplComponent = node.getTpl();
  const component = tplComponent.component;
  const arg = $$$(tplComponent).getSlotArgForParam(node.slotParam);
  return (
    <div className="canvas-editor__right-float-pane">
      <SidebarSection>
        <div className="flex flex-col gap-lg">
          <div className="flex flex-vcenter">
            <Icon icon={SlotIcon} className="component-fg mr-sm" />
            <div className="code text-xlg flex-fill">
              {node.slotParam.variable.name}
            </div>
            <div className="ml-sm">
              Slot for <code>{getComponentDisplayName(component)}</code>
            </div>
          </div>
          <p className="text-m">{node.slotParam.about}</p>
        </div>
      </SidebarSection>

      {arg &&
        isKnownRenderExpr(arg.expr) &&
        !isKnownVirtualRenderExpr(arg.expr) && (
          <SidebarSection>
            <Button
              onClick={() =>
                viewCtx.change(() => {
                  revertToDefaultSlotContents(
                    viewCtx.tplMgr(),
                    tplComponent,
                    node.slotParam.variable
                  );
                })
              }
            >
              Revert to default slot content
            </Button>
          </SidebarSection>
        )}
    </div>
  );
});

const TplSlotMessage = observer(function TplSlotMessage(props: {
  viewCtx: ViewCtx;
  tpl: TplSlot;
}) {
  const { viewCtx, tpl } = props;
  const component = $$$(tpl).owningComponent();
  return (
    <SidebarSection>
      {
        <NamedPanelHeader
          icon={<Icon icon={SlotIcon} className="component-fg" />}
          value={tpl.param.variable.name}
          onChange={(val) =>
            viewCtx.change(() =>
              viewCtx.getViewOps().tryRenameParam(val, tpl.param)
            )
          }
          placeholder={`(unnamed slot)`}
          suffix={
            <div className="text-ellipsis">
              Slot target for <code>{getComponentDisplayName(component)}</code>
            </div>
          }
        />
      }
      <div className="panel-row mt-lg">
        <Alert
          type="info"
          showIcon={true}
          message={
            <div>
              This is a slot target - instances of{" "}
              <code>{getComponentDisplayName(component)}</code> can customize
              the content of this slot target. You can provide default text
              styles to control how text and icons look in this slot. You cannot
              reference dynamic values specific to this component, since the
              owner of the slot content is the instance parent.
            </div>
          }
        />
      </div>
    </SidebarSection>
  );
});

const NonBaseTplSlotDescendantMessage = observer(
  function NonBaseTplSlotDescendantMessage(props: {
    viewCtx: ViewCtx;
    slot: TplSlot;
  }) {
    const { slot, viewCtx } = props;
    return (
      <SidebarSection>
        <Alert
          type="warning"
          showIcon={true}
          message={
            <div>
              This is default content for slot target{" "}
              <code>{slot.param.variable.name}</code>. Note that the default
              slot content is the same for all variants, so edits you make will
              target the Base variant. If you want to <em>style</em> slot
              content differently for different variants, you can do so{" "}
              <strong>
                <a
                  onClick={() =>
                    viewCtx.change(() => viewCtx.setStudioFocusByTpl(slot))
                  }
                >
                  on the slot target instead
                </a>
              </strong>
              .
            </div>
          }
        />
      </SidebarSection>
    );
  }
);

export const NonBaseVariantTransitionsMessage = observer(
  NonBaseVariantTransitionsMessage_
);

function NonBaseVariantTransitionsMessage_() {
  const studioCtx = useStudioCtx();

  const handleBaseVariantLinkClick = () =>
    studioCtx.changeUnsafe(() => {
      const vcontroller = makeVariantsController(studioCtx);
      vcontroller?.onClearVariants();
    });

  return (
    <Alert
      showIcon
      type="warning"
      message={
        <div>
          The transitions style is always applied to the{" "}
          <a onClick={handleBaseVariantLinkClick}>Base variant</a>.
        </div>
      }
    />
  );
}

function isMixinSet(tpl: TplNode, viewCtx: ViewCtx) {
  if (!isTplVariantable(tpl)) {
    return false;
  }
  const vtm = viewCtx.variantTplMgr();
  const activeVariants = [...vtm.getActivatedVariantsForNode(tpl)];
  const effectiveVs = vtm.effectiveVariantSetting(tpl, activeVariants);
  return effectiveVs.rs.mixins.length > 0;
}

/**
 * Returns true if the Private Style Variants section should be shown.
 * This is true if:
 * - There are any private style variants for the tpl, OR
 * - There are any base variant animations (animations on tpl without private style selectors)
 */
function shouldShowPrivateStyleVariantsSection(tpl: TplNode, viewCtx: ViewCtx) {
  if (!isTplTag(tpl)) {
    return false;
  }

  const component = viewCtx.currentTplComponent().component;

  // Check for private style variants
  const privateStyleVariants = getPrivateStyleVariantsForTag(component, tpl);
  if (privateStyleVariants.length > 0) {
    return true;
  }

  // Check for base variant animations
  const vtm = viewCtx.variantTplMgr();
  const baseVariantCombo = vtm.getCurrentSharedVariantComboForNode(tpl);
  const { definedIndicator } = vtm.getAnimationInfoForVariantCombo(
    tpl,
    baseVariantCombo
  );

  return definedIndicator.source !== "none";
}
