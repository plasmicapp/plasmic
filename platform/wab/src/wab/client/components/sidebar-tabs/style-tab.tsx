import {
  TplComponentNameSection,
  TplTagNameSection,
} from "@/wab/client/components/sidebar-tabs/ComponentPropsSection";
import { ComponentTab } from "@/wab/client/components/sidebar-tabs/ComponentTab/ComponentTab";
import { PageTab } from "@/wab/client/components/sidebar-tabs/PageTab/PageTab";
import {
  canRenderArbitraryCssSelectors,
  canRenderMixins,
  canRenderPrivateStyleVariants,
  getOrderedSectionRender,
  Section,
  StyleTabFilter,
} from "@/wab/client/components/sidebar-tabs/Sections";
import { NamedPanelHeader } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarModalProvider } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  mkStyleComponent,
  providesStyleComponent,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useCurrentRecordingTarget } from "@/wab/client/hooks/useCurrentRecordingTarget";
import SlotIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Slot";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { cx, spawn } from "@/wab/shared/common";
import {
  getComponentDisplayName,
  isCodeComponent,
  isFrameComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import { isDedicatedArena } from "@/wab/shared/Arenas";
import { MIXINS_CAP } from "@/wab/shared/Labels";
import {
  Component,
  isKnownRenderExpr,
  isKnownVirtualRenderExpr,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import {
  getAncestorTplSlot,
  isCodeComponentSlot,
  revertToDefaultSlotContents,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  getArbitraryCssSelectorsVariantsForTag,
  getPrivateStyleVariantsForTag,
  isBaseVariant,
} from "@/wab/shared/Variants";
import { isTplAttachedToSite } from "@/wab/shared/core/sites";
import { SlotSelection } from "@/wab/shared/core/slots";
import { selectionControlsColor } from "@/wab/styles/css-variables";
import {
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import { Alert, Button } from "antd";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { createContext, useContext } from "react";

export const StyleTabContext = createContext<StyleTabFilter>("all");

const StyleTabForTpl = observer(function _StyleTabForTpl(props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;
  const styleTabFilter = useContext(StyleTabContext);
  const [showMixins, setShowMixins] = React.useState(isMixinSet(tpl, viewCtx));
  const [showPrivateStyleVariants, setShowPrivateStyleVariants] =
    React.useState(isPrivateStyleVariantSet(tpl, viewCtx));
  const [showArbitraryCssSelectors, setShowArbitraryCssSelectors] =
    React.useState(isArbitraryCssSelectorsVariantSet(tpl, viewCtx));
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
        return !!curTpl && isPrivateStyleVariantSet(curTpl, viewCtx);
      },
      (privateStyleVariantsVisible) =>
        setShowPrivateStyleVariants(privateStyleVariantsVisible),
      {
        fireImmediately: true,
      }
    );
    const arbitraryCssSelectorsDisposal = mobx.reaction(
      () => {
        const curTpl = viewCtx.focusedTpl(false);
        return !!curTpl && isArbitraryCssSelectorsVariantSet(curTpl, viewCtx);
      },
      (arbitraryCssSelectorsVisible) =>
        setShowArbitraryCssSelectors(arbitraryCssSelectorsVisible),
      {
        fireImmediately: true,
      }
    );
    return () => {
      mixinDisposal();
      privateStyleVariantsDisposal();
      arbitraryCssSelectorsDisposal();
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

  const applyMenu: { label: string; onClick: () => void }[] = [];
  const showStyleSections =
    styleTabFilter === "all" || styleTabFilter === "style-only";
  if (
    canRenderPrivateStyleVariants(tpl, viewCtx) &&
    !showPrivateStyleVariants &&
    showStyleSections
  ) {
    applyMenu.push({
      label: "Element States",
      onClick: () => setShowPrivateStyleVariants(true),
    });
  }
  if (canRenderMixins(tpl, viewCtx) && !showMixins && showStyleSections) {
    applyMenu.push({ label: MIXINS_CAP, onClick: () => setShowMixins(true) });
  }
  if (
    canRenderArbitraryCssSelectors(tpl, viewCtx) &&
    !showArbitraryCssSelectors &&
    viewCtx.appCtx.appConfig.arbitraryCssSelectors &&
    showStyleSections
  ) {
    applyMenu.push({
      label: "Arbitraty CSS Selectors",
      onClick: () => setShowArbitraryCssSelectors(true),
    });
  }

  const orderedSections = getOrderedSectionRender(
    tpl,
    viewCtx,
    new Map([
      [Section.Mixins, showMixins],
      [Section.PrivateStyleVariants, showPrivateStyleVariants],
      ...(viewCtx.appCtx.appConfig.arbitraryCssSelectors
        ? [[Section.ArbitraryCssSelectors, showArbitraryCssSelectors]]
        : ([] as any)),
    ]),
    styleTabFilter
  );

  return providesStyleComponent(sc)(
    <>
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
          menuOptions={applyMenu}
        />
      )}
      {isComponent && (
        <TplComponentNameSection
          viewCtx={viewCtx}
          tpl={tpl as TplComponent}
          menuOptions={applyMenu}
        />
      )}
      {orderedSections.map((render) => render())}
    </>
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
  viewCtx?: ViewCtx | null;
  isHalf?: boolean;
}) {
  const { studioCtx, viewCtx, isHalf } = props;
  const component = viewCtx?.currentComponent();
  const focused = viewCtx?.focusedSelectable();
  const tpl = viewCtx?.focusedTpl(false);
  const hasElementPanel =
    (focused || tpl) && component && !isFrameComponent(component);
  if (!component) {
    return null;
  }

  const shouldShowPageTab = isPageComponent(component);
  const shouldShowComponentTab =
    !shouldShowPageTab && !isFrameComponent(component);

  return (
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

  return (
    <>
      {!studioCtx.contentEditorMode &&
        !studioCtx.appCtx.appConfig.rightTabs && (
          <ComponentOrPageTab studioCtx={studioCtx} viewCtx={viewCtx} isHalf />
        )}
      {viewCtx && (
        <StyleTabBottomPanel studioCtx={studioCtx} viewCtx={viewCtx} />
      )}
    </>
  );
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

function isPrivateStyleVariantSet(tpl: TplNode, viewCtx: ViewCtx) {
  if (!isTplTag(tpl)) {
    return false;
  }
  const component = viewCtx.currentTplComponent().component;
  const privateStyleVariants = getPrivateStyleVariantsForTag(component, tpl);
  return privateStyleVariants.length > 0;
}

function isArbitraryCssSelectorsVariantSet(tpl: TplNode, viewCtx: ViewCtx) {
  if (!isTplTag(tpl)) {
    return false;
  }
  const component = viewCtx.currentTplComponent().component;
  const arbitraryCssSelectors = getArbitraryCssSelectorsVariantsForTag(
    component,
    tpl
  );
  return arbitraryCssSelectors.length > 0;
}
