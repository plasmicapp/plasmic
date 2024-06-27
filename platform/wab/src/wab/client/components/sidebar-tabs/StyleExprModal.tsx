import { BackgroundSection } from "@/wab/client/components/sidebar-tabs/background-section";
import { EffectsPanelSection } from "@/wab/client/components/sidebar-tabs/EffectsSection";
import { LayoutSection } from "@/wab/client/components/sidebar-tabs/LayoutSection";
import { OverflowSection } from "@/wab/client/components/sidebar-tabs/OverflowSection";
import { PositioningPanelSection } from "@/wab/client/components/sidebar-tabs/PositioningSection";
import { ShadowsPanelSection } from "@/wab/client/components/sidebar-tabs/ShadowsSection";
import { SizeSection } from "@/wab/client/components/sidebar-tabs/SizeSection";
import { SpacingSection } from "@/wab/client/components/sidebar-tabs/SpacingSection";
import { TransformPanelSection } from "@/wab/client/components/sidebar-tabs/TransformPanelSection";
import { TransitionsPanelSection } from "@/wab/client/components/sidebar-tabs/TransitionsSection";
import { TypographySection } from "@/wab/client/components/sidebar-tabs/TypographySection";
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
import { ensure, mkShortId, spawn, withoutNils } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import {
  ensureKnownStyleExpr,
  StyleExpr,
  TplComponent,
} from "@/wab/shared/model/classes";
import { mkSelectorRuleSet } from "@/wab/shared/core/styles";
import { observer } from "mobx-react";
import React from "react";

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
  const isClassName =
    attr === "className" ||
    (isCodeComponent(component) && component._meta?.classNameProp === attr);
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
          isClassName={isClassName}
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
  isClassName: boolean;
  onClose: () => void;
}) {
  const { studioCtx, label, spec, expr, isClassName, onClose } = props;
  const selectorOptions = withoutNils([
    !isClassName && !spec.selectors?.some((s) => s.label === "Base")
      ? { value: "base", label: "Base" }
      : undefined,
    ...(spec.selectors?.map((s) => ({
      value: s.selector,
      label: s.label ?? s.selector,
    })) ?? []),
  ]);
  const [selector, setSelector] = React.useState<string | null>(
    selectorOptions?.[0]?.value ?? null
  );
  const hasAdditionalSelectors =
    spec.selectors &&
    spec.selectors.filter((s) => s.label !== "Base").length > 0;

  React.useEffect(() => {
    // If the SelectorRuleSet for the current selector doesn't exist yet, then
    // create it
    if (studioCtx.canEditProject() && selector !== "base") {
      if (!expr.styles.find((s) => s.selector === selector)) {
        spawn(
          studioCtx.changeUnsafe(() => {
            expr.styles.push(
              mkSelectorRuleSet({
                selector,
                isBase: false,
              })
            );
          })
        );
      }
    }
  }, [studioCtx, expr, selector]);
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
              onChange={(newSelector) => setSelector(newSelector)}
            >
              {selectorOptions.map((op) => (
                <Select.Option key={op.value} value={op.value}>
                  {op.label}
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
        <LayoutSection expsProvider={expsProvider} allowConvert />
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
