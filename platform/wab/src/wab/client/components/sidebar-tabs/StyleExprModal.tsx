import { ensureKnownStyleExpr, StyleExpr, TplComponent } from "@/wab/classes";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import {
  BorderPanelSection,
  BorderRadiusSection,
} from "@/wab/client/components/style-controls/BorderControls";
import {
  mkStyleComponent,
  providesStyleComponent,
  SingleRsExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import Button from "@/wab/client/components/widgets/Button";
import Select from "@/wab/client/components/widgets/Select";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, mkShortId, spawn } from "@/wab/common";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import { mkSelectorRuleSet } from "@/wab/styles";
import { observer } from "mobx-react-lite";
import React from "react";
import { BackgroundSection } from "./background-section";
import { EffectsPanelSection } from "./EffectsSection";
import { LayoutSection } from "./LayoutSection";
import { OverflowSection } from "./OverflowSection";
import { PositioningPanelSection } from "./PositioningSection";
import { ShadowsPanelSection } from "./ShadowsSection";
import { SizeSection } from "./SizeSection";
import { SpacingSection } from "./SpacingSection";
import { TransformPanelSection } from "./TransformPanelSection";
import { TransitionsPanelSection } from "./TransitionsSection";
import { TypographySection } from "./TypographySection";

export interface StyleExprSpec {
  selectors?: SelectorSpec[];
  styleSections?: PublicStyleSection[];
}

interface SelectorSpec {
  selector: string;
  label?: string;
}

export const StyleExprButton = observer(function StyleExprButton(props: {
  viewCtx: ViewCtx;
  tpl: TplComponent;
  attr: string;
  spec: StyleExprSpec;
  title?: string;
}) {
  const { viewCtx, tpl, attr, spec, title } = props;
  const vtm = viewCtx.variantTplMgr();
  const [show, setShow] = React.useState(false);
  const component = tpl.component;
  const param = ensure(
    component.params.find((p) => p.variable.name === attr),
    `Component param of name ${attr} must exist`
  );
  const arg = vtm.getArg(tpl, param.variable);
  const expr = arg?.expr ? ensureKnownStyleExpr(arg.expr) : undefined;
  return (
    <>
      <Button
        size="small"
        onClick={() =>
          viewCtx.change(() => {
            if (!show) {
              // now we show
              if (!expr) {
                const baseSelector =
                  spec.selectors?.find((s) => s.label === "Base")?.selector ??
                  null;
                vtm.setArg(
                  tpl,
                  param.variable,
                  new StyleExpr({
                    uuid: mkShortId(),
                    styles: [
                      mkSelectorRuleSet({
                        selector: baseSelector,
                        isBase: true,
                      }),
                    ],
                  })
                );
              }
              setShow(true);
            } else {
              setShow(false);
            }
          })
        }
      >
        Configure styles
      </Button>
      {expr && show && (
        <StyleExprPopup
          studioCtx={viewCtx.studioCtx}
          label={title ?? attr}
          spec={spec}
          expr={expr}
          onClose={() => setShow(false)}
        />
      )}
    </>
  );
});

const StyleExprPopup = observer(function StyleExprPopup(props: {
  studioCtx: StudioCtx;
  label: string;
  spec: StyleExprSpec;
  expr: StyleExpr;
  onClose: () => void;
}) {
  const { studioCtx, label, spec, expr, onClose } = props;
  const [selector, setSelector] = React.useState<string>(
    spec.selectors?.find((s) => s.label === "Base")?.selector ?? "base"
  );
  const hasAdditionalSelectors =
    spec.selectors &&
    spec.selectors.filter((s) => s.label !== "Base").length > 0;
  return (
    <SidebarModal
      show
      onClose={onClose}
      title={
        <>
          <div>{label}</div>
          {spec.selectors && hasAdditionalSelectors && (
            <Select
              style={{ marginLeft: "auto" }}
              size="tiny"
              value={selector}
              onChange={(newSelector) => {
                spawn(
                  studioCtx.changeUnsafe(() => {
                    if (newSelector !== "base") {
                      if (
                        !expr.styles.find((s) => s.selector === newSelector)
                      ) {
                        expr.styles.push(
                          mkSelectorRuleSet({
                            selector: newSelector,
                            isBase: false,
                          })
                        );
                      }
                    }
                    setSelector(newSelector!);
                  })
                );
              }}
            >
              {!spec.selectors.some((s) => s.label === "Base") && (
                <Select.Option key="base" value={"base"}>
                  Base
                </Select.Option>
              )}
              {spec.selectors.map((s) => (
                <Select.Option key={s.selector} value={s.selector}>
                  {s.label ?? s.selector}
                </Select.Option>
              ))}
            </Select>
          )}
        </>
      }
    >
      <StyleExprForm
        studioCtx={studioCtx}
        spec={spec}
        selector={selector}
        expr={expr}
      />
    </SidebarModal>
  );
});

const StyleExprForm = observer(function StyleExprForm(props: {
  studioCtx: StudioCtx;
  spec: StyleExprSpec;
  selector: string | null;
  expr: StyleExpr;
}) {
  const { spec, studioCtx, selector, expr } = props;

  const selectorRuleSet = expr.styles.find((sty) =>
    selector === "base" ? !sty.selector : sty.selector === selector
  );

  if (!selectorRuleSet) {
    return null;
  }

  const expsProvider = new SingleRsExpsProvider(
    selectorRuleSet.rs,
    studioCtx,
    /*unremovableProps=*/ []
  );
  const styleComponent = mkStyleComponent({ expsProvider });

  const show = (section: PublicStyleSection) => {
    return !spec.styleSections || spec.styleSections.includes(section);
  };

  return providesStyleComponent(
    styleComponent,
    `${expr.uuid}`
  )(
    <>
      {show(PublicStyleSection.Typography) && (
        <TypographySection
          expsProvider={expsProvider}
          inheritableOnly={false}
        />
      )}
      {show(PublicStyleSection.Sizing) && (
        <SizeSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Spacing) && (
        <SpacingSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Positioning) && (
        <PositioningPanelSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Layout) && (
        <LayoutSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Overflow) && (
        <OverflowSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Background) && (
        <BackgroundSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Border) && (
        <BorderPanelSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Border) && (
        <BorderRadiusSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Shadows) && (
        <ShadowsPanelSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Effects) && (
        <EffectsPanelSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Transitions) && (
        <TransitionsPanelSection expsProvider={expsProvider} />
      )}
      {show(PublicStyleSection.Transform) && (
        <TransformPanelSection expsProvider={expsProvider} />
      )}
    </>
  );
});
