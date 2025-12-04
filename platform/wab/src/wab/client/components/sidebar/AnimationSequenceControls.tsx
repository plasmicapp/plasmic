import { showError } from "@/wab/client/ErrorNotifications";
import ListItem from "@/wab/client/components/ListItem";
import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { EffectsPanelSection } from "@/wab/client/components/sidebar-tabs/EffectsSection";
import { ShadowsPanelSection } from "@/wab/client/components/sidebar-tabs/ShadowsSection";
import {
  SizeSection,
  sizeStyleProps,
} from "@/wab/client/components/sidebar-tabs/SizeSection";
import {
  SpacingSection,
  spacingStyleProps,
} from "@/wab/client/components/sidebar-tabs/SpacingSection";
import { TransformPanelSection } from "@/wab/client/components/sidebar-tabs/TransformPanelSection";
import { TypographySection } from "@/wab/client/components/sidebar-tabs/TypographySection";
import { BackgroundSection } from "@/wab/client/components/sidebar-tabs/background-section";
import { FindReferencesModal } from "@/wab/client/components/sidebar/FindReferencesModal";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  ItemOrGroup,
  VirtualGroupedList,
} from "@/wab/client/components/sidebar/VirtualGroupedList";
import { useDepFilterButton } from "@/wab/client/components/sidebar/left-panel-utils";
import {
  FullRow,
  LabeledItem,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import {
  BorderPanelSection,
  BorderRadiusSection,
  borderRadiusStyleProps,
  borderStyleProps,
} from "@/wab/client/components/style-controls/BorderControls";
import { KeyFrameStops } from "@/wab/client/components/style-controls/KeyFrameStops";
import { OpacityControl } from "@/wab/client/components/style-controls/OpacityControl";
import {
  OutlinePanelSection,
  outlineStyleProps,
} from "@/wab/client/components/style-controls/OutlineControls";
import {
  ExpsProvider,
  SingleRsExpsProvider,
  StylePanelSection,
  mkStyleComponent,
  providesStyleComponent,
} from "@/wab/client/components/style-controls/StyleComponent";
import { Matcher } from "@/wab/client/components/view-common";
import DimTokenSpinner from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import AnimationEnterSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__AnimationEnterSvg";
import PlasmicLeftAnimationSequencesPanel from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftAnimationSequencesPanel";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isStylePropSet } from "@/wab/client/utils/style-utils";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { spawn } from "@/wab/shared/common";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import {
  extractAnimationSequenceUsages,
  mkRuleSet,
} from "@/wab/shared/core/styles";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  AnimationSequence,
  KeyFrame,
  ProjectDependency,
} from "@/wab/shared/model/classes";
import { naturalSort } from "@/wab/shared/sort";
import { Menu, notification } from "antd";
import { observer } from "mobx-react";
import React from "react";

interface AnimationSequenceRowProps {
  sequence: AnimationSequence;
  studioCtx: StudioCtx;
  matcher: Matcher;
  readOnly?: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onClick?: () => void;
  onFindReferences: () => void;
}

const AnimationSequenceEditModal = observer(
  function AnimationSequenceEditModal(props: {
    studioCtx: StudioCtx;
    sequence: AnimationSequence;
    show: boolean;
    onClose: () => void;
    autoFocusTitle?: boolean;
  }) {
    const { studioCtx, sequence } = props;
    const [selectedKeyframe, setSelectedKeyframe] = React.useState<
      KeyFrame | undefined
    >(sequence.keyframes.length > 0 ? sequence.keyframes[0] : undefined);
    const vsh = new VariantedStylesHelper(studioCtx.site);

    // Create a default keyframe if none exist
    React.useEffect(() => {
      if (sequence.keyframes.length === 0) {
        spawn(
          studioCtx.change(({ success }) => {
            const defaultKeyframe = new KeyFrame({
              percentage: 0,
              rs: mkRuleSet({}),
            });
            sequence.keyframes.push(defaultKeyframe);
            setSelectedKeyframe(defaultKeyframe);
            return success();
          })
        );
      }
    }, [sequence.keyframes.length, studioCtx]);

    return (
      <SidebarModal
        title={<div>Edit animation sequence</div>}
        show={props.show}
        onClose={props.onClose}
      >
        <SidebarSection>
          <div className="panel-row--separated">
            <SimpleTextbox
              defaultValue={sequence.name}
              onValueChange={(name) =>
                spawn(
                  studioCtx.change(({ success }) => {
                    studioCtx.tplMgr().renameAnimationSequence(sequence, name);
                    return success();
                  })
                )
              }
              placeholder="(unnamed animation sequence)"
              autoFocus={props.autoFocusTitle}
              selectAllOnFocus={true}
              fontSize="xlarge"
              fontStyle="bold"
            />
          </div>
        </SidebarSection>

        <SidebarSection title="Keyframes">
          <div className="panel-row">
            <KeyFrameStops
              sequence={sequence}
              studioCtx={studioCtx}
              onSelectKeyframe={setSelectedKeyframe}
              selectedKeyframe={selectedKeyframe}
              onDeleteKeyframe={(keyframe) => {
                spawn(
                  studioCtx.change(({ success }) => {
                    const keyframeIndex = sequence.keyframes.indexOf(keyframe);
                    if (keyframeIndex > -1) {
                      sequence.keyframes.splice(keyframeIndex, 1);
                    }
                    // If we deleted the selected keyframe, select another one
                    if (
                      keyframe === selectedKeyframe &&
                      sequence.keyframes.length > 0
                    ) {
                      const newIndex = Math.min(
                        keyframeIndex,
                        sequence.keyframes.length - 1
                      );
                      setSelectedKeyframe(sequence.keyframes[newIndex]);
                    } else if (sequence.keyframes.length === 0) {
                      setSelectedKeyframe(undefined);
                    }
                    return success();
                  })
                );
              }}
            />
          </div>
          {selectedKeyframe && (
            <FullRow>
              <LabeledItem label="Percentage">
                <DimTokenSpinner
                  value={`${selectedKeyframe.percentage}%`}
                  onChange={(val) => {
                    const numVal = parseFloat(val || "0");
                    if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
                      spawn(
                        studioCtx.change(({ success }) => {
                          selectedKeyframe.percentage = numVal;
                          // Sort keyframes by percentage to maintain order
                          sequence.keyframes.sort(
                            (a, b) => a.percentage - b.percentage
                          );
                          return success();
                        })
                      );
                    }
                  }}
                  noClear
                  allowedUnits={["%"]}
                  extraOptions={["0%", "25%", "50%", "75%", "100%"]}
                  studioCtx={studioCtx}
                  min={0}
                  max={100}
                />
              </LabeledItem>
            </FullRow>
          )}
        </SidebarSection>

        {selectedKeyframe && (
          <AnimationSequenceStylePanelSections
            expsProvider={
              new SingleRsExpsProvider(selectedKeyframe.rs, studioCtx, [])
            }
            vsh={vsh}
          />
        )}
      </SidebarModal>
    );
  }
);

function AnimationSequenceStylePanelSections({
  expsProvider,
  vsh,
}: {
  expsProvider: ExpsProvider;
  vsh: VariantedStylesHelper;
}) {
  const styleComponent = mkStyleComponent({ expsProvider });
  const isSet = isStylePropSet(expsProvider);

  return providesStyleComponent(styleComponent)(
    <SidebarSection zeroBodyPadding>
      {(renderMaybeCollapsibleRows) => (
        <>
          <StylePanelSection
            key="visibility"
            expsProvider={expsProvider}
            styleProps={["opacity"]}
            title={"Visibility"}
          >
            <FullRow>
              <OpacityControl expsProvider={expsProvider} />
            </FullRow>
          </StylePanelSection>
          <TypographySection
            key="typography"
            expsProvider={expsProvider}
            inheritableOnly={false}
            vsh={vsh}
            animatableOnly={true}
          />
          <TransformPanelSection key="transform" expsProvider={expsProvider} />

          {renderMaybeCollapsibleRows([
            {
              collapsible: !isSet(...sizeStyleProps),
              content: (
                <SizeSection
                  key="sizing"
                  expsProvider={expsProvider}
                  vsh={vsh}
                />
              ),
            },
            {
              collapsible: !isSet(...spacingStyleProps),
              content: (
                <SpacingSection
                  key="spacing"
                  expsProvider={expsProvider}
                  vsh={vsh}
                />
              ),
            },
            {
              collapsible: !isSet("background"),
              content: (
                <BackgroundSection
                  key="background"
                  expsProvider={expsProvider}
                  vsh={vsh}
                  animatableOnly={true}
                />
              ),
            },
            {
              collapsible: !isSet(
                ...borderStyleProps,
                ...borderRadiusStyleProps
              ),
              content: (
                <React.Fragment key="border">
                  <BorderPanelSection expsProvider={expsProvider} vsh={vsh} />
                  <BorderRadiusSection expsProvider={expsProvider} vsh={vsh} />
                </React.Fragment>
              ),
            },
            {
              collapsible: !isSet(...outlineStyleProps),
              content: <OutlinePanelSection key="outline" />,
            },
            {
              collapsible: !isSet("box-shadow"),
              content: (
                <ShadowsPanelSection
                  key="shadow"
                  expsProvider={expsProvider}
                  vsh={vsh}
                />
              ),
            },
            {
              collapsible: !isSet("filter", "backdrop-filter"),
              content: (
                <EffectsPanelSection
                  key="effect"
                  expsProvider={expsProvider}
                  animatableOnly={true}
                />
              ),
            },
          ])}
        </>
      )}
    </SidebarSection>
  );
}

const AnimationSequenceRow = observer(function AnimationSequenceRow(
  props: AnimationSequenceRowProps
) {
  const { sequence, onDuplicate, onDelete, onEdit, onClick } = props;

  const renderMenu = () => {
    const builder = new MenuBuilder();
    builder.genSection(undefined, (push) => {
      push(
        <Menu.Item key="references" onClick={() => props.onFindReferences()}>
          Find all references
        </Menu.Item>
      );

      if (onDuplicate) {
        push(
          <Menu.Item key="duplicate" onClick={() => onDuplicate()}>
            Duplicate
          </Menu.Item>
        );
      }

      if (onDelete) {
        push(
          <Menu.Item key="delete" onClick={() => onDelete()}>
            Delete
          </Menu.Item>
        );
      }
    });
    return builder.build({
      onMenuClick: (e) => e.domEvent.stopPropagation(),
      menuName: "animation-sequence-menu",
    });
  };

  return (
    <ListItem
      icon={<Icon icon={AnimationEnterSvgIcon} />}
      onClick={() => {
        onEdit?.();
        onClick?.();
      }}
      menu={renderMenu}
    >
      {sequence.name}
    </ListItem>
  );
});

export const AnimationSequencesPanel = observer(
  function AnimationSequencesPanel() {
    const studioCtx = useStudioCtx();
    const [query, setQuery] = React.useState("");
    const { filterDeps, filterProps } = useDepFilterButton({
      studioCtx,
      deps: studioCtx.site.projectDependencies.filter(
        (d) => d.site.animationSequences.length > 0
      ),
    });

    const readOnly =
      studioCtx.getLeftTabPermission("animationSequences") === "readable";
    const matcher = new Matcher(query);

    const [justAdded, setJustAdded] = React.useState<
      AnimationSequence | undefined
    >(undefined);
    const [editingSequence, setEditingSequence] =
      React.useState<AnimationSequence | null>(null);

    const [findReferenceAnimationSequence, setFindReferenceAnimationSequence] =
      React.useState<AnimationSequence | undefined>(undefined);

    const addSequence = async () => {
      await studioCtx.change(({ success }) => {
        const animationSequence = studioCtx.tplMgr().addAnimationSequence();
        setJustAdded(animationSequence);
        setEditingSequence(animationSequence);
        return success();
      });
    };

    const importPresetAnimationSequences = async () => {
      try {
        await studioCtx.projectDependencyManager.addByProjectId(
          DEVFLAGS.presetAnimationsProjectId
        );
      } catch (e) {
        showError(e, { title: "Error importing preset animations." });
      }
    };

    const onDuplicate = (sequence: AnimationSequence) => {
      spawn(
        studioCtx.change(({ success }) => {
          const animationSequence = studioCtx
            .tplMgr()
            .duplicateAnimationSequence(sequence);
          setJustAdded(animationSequence);
          setEditingSequence(animationSequence);
          return success();
        })
      );

      notification.success({
        message: `Duplicated "${sequence.name}"`,
      });
    };

    const onDelete = async (sequence: AnimationSequence) => {
      await studioCtx.siteOps().tryDeleteAnimationSequences([sequence]);
    };

    const onFindReferences = (animSeq: AnimationSequence) => {
      setFindReferenceAnimationSequence(animSeq);
    };

    const makeAnimationSequencesItems = (
      animationSequences: AnimationSequence[]
    ) => {
      animationSequences = animationSequences.filter(
        (animationSequence) =>
          matcher.matches(animationSequence.name) ||
          justAdded === animationSequence
      );
      animationSequences = naturalSort(
        animationSequences,
        (animationSequence) => animationSequence.name
      );
      return animationSequences.map((animationSequence) => ({
        type: "item" as const,
        item: animationSequence,
        key: animationSequence.uuid,
      }));
    };

    const makeDepsItems = (deps: ProjectDependency[]) => {
      deps = deps.filter(
        (dep) => filterDeps.length === 0 || filterDeps.includes(dep)
      );
      deps = naturalSort(deps, (dep) =>
        studioCtx.projectDependencyManager.getNiceDepName(dep)
      );
      return deps.map((dep) => ({
        type: "group" as const,
        key: dep.uuid,
        group: dep,
        items: makeAnimationSequencesItems(dep.site.animationSequences),
        defaultCollapsed: true,
      }));
    };

    const items: ItemOrGroup<ProjectDependency, AnimationSequence>[] = [
      ...(filterDeps.length === 0
        ? [...makeAnimationSequencesItems(studioCtx.site.animationSequences)]
        : []),
      ...makeDepsItems(
        studioCtx.site.projectDependencies.filter(
          (d) => !isHostLessPackage(d.site)
        )
      ),
      ...makeDepsItems(
        studioCtx.site.projectDependencies.filter((d) =>
          isHostLessPackage(d.site)
        )
      ),
    ];

    const editableAnimationSequences = new Set(
      studioCtx.site.animationSequences
    );

    const showImportPresetAnimationsButton =
      !readOnly &&
      DEVFLAGS.presetAnimationsProjectId &&
      !studioCtx.projectDependencyManager.containsProjectId(
        DEVFLAGS.presetAnimationsProjectId
      );

    return (
      <>
        <PlasmicLeftAnimationSequencesPanel
          leftSearchPanel={{
            searchboxProps: {
              value: query,
              onChange: (e) => setQuery(e.target.value),
              autoFocus: true,
            },
            filterProps,
          }}
          newAnimationSequenceButton={
            readOnly
              ? { render: () => null }
              : {
                  onClick: () => addSequence(),
                }
          }
          importAnimationSequenceButton={
            showImportPresetAnimationsButton
              ? {
                  onClick: () => importPresetAnimationSequences(),
                }
              : { render: () => null }
          }
          content={
            <VirtualGroupedList
              items={items}
              renderItem={(animSeq) => (
                <AnimationSequenceRow
                  sequence={animSeq}
                  studioCtx={studioCtx}
                  matcher={matcher}
                  onDuplicate={
                    readOnly ? undefined : () => onDuplicate(animSeq)
                  }
                  onFindReferences={() => onFindReferences(animSeq)}
                  readOnly={
                    readOnly || !editableAnimationSequences.has(animSeq)
                  }
                  onDelete={
                    !readOnly && editableAnimationSequences.has(animSeq)
                      ? () => onDelete(animSeq)
                      : undefined
                  }
                  onClick={
                    !readOnly && editableAnimationSequences.has(animSeq)
                      ? () => setEditingSequence(animSeq)
                      : undefined
                  }
                />
              )}
              itemHeight={32}
              renderGroupHeader={(dep) =>
                `Imported from "${studioCtx.projectDependencyManager.getNiceDepName(
                  dep
                )}"`
              }
              headerHeight={50}
              hideEmptyGroups
              forceExpandAll={matcher.hasQuery() || filterDeps.length > 0}
            />
          }
        />

        {/* Animation sequence editing popup */}
        {editingSequence && (
          <AnimationSequenceEditModal
            studioCtx={studioCtx}
            sequence={editingSequence}
            show={true}
            onClose={() => setEditingSequence(null)}
            autoFocusTitle={true}
          />
        )}

        {findReferenceAnimationSequence && (
          <FindReferencesModal
            studioCtx={studioCtx}
            displayName={findReferenceAnimationSequence.name}
            icon={<Icon icon={AnimationEnterSvgIcon} />}
            usageSummary={
              extractAnimationSequenceUsages(
                studioCtx.site,
                findReferenceAnimationSequence
              )[1]
            }
            onClose={() => {
              setFindReferenceAnimationSequence(undefined);
            }}
          />
        )}
      </>
    );
  }
);
