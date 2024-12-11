import { MenuBuilder } from "@/wab/client/components/menu-builder";
import { getVariantIdentifier } from "@/wab/client/components/sidebar/RuleSetControls";
import {
  SidebarSection,
  SidebarSectionHandle,
} from "@/wab/client/components/sidebar/SidebarSection";
import {
  StyleOrCodeComponentVariantLabel,
  VariantLabel,
} from "@/wab/client/components/VariantControls";
import { EditableGroupLabel } from "@/wab/client/components/variants/EditableGroupLabel";
import { StandaloneVariant } from "@/wab/client/components/variants/StandaloneVariantGroup";
import { SuperComponentVariantsSection } from "@/wab/client/components/variants/SuperComponentVariantsSection";
import {
  makeVariantGroupMenu,
  makeVariantMenu,
  VariantDataPicker,
} from "@/wab/client/components/variants/variant-menu";
import VariantComboRow from "@/wab/client/components/variants/VariantComboRow";
import VariantRow from "@/wab/client/components/variants/VariantRow";
import {
  ComponentArenaVariantsController,
  CustomVariantsController,
  makeVariantsController,
  PageArenaVariantsController,
} from "@/wab/client/components/variants/VariantsController";
import VariantSection, {
  makeReadOnlySection,
} from "@/wab/client/components/variants/VariantSection";
import {
  IconLinkButton,
  IFrameAwareDropdownMenu,
} from "@/wab/client/components/widgets";
import {
  GlobalVariantsTooltip,
  VariantCombosTooltip,
  VariantsTooltip,
} from "@/wab/client/components/widgets/DetailedTooltips";
import { EditableLabelHandles } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { SimpleReorderableList } from "@/wab/client/components/widgets/SimpleReorderableList";
import BoltIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Bolt";
import GlobeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Globe";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import VariantGroupIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__VariantGroup";
import ScreenIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Screen";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { testIds } from "@/wab/client/test-helpers/test-ids";
import { findNonEmptyCombos } from "@/wab/shared/cached-selectors";
import { isTplRootWithCodeComponentVariants } from "@/wab/shared/code-components/variants";
import { ensure, ensureInstance, partitions, spawn } from "@/wab/shared/common";
import {
  allComponentStyleVariants,
  allStyleOrCodeComponentVariants,
  getSuperComponents,
  isPageComponent,
} from "@/wab/shared/core/components";
import {
  isGlobalVariantGroupUsedInSplits,
  isVariantUsedInSplits,
} from "@/wab/shared/core/splits";
import { isTplCodeComponent } from "@/wab/shared/core/tpls";
import { ScreenSizeSpec } from "@/wab/shared/css-size";
import {
  Component,
  ComponentVariantGroup,
  isKnownTplTag,
  ObjectPath,
  ProjectDependency,
  TplComponent,
  TplTag,
  Variant,
  VariantGroup,
} from "@/wab/shared/model/classes";
import { VariantPinState } from "@/wab/shared/PinManager";
import { getPlumeVariantDef } from "@/wab/shared/plume/plume-registry";
import { VariantOptionsType } from "@/wab/shared/TplMgr";
import {
  canHaveStyleOrCodeComponentVariant,
  getBaseVariant,
  isBaseVariant,
  isCodeComponentVariant,
  isGlobalVariantGroup,
  isScreenVariantGroup,
  isStandaloneVariantGroup,
  moveVariant,
  moveVariantGroup,
  StyleOrCodeComponentVariant,
  variantComboKey,
} from "@/wab/shared/Variants";
import { Menu } from "antd";
import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { useSessionStorage } from "react-use";

interface VariantsPanelProps {
  studioCtx: StudioCtx;
  component: Component;
  viewCtx: ViewCtx;
}

export interface VariantsPanelHandle {
  onVariantAdded: (variant: Variant) => void;
  onVariantGroupAdded: (group: VariantGroup) => void;
}

export const VariantsPanel = observer(
  React.forwardRef(function VariantsPanel(
    props: VariantsPanelProps,
    ref: React.Ref<VariantsPanelHandle>
  ) {
    const { studioCtx, component, viewCtx } = props;
    const site = studioCtx.site;

    const [justAddedGroup, setJustAddedGroup] = React.useState<
      VariantGroup | undefined
    >();

    const [justAddedVariant, setJustAddedVariant] = React.useState<
      Variant | undefined
    >();

    const projectId = studioCtx.siteInfo.id;
    const [expandGlobals, setExpandGlobals] = useSessionStorage(
      `expandGlobalVariants-${projectId}`,
      true
    );

    const vcontroller = makeVariantsController(studioCtx, viewCtx);

    React.useImperativeHandle(ref, () => ({
      onVariantAdded: (variant: Variant) => {
        setJustAddedVariant(variant);
      },
      onVariantGroupAdded: (group: VariantGroup) => {
        setJustAddedGroup(group);
      },
    }));

    const globalVariantsSectionRef = React.useRef<SidebarSectionHandle>(null);

    const addVariantsMenu = React.useMemo(
      () =>
        new MenuBuilder()
          .genSection(undefined, (push) => {
            push(
              <Menu.Item
                key="toggle-group"
                onClick={() => addVariantGroup(VariantOptionsType.standalone)}
              >
                Add <strong>toggle</strong> variant
              </Menu.Item>
            );
            push(<Menu.Divider />);

            push(
              <Menu.Item
                key="single-select-group"
                onClick={() => addVariantGroup(VariantOptionsType.singleChoice)}
              >
                Add <strong>single-select</strong> group of variants
              </Menu.Item>
            );
            push(
              <Menu.Item
                key="multi-select-group"
                onClick={() => addVariantGroup(VariantOptionsType.multiChoice)}
              >
                Add <strong>multi-select</strong> group of variants
              </Menu.Item>
            );
          })
          .build({
            menuName: "variantspanel-add-variant-group",
          }),
      []
    );

    if (!vcontroller) {
      return null;
    }

    const canChangeVariants = vcontroller.canChangeActiveVariants();
    const superComps = getSuperComponents(component);

    const styleVariants = allComponentStyleVariants(component);
    const styleOrCodeComponentVariants =
      allStyleOrCodeComponentVariants(component);
    const baseVariant = getBaseVariant(component);
    const combos = findNonEmptyCombos(component);
    const selectedVariants = vcontroller.getTargetedVariants();
    const [relevantCombos, otherCombos] = partitions(combos, [
      (combo) => selectedVariants.every((v) => combo.includes(v)),
    ]);

    const onAddedVariant = (variant: Variant) => {
      vcontroller.onAddedVariant(variant);
      setJustAddedVariant(variant);
    };

    const addVariantGroup = (optionsType: VariantOptionsType) =>
      studioCtx.change(({ success }) => {
        const group = studioCtx
          .tplMgr()
          .createVariantGroup({ component, optionsType });

        if (optionsType === VariantOptionsType.standalone) {
          onAddedVariant(group.variants[0]);
        } else {
          setJustAddedGroup(group);
        }
        return success();
      });

    const onRenameVariantGroup = async (
      group: VariantGroup,
      newName: string
    ) => {
      return studioCtx.change(({ success }) => {
        studioCtx.siteOps().tryRenameVariantGroup(group, newName);

        if (justAddedGroup === group && !group.variants.length) {
          const variant = isGlobalVariantGroup(group)
            ? studioCtx.tplMgr().createGlobalVariant(group)
            : studioCtx.tplMgr().createVariant(component, group);
          setJustAddedVariant(variant);
        }

        setJustAddedGroup(undefined);

        return success();
      });
    };

    const root = ensureInstance(component.tplTree, TplTag, TplComponent);

    const maybeReorderableVariants = (
      group: VariantGroup,
      children: React.ReactElement[]
    ) => {
      if (group.variants.length > 1) {
        return (
          <SimpleReorderableList
            onReordered={(fromIndex, toIndex) =>
              studioCtx.change(({ success }) => {
                moveVariant({
                  site: studioCtx.site,
                  component,
                  variantGroup: group,
                  fromIndex,
                  toIndex,
                });
                return success();
              })
            }
            customDragHandle
          >
            {children.map((child) =>
              React.cloneElement(child, { isDraggable: true })
            )}
          </SimpleReorderableList>
        );
      } else {
        return children;
      }
    };

    const makeReadOnlyGroupSection = (
      c: Component,
      group: VariantGroup,
      opts: {
        dep?: ProjectDependency;
        onClickSettings?: () => void;
        icon?: React.ReactNode;
      } = {}
    ) => {
      return makeReadOnlySection({
        viewCtx: viewCtx,
        studioCtx: studioCtx,
        key: group.uuid,
        vcontroller,
        icon: opts.icon ?? <Icon icon={GlobeIcon} />,
        showIcon: !!opts.icon,
        title: `${group.param.variable.name} ${
          opts.dep ? `(from "${opts.dep.name}")` : ""
        }`,
        onClickSettings: opts.onClickSettings,
        variants: group.variants,
        component: c,
      });
    };

    const handleAddGlobalGroupOfVariants = (e) => {
      globalVariantsSectionRef.current?.expand();
      return void studioCtx.change(({ success }) => {
        e.stopPropagation();
        const group = studioCtx.tplMgr().createGlobalVariantGroup();
        setJustAddedGroup(isScreenVariantGroup(group) ? undefined : group);
        setExpandGlobals(true);
        return success();
      });
    };

    const onClickCombo = (combo) =>
      studioCtx.change(({ success }) => {
        vcontroller.onClickCombo(combo);
        return success();
      });

    const onActivateCombo = (combo) =>
      studioCtx.change(({ success }) => {
        vcontroller.onActivateCombo(combo);
        return success();
      });

    const tplRoot = component.tplTree;

    return (
      <div
        className="pass-through"
        {...({
          "data-test-id": "variants-tab",
          "data-event-variants-panel-type":
            vcontroller instanceof CustomVariantsController
              ? "custom"
              : vcontroller instanceof PageArenaVariantsController
              ? "page"
              : vcontroller instanceof ComponentArenaVariantsController
              ? "component"
              : undefined,
        } as any)}
      >
        <SidebarSection
          zeroBodyPadding
          title={
            <LabelWithDetailedTooltip tooltip={<VariantsTooltip />}>
              {isPageComponent(component)
                ? "Page Variants"
                : "Component Variants"}
            </LabelWithDetailedTooltip>
          }
          controls={
            <div
              className={"pass-through"}
              data-test-id="add-variant-group-button"
              data-event="variantspanel-add-variant"
            >
              <IFrameAwareDropdownMenu menu={addVariantsMenu}>
                <IconLinkButton>
                  <Icon icon={PlusIcon} />
                </IconLinkButton>
              </IFrameAwareDropdownMenu>
            </div>
          }
        >
          <>
            <VariantRow
              studioCtx={studioCtx}
              viewCtx={viewCtx}
              variant={baseVariant}
              pinState={
                isBaseVariant(vcontroller.getTargetedVariants())
                  ? "selected-pinned"
                  : undefined
              }
              onClick={() =>
                studioCtx.change(({ success }) => {
                  vcontroller.onClearVariants();
                  return success();
                })
              }
              label={"Base"}
            />

            <SimpleReorderableList
              onReordered={(fromIndex, toIndex) =>
                studioCtx.change(({ success }) => {
                  moveVariantGroup({
                    site: studioCtx.site,
                    component,
                    fromIndex,
                    toIndex,
                  });
                  return success();
                })
              }
              customDragHandle
            >
              {component.variantGroups.map((group) =>
                isStandaloneVariantGroup(group) ? (
                  <StandaloneVariant
                    studioCtx={studioCtx}
                    component={component}
                    key={group.uuid}
                    viewCtx={viewCtx}
                    group={group}
                    pinState={vcontroller.getPinState(group.variants[0])}
                    onClick={() =>
                      studioCtx.change(({ success }) => {
                        vcontroller.onClickVariant(group.variants[0]);
                        return success();
                      })
                    }
                    onTarget={
                      canChangeVariants ||
                      vcontroller.canToggleTargeting(group.variants[0])
                        ? (target) =>
                            studioCtx.change(({ success }) => {
                              vcontroller.onTargetVariant(
                                group.variants[0],
                                target
                              );
                              return success();
                            })
                        : undefined
                    }
                    onToggle={
                      canChangeVariants
                        ? () =>
                            studioCtx.change(({ success }) => {
                              vcontroller.onToggleVariant(group.variants[0]);
                              return success();
                            })
                        : undefined
                    }
                    defaultEditing={group.variants[0] === justAddedVariant}
                    onClone={({ variants }) => setJustAddedVariant(variants[0])}
                    onRenamed={() => setJustAddedVariant(undefined)}
                    isDraggable
                  />
                ) : (
                  <ComponentVariantGroupSection
                    key={group.uuid}
                    studioCtx={studioCtx}
                    viewCtx={viewCtx}
                    group={group}
                    justAdded={group === justAddedGroup}
                    component={component}
                    onRename={(name) => onRenameVariantGroup(group, name)}
                    onAddedVariant={onAddedVariant}
                    isDraggable
                  >
                    {maybeReorderableVariants(
                      group,
                      group.variants.map((variant) => (
                        <ComponentVariantRow
                          key={variant.uuid}
                          component={component}
                          variant={variant}
                          studioCtx={studioCtx}
                          viewCtx={viewCtx}
                          pinState={vcontroller.getPinState(variant)}
                          onClick={() =>
                            studioCtx.change(({ success }) => {
                              vcontroller.onClickVariant(variant);
                              return success();
                            })
                          }
                          onTarget={
                            canChangeVariants ||
                            vcontroller.canToggleTargeting(variant)
                              ? (target) =>
                                  studioCtx.change(({ success }) => {
                                    vcontroller.onTargetVariant(
                                      variant,
                                      target
                                    );
                                    return success();
                                  })
                              : undefined
                          }
                          onToggle={
                            canChangeVariants
                              ? () =>
                                  studioCtx.change(({ success }) => {
                                    vcontroller.onToggleVariant(variant);
                                    return success();
                                  })
                              : undefined
                          }
                          defaultEditing={variant === justAddedVariant}
                          onRenamed={() => setJustAddedVariant(undefined)}
                        />
                      ))
                    )}
                  </ComponentVariantGroupSection>
                )
              )}
            </SimpleReorderableList>
            {canHaveStyleOrCodeComponentVariant(component) &&
              !isPageComponent(component) && (
                <VariantSection
                  showIcon
                  icon={<Icon icon={BoltIcon} />}
                  title={
                    isTplRootWithCodeComponentVariants(tplRoot)
                      ? "Registered Variants"
                      : "Interaction Variants"
                  }
                  emptyAddButtonText="Add variant"
                  emptyAddButtonTooltip={
                    isTplRootWithCodeComponentVariants(tplRoot)
                      ? "Registered variants are registered in code component meta"
                      : "Interaction variants are automatically activated when the user interacts with the component -- by hovering, focusing, pressing, etc."
                  }
                  onAddNewVariant={() =>
                    studioCtx.change(({ success }) => {
                      isTplCodeComponent(tplRoot)
                        ? studioCtx
                            .siteOps()
                            .createCodeComponentVariant(
                              component,
                              tplRoot.component.name
                            )
                        : studioCtx.siteOps().createStyleVariant(component);
                      return success();
                    })
                  }
                  isQuiet
                >
                  {styleOrCodeComponentVariants.map((variant) => (
                    <ComponentStyleVariantRow
                      key={variant.uuid}
                      variant={variant}
                      component={component}
                      studioCtx={studioCtx}
                      viewCtx={viewCtx}
                      pinState={vcontroller.getPinState(variant)}
                      onClick={() =>
                        justAddedVariant !== variant &&
                        studioCtx.change(({ success }) => {
                          vcontroller.onClickVariant(variant);
                          return success();
                        })
                      }
                      onTarget={
                        canChangeVariants ||
                        vcontroller.canToggleTargeting(variant)
                          ? (target) =>
                              studioCtx.change(({ success }) => {
                                vcontroller.onTargetVariant(variant, target);
                                return success();
                              })
                          : undefined
                      }
                      onToggle={
                        canChangeVariants
                          ? () =>
                              studioCtx.change(({ success }) => {
                                vcontroller.onToggleVariant(variant);
                                return success();
                              })
                          : undefined
                      }
                      defaultEditing={variant === justAddedVariant}
                      onEdited={() => setJustAddedVariant(undefined)}
                    />
                  ))}
                </VariantSection>
              )}

            {superComps.map((superComp) => (
              <SuperComponentVariantsSection
                key={superComp.uuid}
                component={superComp}
                studioCtx={studioCtx}
                viewCtx={viewCtx}
                vcontroller={vcontroller}
              />
            ))}
          </>
        </SidebarSection>
        <SidebarSection
          ref={globalVariantsSectionRef}
          title={
            <LabelWithDetailedTooltip tooltip={<GlobalVariantsTooltip />}>
              Global Variants
            </LabelWithDetailedTooltip>
          }
          controls={
            <IconLinkButton tooltip={"Add group of variants"}>
              <Icon
                {...{
                  onClick: handleAddGlobalGroupOfVariants,
                  "data-test-id": "add-global-variant-group-button",
                }}
                icon={PlusIcon}
              />
            </IconLinkButton>
          }
          defaultExpanded={expandGlobals}
          onExtraContentExpanded={() => setExpandGlobals(true)}
          zeroBodyPadding
          hasExtraContent
          fullyCollapsible
          noBottomPadding
          {...testIds.globalVariantsHeader}
        >
          {(renderMaybeCollapsibleRows) =>
            renderMaybeCollapsibleRows(
              [
                {
                  collapsible: true,
                  content: (
                    <>
                      {site.activeScreenVariantGroup &&
                        makeReadOnlyGroupSection(
                          component,
                          site.activeScreenVariantGroup,
                          {
                            icon: <Icon icon={ScreenIcon} />,
                            onClickSettings: () =>
                              spawn(
                                studioCtx.change(({ success }) => {
                                  studioCtx.switchLeftTab("responsiveness", {
                                    highlight: true,
                                  });
                                  return success();
                                })
                              ),
                            dep: studioCtx.projectDependencyManager.getOwnerDep(
                              site.activeScreenVariantGroup
                            ),
                          }
                        )}
                      {[
                        ...site.globalVariantGroups
                          .filter((group) => !isScreenVariantGroup(group))
                          .map((group) => (
                            <GlobalVariantGroupSection
                              key={group.uuid}
                              studioCtx={studioCtx}
                              viewCtx={viewCtx}
                              group={group}
                              defaultEditing={group === justAddedGroup}
                              onRename={(name) =>
                                onRenameVariantGroup(group, name)
                              }
                              onAddedVariant={onAddedVariant}
                            >
                              {maybeReorderableVariants(
                                group,
                                group.variants.map((variant) => (
                                  <GlobalVariantRow
                                    key={variant.uuid}
                                    component={component}
                                    variant={variant}
                                    studioCtx={studioCtx}
                                    viewCtx={viewCtx}
                                    pinState={vcontroller.getPinState(variant)}
                                    onClick={() =>
                                      studioCtx.change(({ success }) => {
                                        vcontroller.onClickVariant(variant);
                                        return success();
                                      })
                                    }
                                    onTarget={
                                      canChangeVariants ||
                                      vcontroller.canToggleTargeting(variant)
                                        ? (target) =>
                                            studioCtx.change(({ success }) => {
                                              vcontroller.onTargetVariant(
                                                variant,
                                                target
                                              );
                                              return success();
                                            })
                                        : undefined
                                    }
                                    onToggle={
                                      canChangeVariants
                                        ? () =>
                                            studioCtx.change(({ success }) => {
                                              vcontroller.onToggleVariant(
                                                variant
                                              );
                                              return success();
                                            })
                                        : undefined
                                    }
                                    defaultEditing={
                                      variant === justAddedVariant
                                    }
                                    onRenamed={() =>
                                      setJustAddedVariant(undefined)
                                    }
                                  />
                                ))
                              )}
                            </GlobalVariantGroupSection>
                          )),

                        ...site.projectDependencies.flatMap((dep) =>
                          dep.site.globalVariantGroups
                            .filter((group) => !isScreenVariantGroup(group))
                            .map((group) =>
                              makeReadOnlyGroupSection(component, group, {
                                dep,
                              })
                            )
                        ),
                      ]}
                    </>
                  ),
                },
              ],
              { alwaysVisible: true }
            )
          }
        </SidebarSection>

        <SidebarSection
          title={
            <LabelWithDetailedTooltip tooltip={<VariantCombosTooltip />}>
              Combinations
            </LabelWithDetailedTooltip>
          }
          zeroBodyPadding
          hasExtraContent
          fullyCollapsible
          noBottomPadding
        >
          {(renderMaybeCollapsibleRows) =>
            renderMaybeCollapsibleRows(
              [
                {
                  collapsible: true,
                  content: (
                    <>
                      {sortBy(relevantCombos, (combo) => combo.length).map(
                        (combo) => (
                          <VariantComboRow
                            key={variantComboKey(combo)}
                            combo={combo}
                            onClick={
                              onClickCombo
                                ? () => onClickCombo(combo)
                                : undefined
                            }
                            onActivate={
                              onActivateCombo
                                ? () => onActivateCombo(combo)
                                : undefined
                            }
                            viewCtx={viewCtx}
                          />
                        )
                      )}
                      {sortBy(
                        otherCombos,
                        (combo) =>
                          -1 *
                          combo.filter((v) => selectedVariants.includes(v))
                            .length
                      ).map((combo) => (
                        <VariantComboRow
                          key={variantComboKey(combo)}
                          combo={combo}
                          onClick={() => onClickCombo(combo)}
                          onActivate={() => onActivateCombo(combo)}
                          viewCtx={viewCtx}
                        />
                      ))}
                    </>
                  ),
                },
              ],
              { alwaysVisible: true }
            )
          }
        </SidebarSection>
      </div>
    );
  })
);

const ComponentVariantRow = observer(function ComponentVariantRow(props: {
  studioCtx: StudioCtx;
  viewCtx?: ViewCtx;
  component: Component;
  variant: Variant;
  pinState: VariantPinState | undefined;
  defaultEditing?: boolean;
  onRenamed: () => void;
  isDragging?: boolean;
  isDraggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  onClick?: () => void;
  onTarget?: (target: boolean) => void;
  onToggle?: () => void;
}) {
  const {
    studioCtx,
    viewCtx,
    variant,
    component,
    pinState,
    defaultEditing,
    onRenamed,
    isDragging,
    isDraggable,
    dragHandleProps,
    onClick,
    onTarget,
    onToggle,
  } = props;
  const ref = React.useRef<EditableLabelHandles>(null);
  const plumeDef = getPlumeVariantDef(component, variant);
  return (
    <VariantRow
      key={variant.uuid}
      variant={variant}
      studioCtx={studioCtx}
      viewCtx={viewCtx}
      pinState={pinState}
      isDraggable={isDraggable}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      onClick={onClick}
      onTarget={onTarget}
      onToggle={onToggle}
      plumeDef={plumeDef}
      menu={makeVariantMenu({
        variant,
        component,
        onRemove: () =>
          spawn(
            studioCtx.change(({ success }) => {
              spawn(studioCtx.siteOps().removeVariant(component, variant));
              return success();
            })
          ),

        onClone: () =>
          spawn(
            studioCtx.change(({ success }) => {
              studioCtx.tplMgr().cloneVariant(component, variant);
              return success();
            })
          ),

        onCopyTo: (toVariant) =>
          spawn(
            studioCtx.change(({ success }) => {
              studioCtx.tplMgr().copyToVariant(component, variant, toVariant);
              return success();
            })
          ),

        onMove: (toGroup) =>
          spawn(
            studioCtx.change(({ success }) => {
              studioCtx.tplMgr().moveVariant(component, variant, toGroup);
              return success();
            })
          ),

        onRename: () => ref.current && ref.current.setEditing(true),
      })}
      label={
        <VariantLabel
          ref={ref}
          doubleClickToEdit
          variant={variant}
          defaultEditing={defaultEditing}
          onRenamed={onRenamed}
        />
      }
    />
  );
});
const GlobalVariantRow = observer(function GlobalVariantRow(props: {
  studioCtx: StudioCtx;
  viewCtx?: ViewCtx;
  component: Component;
  pinState: VariantPinState | undefined;
  variant: Variant;
  defaultEditing?: boolean;
  onRenamed: () => void;
  isDragging?: boolean;
  isDraggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  onClick?: () => void;
  onTarget?: (target: boolean) => void;
  onToggle?: () => void;
}) {
  const {
    studioCtx,
    viewCtx,
    component,
    variant,
    pinState,
    defaultEditing,
    onRenamed,
    isDragging,
    isDraggable,
    dragHandleProps,
    onClick,
    onTarget,
    onToggle,
  } = props;
  const ref = React.useRef<EditableLabelHandles>(null);

  const isSplitsVariant = isVariantUsedInSplits(studioCtx.site, variant);

  return (
    <VariantRow
      key={variant.uuid}
      studioCtx={studioCtx}
      variant={variant}
      viewCtx={viewCtx}
      pinState={pinState}
      onClick={onClick}
      onTarget={onTarget}
      onToggle={onToggle}
      menu={makeVariantMenu({
        variant,
        component,
        onCopyTo: (toVariant) =>
          spawn(
            studioCtx.change(({ success }) => {
              studioCtx.tplMgr().copyToVariant(component, variant, toVariant);
              return success();
            })
          ),
        // Splits variants can't be removed independently of the split if it's
        // not through the split editor
        onRemove: !isSplitsVariant
          ? () =>
              spawn(
                studioCtx.change(({ success }) => {
                  spawn(studioCtx.siteOps().removeGlobalVariant(variant));
                  return success();
                })
              )
          : undefined,
        onRename: () => ref.current && ref.current.setEditing(true),
      })}
      label={
        <VariantLabel
          ref={ref}
          doubleClickToEdit
          variant={variant}
          defaultEditing={defaultEditing}
          onRenamed={onRenamed}
        />
      }
      isDragging={isDragging}
      isDraggable={isDraggable}
      dragHandleProps={dragHandleProps}
    />
  );
});

const ComponentStyleVariantRow = observer(
  function ComponentStyleVariantRow(props: {
    studioCtx: StudioCtx;
    viewCtx?: ViewCtx;
    component: Component;
    pinState: VariantPinState | undefined;
    variant: StyleOrCodeComponentVariant;
    defaultEditing?: boolean;
    onEdited: () => void;
    onClick?: () => void;
    onTarget?: (target: boolean) => void;
    onToggle?: () => void;
  }) {
    const {
      studioCtx,
      viewCtx,
      component,
      pinState,
      variant,
      defaultEditing,
      onEdited,
      onClick,
      onTarget,
      onToggle,
    } = props;
    const ref = React.useRef<EditableLabelHandles>(null);

    return (
      <VariantRow
        key={variant.uuid}
        variant={variant}
        studioCtx={studioCtx}
        viewCtx={viewCtx}
        pinState={pinState}
        onClick={onClick}
        onTarget={onTarget}
        onToggle={onToggle}
        menu={makeVariantMenu({
          variant,
          component,
          onRemove: () =>
            spawn(
              studioCtx.change(({ success }) => {
                spawn(studioCtx.siteOps().removeVariant(component, variant));
                return success();
              })
            ),
          onClone: () =>
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx.tplMgr().cloneVariant(component, variant);
                return success();
              })
            ),

          onCopyTo: (toVariant) =>
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx.tplMgr().copyToVariant(component, variant, toVariant);
                return success();
              })
            ),

          onEditSelectors: () => ref.current && ref.current.setEditing(true),
        })}
        label={
          <StyleOrCodeComponentVariantLabel
            component={component}
            variant={variant}
            forTag={
              isKnownTplTag(component.tplTree) ? component.tplTree.tag : ""
            }
            forRoot={true}
            ref={ref}
            onSelectorsChange={(sels) =>
              studioCtx.change(({ success }) => {
                if (isCodeComponentVariant(variant)) {
                  variant.codeComponentVariantKeys =
                    sels.map(getVariantIdentifier);
                } else {
                  variant.selectors = sels.map(getVariantIdentifier);
                }
                onEdited();
                return success();
              })
            }
            onBlur={() =>
              studioCtx.change(({ success }) => {
                studioCtx
                  .siteOps()
                  .removeStyleOrCodeComponentVariantIfEmptyAndUnused(
                    component,
                    variant
                  );
                return success();
              })
            }
            defaultEditing={defaultEditing}
          />
        }
      />
    );
  }
);

const ComponentVariantGroupSection = observer(
  function ComponentVariantGroupSection(props: {
    studioCtx: StudioCtx;
    viewCtx?: ViewCtx;
    group: ComponentVariantGroup;
    component: Component;
    justAdded?: boolean;
    children: React.ReactNode;
    onAddedVariant: (variant: Variant) => void;
    onRename: (name: string) => void;
    icon?: React.FC;
    isDragging?: boolean;
    isDraggable?: boolean;
    dragHandleProps?: DraggableProvidedDragHandleProps;
  }) {
    const {
      studioCtx,
      group,
      justAdded,
      component,
      children,
      onAddedVariant,
      onRename,
      icon,
      isDragging,
      isDraggable,
      dragHandleProps,
    } = props;

    const hasCodeExpression = !!group.param.defaultExpr;
    const [visibleDataPicker, setVisibleDataPicker] = React.useState(false);

    const ref = React.useRef<EditableLabelHandles>(null);
    return (
      <VariantSection
        key={group.uuid}
        icon={<Icon icon={icon || VariantGroupIcon} />}
        isDraggable={isDraggable}
        isDragging={isDragging}
        dragHandleProps={dragHandleProps}
        title={
          <EditableGroupLabel
            group={group}
            defaultEditing={justAdded}
            onEdit={(name) => onRename(name)}
            ref={ref}
          />
        }
        emptyAddButtonText={`Add variant option`}
        onAddNewVariant={
          justAdded
            ? undefined
            : () =>
                studioCtx.change(({ success }) => {
                  const variant = studioCtx
                    .tplMgr()
                    .createVariant(component, group);
                  onAddedVariant(variant);
                  return success();
                })
        }
        hasCodeExpression={hasCodeExpression}
        exprButton={{
          wrap: (node) => (
            <VariantDataPicker
              studioCtx={studioCtx}
              component={component}
              group={group}
              visibleDataPicker={visibleDataPicker}
              setVisibleDataPicker={setVisibleDataPicker}
            >
              {node}
            </VariantDataPicker>
          ),
        }}
        menu={makeVariantGroupMenu({
          group,
          onToggleMulti: () =>
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx
                  .siteOps()
                  .updateVariantGroupMulti(group, !group.multi);
                return success();
              })
            ),

          onRemove: () =>
            spawn(
              studioCtx.change(({ success }) => {
                spawn(studioCtx.siteOps().removeVariantGroup(component, group));
                return success();
              })
            ),

          onChangeAccessType: (accessType) => {
            const state = ensure(
              group.linkedState,
              "Variant group is expected to have linked state"
            );
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx.siteOps().updateState(state, {
                  accessType,
                });
                return success();
              })
            );
          },

          onRename: () => ref.current && ref.current.setEditing(true),

          onEditDynamicValue: () => {
            spawn(
              studioCtx.change(({ success }) => {
                if (!group.param.defaultExpr) {
                  group.param.defaultExpr = new ObjectPath({
                    path: ["undefined"],
                    fallback: null,
                  });
                }
                setVisibleDataPicker(true);
                return success();
              })
            );
          },

          onRemoveDynamicValue: () => {
            spawn(
              studioCtx.change(({ success }) => {
                group.param.defaultExpr = null;
                return success();
              })
            );
          },
        })}
      >
        {children}
      </VariantSection>
    );
  }
);

const GlobalVariantGroupSection = observer(
  function GlobalVariantGroupSection(props: {
    studioCtx: StudioCtx;
    viewCtx?: ViewCtx;
    group: VariantGroup;
    defaultEditing?: boolean;
    children: React.ReactNode;
    onAddedVariant: (variant: Variant) => void;
    onRename: (name: string) => void;
  }) {
    const {
      studioCtx,
      group,
      defaultEditing,
      children,
      onAddedVariant,
      onRename,
    } = props;

    const isSplitsGroup = isGlobalVariantGroupUsedInSplits(
      studioCtx.site,
      group
    );

    const ref = React.useRef<EditableLabelHandles>(null);
    return (
      <VariantSection
        key={group.uuid}
        icon={<Icon icon={GlobeIcon} />}
        title={
          <EditableGroupLabel
            group={group}
            defaultEditing={defaultEditing}
            onEdit={(name) => onRename(name)}
            ref={ref}
          />
        }
        // We don't allow adding new variants to split groups as they
        // should be handled by the split editor
        onAddNewVariant={
          !isSplitsGroup
            ? () =>
                studioCtx.change(({ success }) => {
                  const variant = studioCtx.tplMgr().createGlobalVariant(group);
                  if (isScreenVariantGroup(group)) {
                    variant.mediaQuery = new ScreenSizeSpec(0).query();
                  }
                  onAddedVariant(variant);
                  return success();
                })
            : undefined
        }
        menu={makeVariantGroupMenu({
          group,
          onToggleMulti: () =>
            spawn(
              studioCtx.change(({ success }) => {
                studioCtx
                  .siteOps()
                  .updateVariantGroupMulti(group, !group.multi);
                return success();
              })
            ),

          onRemove: () =>
            spawn(
              studioCtx.change(({ success }) => {
                spawn(studioCtx.siteOps().removeGlobalVariantGroup(group));
                return success();
              })
            ),

          onRename: () => {
            if (ref.current) {
              ref.current.setEditing(true);
            }
          },
        })}
      >
        {children}
      </VariantSection>
    );
  }
);
