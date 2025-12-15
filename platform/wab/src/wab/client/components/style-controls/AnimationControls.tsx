import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  FullRow,
  LabeledItem,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { ExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { cx, ensure, spawn } from "@/wab/shared/common";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  AnimationDirectionKeyword,
  FillModeKeyword,
  animationDirectionKeywords,
  fillModeKeywords,
  timingFunctionKeywords,
} from "@/wab/shared/css/animations";
import { NUMBER_UNITS } from "@/wab/shared/css/types";
import { Animation } from "@/wab/shared/model/classes";
import { naturalSortByName } from "@/wab/shared/sort";
import { Select } from "antd";
import { observer } from "mobx-react";
import React, { useMemo } from "react";

interface AnimationControlsProps {
  expsProvider: ExpsProvider;
  animation: Animation;
  vsh: VariantedStylesHelper;
  onUpdated: () => void;
}

export const AnimationControls = observer(function AnimationControls(
  props: AnimationControlsProps
) {
  const { animation, expsProvider, onUpdated } = props;
  const { studioCtx } = expsProvider;
  const site = studioCtx.site;

  const handleChange = (f: () => void) => {
    spawn(
      studioCtx.change(({ success }) => {
        f();
        return success();
      })
    );

    onUpdated?.();
  };

  const allAnimationSequencesGroups = useMemo(() => {
    return [
      {
        name: "This project",
        animationSequences: naturalSortByName(site.animationSequences),
      },
      ...naturalSortByName(
        walkDependencyTree(site, "direct").map((dep) => ({
          name: studioCtx.projectDependencyManager.getNiceDepName(dep),
          animationSequences: naturalSortByName(dep.site.animationSequences),
        }))
      ),
    ].filter((g) => g.animationSequences.length > 0);
  }, [site, studioCtx]);

  const searchUndo = useUndo("");

  return (
    <>
      <SidebarSection title="Animation" zeroBodyPadding zeroHeaderPadding>
        <FullRow className="labeled-item">
          <Select
            className={cx({
              "flex-fill textboxlike": true,
            })}
            value={animation.sequence.uuid}
            onChange={(val) => {
              const sequence = allAnimationSequencesGroups
                .flatMap((g) => g.animationSequences)
                .find((seq) => seq.uuid === val);
              if (sequence) {
                handleChange(() => {
                  animation.sequence = sequence;
                });
              }
              searchUndo.reset();
            }}
            showSearch
            searchValue={searchUndo.value}
            onSearch={searchUndo.push}
            onInputKeyDown={searchUndo.handleKeyDown}
            onFocus={() => {
              searchUndo.reset();
            }}
            filterOption={(val, opt) => {
              if (!opt) {
                return false;
              }
              if ("searchText" in opt && typeof opt.searchText === "string") {
                return opt.searchText.toLowerCase().includes(val.toLowerCase());
              }
              return false;
            }}
            suffixIcon={<Icon icon={TriangleBottomIcon} />}
            optionLabelProp="label"
            options={allAnimationSequencesGroups.map(
              ({ name, animationSequences }) => ({
                label: name,
                options: animationSequences.map((seq) => ({
                  label: seq.name,
                  value: seq.uuid,
                  searchText: seq.name,
                })),
              })
            )}
          />
        </FullRow>
      </SidebarSection>

      <SidebarSection title="Timing" zeroBodyPadding zeroHeaderPadding>
        <FullRow>
          <LabeledItem label="Duration">
            <DimTokenSpinner
              value={animation.duration}
              onChange={(val) =>
                handleChange(() => (animation.duration = val || "1s"))
              }
              noClear
              allowedUnits={["s", "ms"]}
              allowFunctions
              extraOptions={[]}
              studioCtx={studioCtx}
            />
          </LabeledItem>
        </FullRow>
        <FullRow>
          <LabeledItem label="Delay">
            <DimTokenSpinner
              value={animation.delay || "0s"}
              onChange={(val) =>
                handleChange(() => (animation.delay = val || "0s"))
              }
              allowedUnits={["s", "ms"]}
              allowFunctions
              extraOptions={[]}
              studioCtx={studioCtx}
            />
          </LabeledItem>
        </FullRow>
      </SidebarSection>

      <SidebarSection
        title="Easing & Repetition"
        zeroBodyPadding
        zeroHeaderPadding
      >
        <FullRow>
          <LabeledItem label="Easing">
            <StyleSelect
              value={animation.timingFunction || "ease"}
              onChange={(val) =>
                handleChange(() => (animation.timingFunction = val || "ease"))
              }
              valueSetState={animation.timingFunction ? "isSet" : "isUnset"}
            >
              {timingFunctionKeywords.map((timingFunction) => (
                <StyleSelect.Option value={timingFunction}>
                  {timingFunction}
                </StyleSelect.Option>
              ))}
            </StyleSelect>
          </LabeledItem>
        </FullRow>

        <FullRow>
          <LabeledItem label="Iteration Count">
            <DimTokenSpinner
              min={0}
              value={animation.iterationCount || "1"}
              onChange={(val) =>
                handleChange(() => (animation.iterationCount = val || "1"))
              }
              allowedUnits={NUMBER_UNITS}
              extraOptions={["infinite"]}
              studioCtx={studioCtx}
              allowFunctions={false}
            />
          </LabeledItem>
        </FullRow>

        <FullRow>
          <LabeledItem label="Direction">
            <StyleSelect
              value={animation.direction}
              onChange={(val) =>
                handleChange(
                  () =>
                    (animation.direction = ensure(
                      val as AnimationDirectionKeyword,
                      "Unexpected direction value"
                    ))
                )
              }
              valueSetState="isSet"
            >
              {animationDirectionKeywords.map((direction) => (
                <StyleSelect.Option value={direction}>
                  {direction}
                </StyleSelect.Option>
              ))}
            </StyleSelect>
          </LabeledItem>
        </FullRow>
      </SidebarSection>

      <SidebarSection title="Fill Mode" zeroBodyPadding zeroHeaderPadding>
        <FullRow>
          <StyleSelect
            value={animation.fillMode || "none"}
            onChange={(val) =>
              handleChange(
                () =>
                  (animation.fillMode = ensure(
                    val as FillModeKeyword,
                    "Unexpected fillMode value"
                  ))
              )
            }
            valueSetState={animation.fillMode ? "isSet" : "isUnset"}
          >
            {fillModeKeywords.map((fillMode) => (
              <StyleSelect.Option value={fillMode}>
                {fillMode}
              </StyleSelect.Option>
            ))}
          </StyleSelect>
        </FullRow>
      </SidebarSection>
    </>
  );
});
