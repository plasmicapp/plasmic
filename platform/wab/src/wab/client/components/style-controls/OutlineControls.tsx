import {
  LabeledStyleColorItemRow,
  LabeledStyleDimItemRow,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { LabeledLineStyleToggleButtonGroupItemRow } from "@/wab/client/components/style-controls/LineStyleControls";
import {
  StylePanelSection,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import MinusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { TokenType } from "@/wab/commons/StyleToken";
import { isStyleOrCodeComponentVariant } from "@/wab/shared/Variants";
import { ensure } from "@/wab/shared/common";
import { Alert } from "antd";
import { observer } from "mobx-react";
import React from "react";

enum OutlineProps {
  style = "outline-style",
  width = "outline-width",
  offset = "outline-offset",
  color = "outline-color",
}

const OUTLINE_PROPS = [
  OutlineProps.style,
  OutlineProps.width,
  OutlineProps.offset,
  OutlineProps.color,
];

export const OutlinePanelSection = observer(function OutlinePanelSection() {
  const sc = useStyleComponent();

  const studioCtx = sc.studioCtx();

  const exp = sc.exp();

  const [isOpen, setIsOpen] = React.useState(false);
  const hasOutlineProps = OUTLINE_PROPS.some((prop) => sc.hasTargetProp(prop));
  const isVisible = isOpen || hasOutlineProps;

  const viewCtx = ensure(
    studioCtx.focusedViewCtx(),
    "Expected view ctx to exist"
  );
  const isStyleOrCodeComponentVariantTargeted = viewCtx
    .variantTplMgr()
    .getCurrentVariantCombo()
    .some(isStyleOrCodeComponentVariant);

  const onClick = async () => {
    if (isVisible) {
      await studioCtx.change(({ success }) => {
        OUTLINE_PROPS.forEach((prop) => {
          if (sc.hasTargetProp(prop)) {
            exp.clear(prop);
          }
        });
        return success();
      });
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <StylePanelSection
      key={String(isVisible)}
      title="Outline"
      expsProvider={sc.props.expsProvider}
      styleProps={OUTLINE_PROPS}
      onHeaderClick={!isVisible ? onClick : undefined}
      controls={
        <IconLinkButton onClick={onClick}>
          <Icon icon={isVisible ? MinusIcon : PlusIcon} />
        </IconLinkButton>
      }
    >
      {isVisible && (
        <>
          {!isStyleOrCodeComponentVariantTargeted && (
            <Alert
              className="mb-lg"
              message={
                <StandardMarkdown>
                  [Outlines](https://developer.mozilla.org/en-US/docs/Web/CSS/outline)
                  are typically used for styling the focused state of an
                  element. We recommend only using this property for
                  focus-related interaction variants.
                </StandardMarkdown>
              }
              type="info"
              showIcon
            />
          )}
          <LabeledStyleDimItemRow
            label="Width"
            styleName={[OutlineProps.width]}
            tokenType={TokenType.Spacing}
            dimOpts={{
              extraOptions: [
                { value: "thin", label: "Thin" },
                { value: "medium", label: "Medium" },
                { value: "thick", label: "Thick" },
              ],
              min: 0,
            }}
          />
          <LabeledLineStyleToggleButtonGroupItemRow
            label="Style"
            styleName={[OutlineProps.style]}
          />
          <LabeledStyleColorItemRow
            label="Color"
            styleName={[OutlineProps.color]}
            displayStyleName={OutlineProps.color}
          />
          <LabeledStyleDimItemRow
            label="Offset"
            styleName={[OutlineProps.offset]}
            tokenType={TokenType.Spacing}
          />
        </>
      )}
    </StylePanelSection>
  );
});
