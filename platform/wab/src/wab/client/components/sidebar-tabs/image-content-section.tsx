import {
  LabeledStyleDimItemRow,
  LabeledStyleSelectItemRow,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  StyleComponent,
  StyleComponentProps,
} from "@/wab/client/components/style-controls/StyleComponent";
import { Icon } from "@/wab/client/components/widgets/Icon";
import ContainIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Contain";
import CoverIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Cover";
import { assert, ensure } from "@/wab/common";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import React from "react";

class ObjectPosition {
  constructor(public xAlign: string, public yAlign: string) {}
  static parse(value: string) {
    if (value === "initial") {
      return new ObjectPosition("50%", "50%");
    } else {
      const c = value.split(" ");
      assert(c.length === 2, `object-position should have x and y`);
      return new ObjectPosition(c[0], c[1]);
    }
  }
  showCss() {
    return `${this.xAlign} ${this.yAlign}`;
  }
}

interface _ContentPanelSectionState {}

class _ContentPanelSection extends StyleComponent<
  StyleComponentProps,
  _ContentPanelSectionState
> {
  render() {
    const pos = ObjectPosition.parse(this.exp().get("object-position"));
    return (
      <>
        <LabeledStyleSelectItemRow
          styleName="object-fit"
          label="Image size"
          textRight={false}
          selectOpts={{
            options: [
              {
                value: "fill",
                label: (
                  <Tooltip title="Stretch to fit">
                    <span className="flex-fill">Fill</span>
                  </Tooltip>
                ),
              },
              {
                value: "contain",
                label: (
                  <Tooltip title="Scale to fit without clipping; maintains aspect ratio">
                    <span className="flex flex-vcenter baseline-friendly-centered-block-container">
                      <Icon icon={ContainIcon} className="mr-ch" /> Contain
                    </span>
                  </Tooltip>
                ),
              },
              {
                value: "cover",
                label: (
                  <Tooltip title="Scale and clip to fit; maintains aspect ratio">
                    <span className="flex flex-vcenter baseline-friendly-centered-block-container">
                      <Icon icon={CoverIcon} className="mr-ch" /> Cover
                    </span>
                  </Tooltip>
                ),
              },
              {
                value: "none",
                label: (
                  <Tooltip title="Do not resize">
                    <span className="flex-fill">None</span>
                  </Tooltip>
                ),
              },
              {
                value: "scale-down",
                label: (
                  <Tooltip title="Shrink to fit without clipping; maintains aspect ratio">
                    <span className="flex-fill">Scale down</span>
                  </Tooltip>
                ),
              },
            ],
          }}
        />
        <LabeledStyleDimItemRow
          label={"X-align"}
          styleName="object-position"
          dimOpts={{
            noClear: true,
            value: pos.xAlign,
            allowedUnits: ["px", "%"],
            extraOptions: ["left", "center", "right"],

            onChange: (v) =>
              this.change(() => {
                pos.xAlign = ensure(v, `v should be set`);
                this.exp().set("object-position", pos.showCss());
              }),
          }}
        />
        <LabeledStyleDimItemRow
          label={"Y-align"}
          styleName="object-position"
          dimOpts={{
            noClear: true,
            value: pos.yAlign,
            allowedUnits: ["px", "%"],
            extraOptions: ["top", "center", "bottom"],
            onChange: (v) =>
              this.change(() => {
                pos.yAlign = ensure(v, `v should be set`);
                this.exp().set("object-position", pos.showCss());
              }),
          }}
        />
      </>
    );
  }
}

export const ContentPanelSection = observer(_ContentPanelSection);
