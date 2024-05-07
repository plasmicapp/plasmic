import sty from "@/wab/client/components/sidebar-tabs/ListStyleSection.module.scss";
import {
  FullRow,
  LabeledStyleSelectItem,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  ExpsProvider,
  StylePanelSection,
} from "@/wab/client/components/style-controls/StyleComponent";
import { listStyleCssProps } from "@/wab/shared/core/style-props";
import { observer } from "mobx-react";
import * as React from "react";

export const ListStyleSection = observer(ListStyleSection_);

function ListStyleSection_(props: { expsProvider: ExpsProvider }) {
  const { expsProvider } = props;

  return (
    <StylePanelSection
      title={"List"}
      expsProvider={expsProvider}
      styleProps={listStyleCssProps}
    >
      <FullRow>
        <LabeledStyleSelectItem
          styleName={"list-style-type"}
          tooltip={`List Style Type`}
          label={"Type"}
          textRight={false}
          selectOpts={{
            options: [
              {
                value: "none",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>&nbsp;</span> None
                  </span>
                ),
              },
              {
                value: "disc",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>•</span> Disc
                  </span>
                ),
              },
              {
                value: "circle",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>○</span> Circle
                  </span>
                ),
              },
              {
                value: "square",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>■</span> Square
                  </span>
                ),
              },
              {
                value: "decimal",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>1.</span> Decimal
                  </span>
                ),
              },
              {
                value: "decimal-leading-zero",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>01.</span> Decimal with
                    leading zero
                  </span>
                ),
              },
              {
                value: "upper-roman",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>I.</span> Uppercase roman
                    numerals
                  </span>
                ),
              },
              {
                value: "lower-roman",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>i.</span> Lowercase roman
                    numerals
                  </span>
                ),
              },
              {
                value: "upper-alpha",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>A.</span> Uppercase letters
                  </span>
                ),
              },
              {
                value: "lower-alpha",
                label: (
                  <span className="flex-vcenter">
                    <span className={sty.selectIcon}>a.</span> Lowercase letters
                  </span>
                ),
              },
            ],
          }}
        />
      </FullRow>
      <FullRow>
        <LabeledStyleSelectItem
          styleName={"list-style-position"}
          tooltip={`List Style Position`}
          label={"Position"}
          textRight={false}
          selectOpts={{
            options: [
              { value: "outside", label: "Outside" },
              { value: "inside", label: "Inside" },
            ],
          }}
        />
      </FullRow>
    </StylePanelSection>
  );
}
