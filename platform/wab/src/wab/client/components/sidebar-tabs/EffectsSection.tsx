import {
  FullRow,
  LabeledStyleSelectItem,
  LabeledStyleSelectItemRow,
  LabeledStyleSwitchItem,
  SectionSeparator,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  ExpsProvider,
  StylePanelSection,
} from "@/wab/client/components/style-controls/StyleComponent";
import { isStylePropSet } from "@/wab/client/utils/style-utils";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";
import {
  FaHandPaper,
  FaHandPointer,
  FaHandRock,
  FaICursor,
  FaMousePointer,
  FaSpinner,
} from "react-icons/fa";
import { FiMove } from "react-icons/fi";
import { MdDoNotDisturbAlt } from "react-icons/md";
import {
  BackdropFilterEffectSection,
  FilterEffectSection,
} from "./FilterEffectSection";

const mixBlendModeOpts = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

export const EffectsPanelSection = observer(
  function EffectsPanelSection(props: { expsProvider: ExpsProvider }) {
    const { expsProvider } = props;
    const { studioCtx } = expsProvider;
    const exp = expsProvider.mergedExp();

    const isSet = isStylePropSet(expsProvider);

    const styleProps = [
      "cursor",
      "pointer-events",
      "mix-blend-mode",
      "isolation",
    ];

    return (
      <StylePanelSection
        fullyCollapsible
        expsProvider={expsProvider}
        title={"Effects"}
        styleProps={styleProps}
        hasMore
      >
        {(renderMaybeCollapsibleRows) => (
          <>
            {renderMaybeCollapsibleRows(
              [
                {
                  collapsible: !isSet("cursor", "pointer-events"),
                  content: (
                    <>
                      <FullRow>
                        <LabeledStyleSelectItem
                          styleName="cursor"
                          label="Cursor"
                          tooltip="Set mouse cursor when hovering on this layer"
                          textRight={false}
                          selectOpts={{
                            options: [
                              {
                                value: "auto",
                                label: "Auto",
                              },
                              {
                                value: "default",
                                label: (
                                  <span className="flex-vcenter">
                                    <FaMousePointer className="mr-ch" /> Default
                                  </span>
                                ),
                              },
                              {
                                value: "pointer",
                                label: (
                                  <span className="flex-vcenter">
                                    <FaHandPointer className="mr-ch" /> Pointer
                                  </span>
                                ),
                              },
                              {
                                value: "text",
                                label: (
                                  <span className="flex-vcenter">
                                    <FaICursor className="mr-ch" /> Text
                                  </span>
                                ),
                              },
                              {
                                value: "move",
                                label: (
                                  <span className="flex-vcenter">
                                    <FiMove className="mr-ch" /> Move
                                  </span>
                                ),
                              },
                              {
                                value: "wait",
                                label: (
                                  <span className="flex-vcenter">
                                    <FaSpinner className="mr-ch" /> Wait
                                  </span>
                                ),
                              },
                              {
                                value: "grab",
                                label: (
                                  <span className="flex-vcenter">
                                    <FaHandPaper className="mr-ch" /> Grab
                                  </span>
                                ),
                              },
                              {
                                value: "grabbing",
                                label: (
                                  <span className="flex-vcenter">
                                    <FaHandRock className="mr-ch" /> Grabbing
                                  </span>
                                ),
                              },
                              {
                                value: "not-allowed",
                                label: (
                                  <span className="flex-vcenter">
                                    <MdDoNotDisturbAlt className="mr-ch" /> Not
                                    allowed
                                  </span>
                                ),
                              },
                            ],
                          }}
                        />
                      </FullRow>
                      <FullRow>
                        <LabeledStyleSwitchItem
                          styleName="pointer-events"
                          label="Interactive"
                          value={exp.get("pointer-events") === "auto"}
                          onChange={(checked) =>
                            studioCtx.changeUnsafe(() =>
                              exp.set(
                                "pointer-events",
                                checked ? "auto" : "none"
                              )
                            )
                          }
                        />
                      </FullRow>
                    </>
                  ),
                },
                {
                  collapsible:
                    !isSet("isolation", "mix-blend-mode") ||
                    !isSet("pointer-events", "cursor"),
                  content: <SectionSeparator className="mv-m" />,
                },
                {
                  collapsible: !isSet("isolation", "mix-blend-mode"),
                  content: (
                    <>
                      <FullRow>
                        <LabeledStyleSelectItemRow
                          styleName="mix-blend-mode"
                          label="Blend"
                          tooltip="How should the colors blend with the elements behind it?"
                          textRight={false}
                          selectOpts={{
                            options: mixBlendModeOpts.map((value) => ({
                              value: value,
                              label: L.capitalize(value),
                            })),
                          }}
                        />
                      </FullRow>
                      <FullRow>
                        <LabeledStyleSwitchItem
                          styleName="isolation"
                          label="Reset context"
                          value={exp.get("isolation") === "isolate"}
                          onChange={(checked) =>
                            studioCtx.changeUnsafe(() =>
                              exp.set("isolation", checked ? "isolate" : "auto")
                            )
                          }
                          tooltip="Prevents children elements with blend modes from blending with parents of this container."
                        />
                      </FullRow>
                    </>
                  ),
                },
                {
                  collapsible:
                    !(
                      isSet("isolation", "mix-blend-mode") ||
                      isSet("pointer-events", "cursor") ||
                      isSet("isolation", "mix-blend-mode")
                    ) || !isSet("filter"),
                  content: <SectionSeparator className="mv-m" />,
                },
                {
                  collapsible: !isSet("filter"),
                  content: <FilterEffectSection expsProvider={expsProvider} />,
                },
                {
                  collapsible:
                    !(
                      isSet("isolation", "mix-blend-mode") ||
                      isSet("pointer-events", "cursor") ||
                      isSet("isolation", "mix-blend-mode") ||
                      isSet("filter")
                    ) || !isSet("backdrop-filter"),
                  content: <SectionSeparator className="mv-m" />,
                },
                {
                  collapsible: !isSet("backdrop-filter"),
                  content: (
                    <BackdropFilterEffectSection expsProvider={expsProvider} />
                  ),
                },
              ],
              { alwaysVisible: true }
            )}
          </>
        )}
      </StylePanelSection>
    );
  }
);
