import { BoxShadow, Dim } from "@/wab/bg-styles";
import {
  FullRow,
  LabeledItem,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  StyleComponent,
  StyleComponentProps,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import { ColorPicker } from "@/wab/client/components/widgets/ColorPicker";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { ensure } from "@/wab/common";
import { parseCssNumericNew } from "@/wab/css";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { observer } from "mobx-react";
import React from "react";
import defer = setTimeout;

interface BoxShadowPanelProps extends StyleComponentProps {
  defaultShadow: BoxShadow;
  onUpdated: (...args: any[]) => any;
  vsh: VariantedStylesHelper;
}
class _BoxShadowPanel extends StyleComponent<BoxShadowPanelProps> {
  private readonly firstInputRef: React.RefObject<HTMLInputElement>;

  constructor(props) {
    super(props);

    this.firstInputRef = React.createRef<HTMLInputElement>();
  }

  componentDidMount() {
    defer(() => this.firstInputRef.current?.focus());
  }

  handleChange = (f: /*TWZ*/ () => any) => {
    f();
    return this.props.onUpdated();
  };

  render() {
    const { defaultShadow: shadow, vsh } = this.props;
    return (
      <>
        <FullRow>
          <StyleToggleButtonGroup
            value={shadow.inset ? "inset" : "outset"}
            onChange={(val) => {
              return this.handleChange(() => {
                return (shadow.inset =
                  ensure(val, "Unexpected undefined val") === "inset");
              });
            }}
          >
            <StyleToggleButton
              className="icon-button-flex"
              value="outset"
              label="Outset"
              noIcon
            />
            <StyleToggleButton
              className="icon-button-flex"
              value="inset"
              label="Inset"
              noIcon
            />
          </StyleToggleButtonGroup>
        </FullRow>
        <FullRow twinCols>
          <LabeledItem label="Left" labelSize="small">
            <DimTokenSpinner
              ref={this.firstInputRef}
              value={shadow.x.showCss()}
              onChange={(val) =>
                this.handleChange(() => (shadow.x = parseDim(val || "0px")))
              }
              noClear
              allowedUnits={["px"]}
              extraOptions={[]}
              studioCtx={this.studioCtx()}
            />
          </LabeledItem>
          <LabeledItem label="Top" labelSize="small">
            <DimTokenSpinner
              value={shadow.y.showCss()}
              onChange={(val) =>
                this.handleChange(() => (shadow.y = parseDim(val || "0px")))
              }
              noClear
              allowedUnits={["px"]}
              extraOptions={[]}
              studioCtx={this.studioCtx()}
            />
          </LabeledItem>
        </FullRow>
        <FullRow twinCols>
          <LabeledItem label="Blur" labelSize="small">
            <DimTokenSpinner
              value={shadow.blur.showCss()}
              onChange={(val) =>
                this.handleChange(() => (shadow.blur = parseDim(val || "0px")))
              }
              noClear
              allowedUnits={["px"]}
              extraOptions={[]}
              studioCtx={this.studioCtx()}
            />
          </LabeledItem>
          <LabeledItem label="Spread" labelSize="small">
            <DimTokenSpinner
              value={shadow.spread.showCss()}
              onChange={(val) =>
                this.handleChange(
                  () => (shadow.spread = parseDim(val || "0px"))
                )
              }
              noClear
              allowedUnits={["px"]}
              extraOptions={[]}
              studioCtx={this.studioCtx()}
            />
          </LabeledItem>
        </FullRow>
        <FullRow>
          <div className={"spaced-above fill-width"}>
            <ColorPicker
              color={shadow.color}
              onChange={(color) => {
                return this.handleChange(() => {
                  return (shadow.color = color);
                });
              }}
              vsh={vsh}
            />
          </div>
        </FullRow>
      </>
    );
  }
}
export const BoxShadowPanel = observer(_BoxShadowPanel);

function parseDim(str: string) {
  const { num, units } = ensure(
    parseCssNumericNew(str),
    "Unexpected undefined css numeric value"
  );
  return new Dim(num, units);
}
