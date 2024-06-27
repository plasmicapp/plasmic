import { shouldBeDisabled } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import {
  ExpsProvider,
  StylePanelSection,
  useStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { TransformPanel } from "@/wab/client/components/style-controls/TransformPanel";
import { TransformSettingsPanel } from "@/wab/client/components/style-controls/TransformSettingsPanel";
import {
  IconLinkButton,
  ListBox,
  ListBoxItem,
} from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import GearIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Gear";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { arrayMoveIndex } from "@/wab/shared/collections";
import { maybe, spawn, uniqueKey } from "@/wab/shared/common";
import { removeFromArray } from "@/wab/commons/collections";
import { joinCssValues, splitCssValue } from "@/wab/shared/RuleSetHelpers";
import {
  defaultTransforms,
  fromTransformObjToString,
  fromTransformStringToObj,
  parseOrigin,
  parseSelfPerspective,
  Transform,
} from "@/wab/shared/core/transform-utils";
import { capitalize } from "lodash";
import { observer } from "mobx-react";
import React, { useState } from "react";

export const TransformPanelSection = observer(
  (props: { expsProvider: ExpsProvider }) => {
    const { expsProvider } = props;
    const { studioCtx } = expsProvider;
    const exp = expsProvider.mergedExp();
    const [inspect, setInspect] = useState<number | undefined>(undefined);
    const [isSettingOpen, setIsSettingOpen] = useState<boolean>(false);
    const sc = useStyleComponent();

    const rawTransforms =
      maybe(exp.getRaw("transform"), (val) =>
        val === "none" ? [] : splitCssValue("transform", val)
      ) ?? [];
    const pureTransforms = rawTransforms.filter(
      (t) => !t.includes("perspective")
    );
    const rawSelfPerspective = rawTransforms.find((t) =>
      t.includes("perspective")
    );
    const selfPerspective =
      rawSelfPerspective && parseSelfPerspective(rawSelfPerspective);
    const transforms = pureTransforms.map(fromTransformStringToObj);

    const rawTransformOrigin = exp.getRaw("transform-origin");
    const transformOrigin = parseOrigin(rawTransformOrigin);

    const rawPerspectiveOrigin = exp.getRaw("perspective-origin");
    const perspectiveOrigin = parseOrigin(rawPerspectiveOrigin);

    const backfaceVisibility = exp.getRaw("backface-visibility") || "visible";

    const childPerspective = exp.getRaw("perspective") || "0px";

    const setProp = (prop: string, value: string | undefined) => {
      spawn(
        studioCtx.changeUnsafe(() => {
          if (!value) {
            exp.clear(prop);
          } else {
            exp.set(prop, value);
          }
        })
      );
    };

    const setsProp = (prop: string, value: string[]) => {
      spawn(
        studioCtx.changeUnsafe(() => {
          exp.set(prop, joinCssValues(prop, value));
        })
      );
    };

    const maybeArrayNone = (vals: string[]) => {
      if (vals.length === 0) {
        return ["none"];
      }
      return vals;
    };

    const updateTransforms = (newTransforms: Transform[]) => {
      const rawNewTransforms = newTransforms.map(fromTransformObjToString);
      if (rawSelfPerspective) {
        rawNewTransforms.unshift(rawSelfPerspective);
      }
      setsProp("transform", maybeArrayNone(rawNewTransforms));
    };

    const updateSelfPerspective = (newSelfPerspective: string | undefined) => {
      const transformString = transforms.map(fromTransformObjToString);
      if (newSelfPerspective) {
        transformString.unshift(`perspective(${newSelfPerspective})`);
      }
      setsProp("transform", maybeArrayNone(transformString));
    };

    const updateTransformOrigin = (
      origin:
        | {
            left: string;
            top: string;
          }
        | undefined
    ) => {
      setProp("transform-origin", origin && `${origin.left} ${origin.top}`);
    };

    const updatePerspectiveOrigin = (
      origin:
        | {
            left: string;
            top: string;
          }
        | undefined
    ) => {
      setProp("perspective-origin", origin && `${origin.left} ${origin.top}`);
    };

    const updateBackfaceVisibily = (visibility: string | undefined) => {
      setProp("backface-visibility", visibility);
    };

    const updateChildPerspective = (
      newChildPerspective: string | undefined
    ) => {
      setProp("perspective", newChildPerspective);
    };

    const addTransformation = () => {
      updateTransforms([defaultTransforms.move, ...transforms]);
      setInspect(0);
    };

    const styleProps = [
      "transform",
      "transform-origin",
      "backface-visibility",
      "perspective",
      "perspective-origin",
    ];

    const { isDisabled } = shouldBeDisabled({
      props: {},
      indicators: sc.definedIndicators(...styleProps),
    });

    return (
      <StylePanelSection
        key={String(transforms.length > 0 || isSettingOpen)}
        title="Transform"
        styleProps={styleProps}
        onHeaderClick={
          transforms.length === 0 && !isDisabled ? addTransformation : undefined
        }
        controls={
          <>
            <IconLinkButton
              onClick={() => !isDisabled && setIsSettingOpen(true)}
            >
              <Icon icon={GearIcon} />
            </IconLinkButton>
            <IconLinkButton onClick={() => !isDisabled && addTransformation()}>
              <Icon icon={PlusIcon} />
            </IconLinkButton>
          </>
        }
        expsProvider={expsProvider}
      >
        {inspect !== undefined &&
          transforms.length > 0 &&
          transforms[inspect] && (
            <SidebarModal
              show
              title="Transform"
              onClose={() => setInspect(undefined)}
            >
              <div className="panel-content">
                <TransformPanel
                  transform={transforms[inspect]}
                  onChange={(newTransform) => {
                    transforms[inspect] = newTransform;
                    updateTransforms(transforms);
                  }}
                  studioCtx={studioCtx}
                />
              </div>
            </SidebarModal>
          )}
        {isSettingOpen && (
          <SidebarModal
            show
            title={"Transform Settings"}
            onClose={() => setIsSettingOpen(false)}
          >
            <TransformSettingsPanel
              selfPerspective={selfPerspective}
              studioCtx={studioCtx}
              transformOrigin={transformOrigin}
              backfaceVisibility={backfaceVisibility}
              childPerspective={childPerspective}
              perspectiveOrigin={perspectiveOrigin}
              updateSelfPerspective={updateSelfPerspective}
              updateTransformOrigin={updateTransformOrigin}
              updateBackfaceVisibility={updateBackfaceVisibily}
              updateChildPerspective={updateChildPerspective}
              updatePerspectiveOrigin={updatePerspectiveOrigin}
            />
          </SidebarModal>
        )}
        {transforms.length > 0 && (
          <ListBox
            appendPrepend="append"
            onReorder={(from, to) => {
              if (!isDisabled) {
                const reordered = arrayMoveIndex(transforms, from, to);
                updateTransforms(reordered);
              }
            }}
          >
            {transforms.map((transformation: Transform, i: number) => {
              const { type, X, Y, Z } = transformation;
              return (
                <ListBoxItem
                  key={uniqueKey(transformation)}
                  index={i}
                  onRemove={() => {
                    if (!isDisabled) {
                      removeFromArray(transforms, transformation);
                      updateTransforms(transforms);
                    }
                  }}
                  onClick={() => !isDisabled && setInspect(i)}
                  mainContent={
                    <div className="labeled-item labeled-item--horizontal--vcenter">
                      <div className="labeled-item__label labeled-item__label--horizontal">
                        {capitalize(type)}
                      </div>
                      <code>
                        {X},{Y}
                        {Z ? `,${Z}` : ""}
                      </code>
                    </div>
                  }
                />
              );
            })}
          </ListBox>
        )}
      </StylePanelSection>
    );
  }
);
