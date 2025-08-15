import {
  FullRow,
  LabeledItemRow,
  LabeledStyleDimItem,
  shouldBeDisabled,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  ExpsProvider,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import StyleToggleButtonGroup from "@/wab/client/components/style-controls/StyleToggleButtonGroup";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { TokenType } from "@/wab/commons/StyleToken";
import { siteFinalStyleTokensAllDeps } from "@/wab/shared/core/site-style-tokens";
import { allImageAssets, allMixins } from "@/wab/shared/core/sites";
import { CssVarResolver } from "@/wab/shared/core/styles";
import {
  GRID_DEFAULT_TEMPLATE,
  isFlexibleSize,
  isTrackTemplate,
  parseGridCssPropsToSpec,
} from "@/wab/shared/grid-utils";
import { observer } from "mobx-react";
import React from "react";

export const GridControls = observer(function GridControls(props: {
  expsProvider: ExpsProvider;
}) {
  const { expsProvider } = props;
  const sc = useStyleComponent();
  const studioCtx = sc.studioCtx();
  const { site } = studioCtx;
  const resolver = new CssVarResolver(
    siteFinalStyleTokensAllDeps(site),
    allMixins(site, { includeDeps: "all" }),
    allImageAssets(site, { includeDeps: "all" }),
    site.activeTheme
  );

  const spec = parseGridCssPropsToSpec(sc.exp(), resolver);

  const definedIndicators = sc.definedIndicators(
    "grid-template-rows",
    "grid-template-columns",
    "grid-row-gap",
    "grid-column-gap",
    "grid-auto-rows",
    "grid-auto-columns"
  );

  const { isDisabled } = shouldBeDisabled({
    props: {},
    indicators: definedIndicators,
  });

  const templateColumns = spec.gridTemplateColumns || GRID_DEFAULT_TEMPLATE;
  const isFlexible = isFlexibleSize(templateColumns);

  return (
    <>
      <LabeledItemRow label="Grid Type">
        <StyleToggleButtonGroup
          value={isFlexible ? "filled" : "fixed"}
          onChange={async (val) => {
            if (!isDisabled) {
              await studioCtx.change(({ success }) => {
                sc.exp().set(
                  "grid-template-columns",
                  val === "filled"
                    ? "repeat(auto-fill, minmax(200px, 1fr))"
                    : "repeat(2, minmax(0, 1fr))"
                );
                return success();
              });
            }
          }}
          autoWidth
        >
          <StyleToggleButton
            value="fixed"
            tooltip="Fixed number of columns per row"
            label="Fixed"
            showLabel
            children={null}
          />
          <StyleToggleButton
            value="filled"
            tooltip="Flexibly fill as many columns as possible per row, as long as each column is larger than some minimum size"
            label="Filled"
            showLabel
            children={null}
          />
        </StyleToggleButtonGroup>
      </LabeledItemRow>

      {isFlexibleSize(templateColumns) ? (
        <LabeledItemRow label="Min Width">
          <DimTokenSpinner
            value={`${templateColumns.size.num}${templateColumns.size.unit}`}
            onChange={async (val) => {
              await studioCtx.change(({ success }) => {
                sc.exp().set(
                  "grid-template-columns",
                  `repeat(auto-fill, minmax(${val}, 1fr))`
                );
                return success();
              });
            }}
            noClear
            extraOptions={[]}
            allowedUnits={["%", "px", "fr", "em", "vw"]}
            min={1}
            studioCtx={studioCtx}
          />
        </LabeledItemRow>
      ) : (
        <LabeledItemRow label="Columns">
          <DimTokenSpinner
            value={`${
              isTrackTemplate(templateColumns)
                ? templateColumns.length
                : templateColumns.num
            }`}
            onChange={async (val) => {
              await studioCtx.change(({ success }) => {
                sc.exp().set(
                  "grid-template-columns",
                  `repeat(${+(val || "1")}, minmax(0, 1fr))`
                );
                return success();
              });
            }}
            noClear
            allowedUnits={[""]}
            extraOptions={[]}
            min={1}
            studioCtx={studioCtx}
          />
        </LabeledItemRow>
      )}
      <FullRow>
        <LabeledStyleDimItem
          label="Row Height"
          styleName="grid-auto-rows"
          tokenType={TokenType.Spacing}
          dimOpts={{ min: 1 }}
        />
      </FullRow>
      <FullRow>
        <LabeledStyleDimItem
          label="Row Gap"
          styleName="grid-row-gap"
          tokenType={TokenType.Spacing}
          dimOpts={{ dragScale: "10", min: 0 }}
        />
      </FullRow>
      <FullRow>
        <LabeledStyleDimItem
          label="Col Gap"
          styleName="grid-column-gap"
          tokenType={TokenType.Spacing}
          dimOpts={{ dragScale: "10", min: 0 }}
        />
      </FullRow>
    </>
  );
});
