import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { shouldBeDisabled } from "@/wab/client/components/sidebar/sidebar-helpers";
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
import { arrayMoveIndex, arrayRemove } from "@/wab/shared/collections";
import { assert, spawn, uniqueKey } from "@/wab/shared/common";
import {
  CssTransform,
  CssTransforms,
  defaultCssTransform,
  parseOrigin,
} from "@/wab/shared/css/transforms";
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

    const cssTransforms = CssTransforms.fromCss(exp.getRaw("transform") ?? "");

    const transforms = cssTransforms.transforms;

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

    const setsProp = (prop: string, value: CssTransforms) => {
      spawn(
        studioCtx.changeUnsafe(() => {
          exp.set(prop, value.showCss());
        })
      );
    };

    const updateTransforms = (newTransforms: CssTransform[]) => {
      cssTransforms.transforms = newTransforms;
      setsProp("transform", cssTransforms);
    };

    const updateSelfPerspective = (newSelfPerspective: string | undefined) => {
      cssTransforms.perspective = newSelfPerspective;
      setsProp("transform", cssTransforms);
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
      const newTransform = CssTransform.fromCss(defaultCssTransform.translate);
      assert(newTransform, "Expected CssTransform, found null");

      updateTransforms([newTransform, ...transforms]);
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
              selfPerspective={cssTransforms.perspective}
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
            {transforms.map((cssTransform: CssTransform, i: number) => {
              return (
                <ListBoxItem
                  key={uniqueKey(cssTransform)}
                  index={i}
                  onRemove={() => {
                    if (!isDisabled) {
                      arrayRemove(transforms, cssTransform);
                      updateTransforms(transforms);
                    }
                  }}
                  onClick={() => !isDisabled && setInspect(i)}
                  mainContent={
                    <div className="labeled-item labeled-item--horizontal--vcenter">
                      <div className="labeled-item__label labeled-item__label--horizontal">
                        {capitalize(cssTransform.type)}
                      </div>
                      <code>{cssTransform.getDisplayText()}</code>
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
