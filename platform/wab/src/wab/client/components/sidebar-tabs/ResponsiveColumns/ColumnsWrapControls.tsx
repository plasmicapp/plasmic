import S from "@/wab/client/components/sidebar-tabs/ColumnsSection.module.scss";
import {
  FullRow,
  LabeledItemRow,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import StyleCheckbox from "@/wab/client/components/style-controls/StyleCheckbox";
import { ExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import { IconLinkButton } from "@/wab/client/components/widgets";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import MinusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  isReverseValue,
  redistributeColumns,
  updateCurrentTplColumns,
} from "@/wab/shared/columns-utils";
import { spawn } from "@/wab/shared/common";
import { TplColumnsTag } from "@/wab/shared/core/tpls";
import { NUMBER_UNITS } from "@/wab/shared/css/types";
import { ColumnsConfig } from "@/wab/shared/model/classes";
import cn from "classnames";
import { clamp } from "lodash";
import { observer } from "mobx-react";
import React from "react";

export const ColumnsWrapControls = observer(
  function ColumnsWrapControls(props: {
    config: ColumnsConfig;
    viewCtx: ViewCtx;
    tpl: TplColumnsTag;
    expsProvider: ExpsProvider;
    isDisabled?: boolean;
  }) {
    const { viewCtx, tpl, config, isDisabled, expsProvider } = props;
    const { breakUpRows, colsSizes } = config;
    const studioCtx = viewCtx.studioCtx;
    const exp = expsProvider.mergedExp();

    const isReversed =
      isReverseValue(exp.get("flex-direction")) ||
      isReverseValue(exp.get("flex-wrap"));

    const handleChangeColsPerRow = async (delta) => {
      await studioCtx.change<never>(({ success }) => {
        const newColsPerRow = clamp(
          colsSizes.length + delta,
          1,
          tpl.children.length
        );
        updateCurrentTplColumns(
          tpl,
          {
            colsSizes: redistributeColumns(colsSizes, newColsPerRow),
          },
          viewCtx.variantTplMgr()
        );
        return success();
      });
    };

    return (
      <>
        <LabeledItemRow>
          <StyleCheckbox
            isDisabled={isDisabled}
            isChecked={breakUpRows}
            onChange={async (val) => {
              await studioCtx.change<never>(({ success }) => {
                updateCurrentTplColumns(
                  tpl,
                  {
                    breakUpRows: val,
                    colsSizes: redistributeColumns(
                      colsSizes,
                      tpl.children.length
                    ),
                  },
                  viewCtx.variantTplMgr()
                );
                return success();
              });
            }}
          >
            Wrap?
          </StyleCheckbox>
          <StyleCheckbox
            className="ml-m"
            isDisabled={isDisabled}
            isChecked={isReversed}
            onChange={async (val) => {
              await studioCtx.change(({ success }) => {
                if (config.breakUpRows) {
                  exp.set("flex-wrap", `wrap${val ? "-reverse" : ""}`);
                } else {
                  exp.set("flex-direction", `row${val ? "-reverse" : ""}`);
                }
                return success();
              });
            }}
          >
            Reverse?
          </StyleCheckbox>
        </LabeledItemRow>
        {config.breakUpRows && (
          <LabeledItemRow label={"Columns / row"}>
            <FullRow twinCols>
              <DimTokenSpinner
                disabled={isDisabled || !breakUpRows}
                value={`${colsSizes.length}`}
                onChange={async (val) => {
                  if (val && +val !== colsSizes.length && +val > 0) {
                    const delta = +val - colsSizes.length;
                    spawn(handleChangeColsPerRow(delta));
                  }
                }}
                noClear
                allowedUnits={NUMBER_UNITS}
                extraOptions={[]}
                min={1}
                max={tpl.children.length}
                studioCtx={studioCtx}
                allowFunctions={false}
              />
              <div className={cn("flex justify-end", S.iconsMargin)}>
                <IconLinkButton
                  disabled={
                    isDisabled || !breakUpRows || colsSizes.length === 1
                  }
                  onClick={() => handleChangeColsPerRow(-1)}
                >
                  <Icon icon={MinusIcon} />
                </IconLinkButton>
                <IconLinkButton
                  disabled={
                    isDisabled ||
                    !breakUpRows ||
                    colsSizes.length === tpl.children.length
                  }
                  onClick={() => handleChangeColsPerRow(1)}
                >
                  <Icon icon={PlusIcon} />
                </IconLinkButton>
              </div>
            </FullRow>
          </LabeledItemRow>
        )}
      </>
    );
  }
);
