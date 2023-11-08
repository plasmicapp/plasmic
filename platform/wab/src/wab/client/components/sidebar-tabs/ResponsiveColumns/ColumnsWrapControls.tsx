import cn from "classnames";
import { clamp } from "lodash";
import { observer } from "mobx-react";
import React from "react";
import { ColumnsConfig } from "../../../../classes";
import { spawn } from "../../../../common";
import {
  isReverseValue,
  redistributeColumns,
  updateCurrentTplColumns,
} from "../../../../shared/columns-utils";
import { TplColumnsTag } from "../../../../tpls";
import MinusIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import { ViewCtx } from "../../../studio-ctx/view-ctx";
import { FullRow, LabeledItemRow } from "../../sidebar/sidebar-helpers";
import StyleCheckbox from "../../style-controls/StyleCheckbox";
import { ExpsProvider } from "../../style-controls/StyleComponent";
import { IconLinkButton } from "../../widgets";
import DimTokenSpinner from "../../widgets/DimTokenSelector";
import { Icon } from "../../widgets/Icon";
import S from "../ColumnsSection.module.scss";

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
                    let delta = +val - colsSizes.length;
                    spawn(handleChangeColsPerRow(delta));
                  }
                }}
                noClear
                allowedUnits={[""]}
                extraOptions={[]}
                min={1}
                max={tpl.children.length}
                studioCtx={studioCtx}
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
