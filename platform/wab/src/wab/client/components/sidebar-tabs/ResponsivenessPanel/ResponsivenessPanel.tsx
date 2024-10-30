import { reactConfirm } from "@/wab/client/components/quick-modals";
import { NewScreenVariantForm } from "@/wab/client/components/sidebar-tabs/ResponsivenessPanel/NewScreenVariantForm";
import styles from "@/wab/client/components/sidebar-tabs/ResponsivenessPanel/ResponsivenessPanel.module.scss";
import LeftPaneHeader from "@/wab/client/components/studio/LeftPaneHeader";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import Select from "@/wab/client/components/widgets/Select";
import { useResponsiveBreakpoints } from "@/wab/client/hooks/useResponsiveBreakpoints";
import PlasmicIcon__Plus from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import PlasmicIcon__Trash2 from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Trash2";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import PlasmicIcon__Alert from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";
import PlasmicButton from "@/wab/client/plasmic/PlasmicButton";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, spawn, xGroupBy } from "@/wab/shared/common";
import { getSiteScreenSizes } from "@/wab/shared/core/sites";
import { ScreenSizeSpec } from "@/wab/shared/css-size";
import { FRAMES_LOWER, FRAME_LOWER } from "@/wab/shared/Labels";
import { Variant } from "@/wab/shared/model/classes";
import {
  ResponsiveStrategy,
  screenVariantPresetGroups,
} from "@/wab/shared/responsiveness";
import { areEquivalentScreenVariants } from "@/wab/shared/Variants";
import {
  Col,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  Popconfirm,
  Popover,
  Row,
} from "antd";
import SubMenu from "antd/es/menu/SubMenu";
import cn from "classnames";
import { findLast } from "lodash";
import startCase from "lodash/startCase";
import { observer } from "mobx-react";
import React, { useState } from "react";

export const ResponsivenessPanel = observer(ResponsivenessPanel_);

const MissingFrameWarning = observer(MissingFrameWarning_);
function MissingFrameWarning_({
  variant,
  iconClassName,
}: {
  variant?: Variant;
  iconClassName?: string;
}) {
  const studioCtx = useStudioCtx();

  return (
    <Popconfirm
      title={`There are no page ${FRAMES_LOWER} corresponding to this breakpoint yet.`}
      overlayStyle={{ maxWidth: 250 }}
      placement={"top"}
      cancelButtonProps={{
        style: { display: "none" },
      }}
      trigger={["click"]}
      okText={`Add matching ${FRAME_LOWER}`}
      onConfirm={() =>
        studioCtx.changeUnsafe(() =>
          studioCtx.siteOps().addMatchingArenaFrame(variant)
        )
      }
    >
      <Icon
        icon={PlasmicIcon__Alert}
        className={cn("monochrome-exempt", iconClassName)}
      />
    </Popconfirm>
  );
}

export function ResponsivenessPanel_() {
  const studioCtx = useStudioCtx();
  const site = studioCtx.site;

  const readOnly =
    studioCtx.getLeftTabPermission("responsiveness") === "readable";
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    strategy,
    isMobileFirst,
    isUnknownStrategy,
    allScreenVariantGroups,
    isActiveOwnedBySite,
    orderedScreenVariants,
  } = useResponsiveBreakpoints();

  const screenSizes = getSiteScreenSizes(studioCtx.site);

  const hasAnyPageArena = studioCtx.site.pageArenas.length > 0;
  const screenSizesByVariant = xGroupBy(
    screenSizes.map((it) => ({
      screenSize: it,
      matchingScreenVariant: findLast(orderedScreenVariants, (v) =>
        isMobileFirst
          ? it.width >= v.screenSpec.minWidth!
          : it.width <= v.screenSpec.maxWidth!
      ),
    })),
    (it) => it.matchingScreenVariant?.variant
  );

  const setupScreenVariants = async (
    breakpoints: { screenSizeSpec: ScreenSizeSpec; name: string }[]
  ) => {
    return studioCtx.changeUnsafe(() => {
      breakpoints.forEach((it) => {
        studioCtx.tplMgr().createScreenVariant({
          name: it.name,
          spec: it.screenSizeSpec,
        });
      });
    });
  };

  const handleWidthFieldBlur =
    (
      variant: Variant,
      screenSpec: ScreenSizeSpec,
      prop?: "minWidth" | "maxWidth"
    ) =>
    async (e) => {
      const cleanValue = e.target.value.replace(/[^0-9.]/g, "");
      const newWidth = cleanValue ? parseInt(cleanValue) : undefined;

      if (newWidth || strategy === ResponsiveStrategy.unknown) {
        await studioCtx.changeUnsafe(() => {
          const minWidth =
            prop === "minWidth" || strategy === ResponsiveStrategy.mobileFirst
              ? newWidth
              : screenSpec.minWidth;
          const maxWidth =
            prop === "maxWidth" || strategy === ResponsiveStrategy.desktopFirst
              ? newWidth
              : screenSpec.maxWidth;

          const newSpec = new ScreenSizeSpec(minWidth, maxWidth);

          studioCtx.tplMgr().updateScreenVariantQuery(variant, newSpec.query());
        });
      }
    };

  const handleBreakpointsGroupChange = async (key) => {
    const group = allScreenVariantGroups.find((g) => g.uuid === key);
    if (group && group !== site.activeScreenVariantGroup) {
      const missingVariants =
        site.activeScreenVariantGroup?.variants.filter(
          (prevV) =>
            !group.variants.find((newV) =>
              areEquivalentScreenVariants(prevV, newV)
            )
        ) ?? [];

      if (
        await reactConfirm({
          message: (
            <div>
              <p>
                Are you sure you want to switch to a different set of
                breakpoints?
              </p>
              {missingVariants.length > 0 && (
                <p>
                  <strong>You will lose changes</strong> associated with
                  breakpoints{" "}
                  {" " + missingVariants.map((v) => `"${v.name}"`).join(", ")},
                  because there are no new breakpoints that match them exactly.
                </p>
              )}
            </div>
          ),
        })
      ) {
        await studioCtx.siteOps().updateActiveScreenVariantGroup(group);
      }
    }
  };

  return (
    <>
      <LeftPaneHeader
        title="Responsive Breakpoints"
        description={
          <div>
            <p>
              Breakpoints let you make pages and components look different
              depending on the screen size.{" "}
              <a
                href={"https://docs.plasmic.app/learn/screen-variants"}
                target={"_blank"}
              >
                Learn more
              </a>
              .
            </p>
            <p>
              <strong>Most projects need just 1 breakpoint</strong>, to switch
              between desktop and mobile styles. We recommend not exceeding 3.
              Too many can be hard to manage.
            </p>
            <p>
              <strong>
                Don't create a breakpoint for your{" "}
                {isMobileFirst ? "smallest" : "largest"} screen size
              </strong>
              . Instead, use the Base variant as your{" "}
              {isMobileFirst ? "smallest" : "largest"} screen size, and specify
              responsive overrides for other{" "}
              {isMobileFirst ? "larger" : "smaller"} breakpoints.
            </p>
          </div>
        }
        actions={
          <>
            {allScreenVariantGroups.length > 1 && (
              <Select
                aria-label="Select breakpoints to use"
                value={site.activeScreenVariantGroup?.uuid}
                onChange={handleBreakpointsGroupChange}
                isDisabled={readOnly}
              >
                {allScreenVariantGroups.map((group) => (
                  <Select.Option value={group.uuid} key={group.uuid}>
                    {site.globalVariantGroups.includes(group)
                      ? "This project's breakpoints"
                      : `Breakpoints from "${
                          ensure(
                            studioCtx.projectDependencyManager.getOwnerDep(
                              group
                            ),
                            `Missing dependency for ${group.uuid}`
                          ).name
                        }"`}
                  </Select.Option>
                ))}
              </Select>
            )}
            {isActiveOwnedBySite &&
            !readOnly &&
            (allScreenVariantGroups.length === 0 ||
              !orderedScreenVariants?.length) ? (
              <Dropdown
                trigger={["click"]}
                overlay={
                  <Menu>
                    {screenVariantPresetGroups.map((presetGroup) => (
                      <SubMenu
                        key={presetGroup.groupTitle}
                        title={presetGroup.groupTitle}
                      >
                        {presetGroup.presets.map((preset) => (
                          <Menu.Item
                            key={preset.label}
                            onClick={async () =>
                              setupScreenVariants(preset.breakpoints)
                            }
                          >
                            {preset.label}
                          </Menu.Item>
                        ))}
                      </SubMenu>
                    ))}
                  </Menu>
                }
              >
                <Button
                  type="secondary"
                  endIcon={<Icon icon={TriangleBottomIcon} />}
                  withIcons="endIcon"
                >
                  Start with a preset
                </Button>
              </Dropdown>
            ) : undefined}
          </>
        }
      />
      {!!orderedScreenVariants?.length && (
        <div className={styles.contentRoot}>
          {!isUnknownStrategy && (
            <div className={styles.strategy}>
              {startCase(strategy)}
              {!screenSizesByVariant.has(undefined) && (
                <MissingFrameWarning
                  iconClassName={styles.warningIconBaseVariant}
                />
              )}
            </div>
          )}
          <div className={styles.breakpointsContainer}>
            {orderedScreenVariants?.map(({ screenSpec, variant }) => {
              const variantNameFieldProps = {
                placeholder: "Name",
                defaultValue: variant.name,
                onBlur: async (e) => {
                  if (e.target.value) {
                    await studioCtx.changeUnsafe(
                      () => (variant.name = e.target.value)
                    );
                  }
                },
                onPressEnter: (e) => e.currentTarget.blur(),
                disabled: !isActiveOwnedBySite || readOnly,
              };

              return (
                <React.Fragment key={variant.uid}>
                  <Row gutter={8}>
                    {isUnknownStrategy ? (
                      <Col span={isActiveOwnedBySite && !readOnly ? 21 : 24}>
                        <Input.Group compact>
                          <Input
                            style={{ width: "40%" }}
                            {...variantNameFieldProps}
                          />
                          <InputNumber
                            style={{ width: "30%" }}
                            placeholder="Min W"
                            formatter={(v) => (v ? `≥ ${v}` : "")}
                            parser={(v) => Number(`${v}`.replace(/\D/g, ""))}
                            defaultValue={screenSpec.minWidth}
                            onBlur={handleWidthFieldBlur(
                              variant,
                              screenSpec,
                              "minWidth"
                            )}
                            onPressEnter={(e) => e.currentTarget.blur()}
                            disabled={!isActiveOwnedBySite || readOnly}
                          />
                          <InputNumber
                            style={{ width: "30%" }}
                            placeholder="Max W"
                            formatter={(v) => (v ? `≤ ${v}` : "")}
                            parser={(v) => Number(`${v}`.replace(/\D/g, ""))}
                            defaultValue={screenSpec.maxWidth}
                            onBlur={handleWidthFieldBlur(
                              variant,
                              screenSpec,
                              "maxWidth"
                            )}
                            onPressEnter={(e) => e.currentTarget.blur()}
                            disabled={!isActiveOwnedBySite || readOnly}
                          />
                        </Input.Group>
                      </Col>
                    ) : (
                      <>
                        <Col span={isActiveOwnedBySite && !readOnly ? 12 : 15}>
                          <Input {...variantNameFieldProps} />
                          {hasAnyPageArena &&
                            !screenSizesByVariant.has(variant) && (
                              <MissingFrameWarning
                                variant={variant}
                                iconClassName={styles.warningIconCustomVariant}
                              />
                            )}
                        </Col>
                        <Col span={9}>
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder={
                              isMobileFirst ? "Min width" : "Max width"
                            }
                            formatter={(v) =>
                              v ? `${isMobileFirst ? "≥" : "≤"} ${v} px` : ""
                            }
                            parser={(v) => Number(`${v}`.replace(/\D/g, ""))}
                            defaultValue={
                              isMobileFirst
                                ? screenSpec.minWidth
                                : screenSpec.maxWidth
                            }
                            onBlur={handleWidthFieldBlur(variant, screenSpec)}
                            onPressEnter={(e) => e.currentTarget.blur()}
                            disabled={!isActiveOwnedBySite || readOnly}
                          />
                        </Col>
                      </>
                    )}
                    {isActiveOwnedBySite && !readOnly && (
                      <Col span={3} className={styles.deleteIconCol}>
                        <Popconfirm
                          title="Delete this breakpoint?"
                          onConfirm={() =>
                            studioCtx.changeUnsafe(() => {
                              spawn(
                                studioCtx.siteOps().removeGlobalVariant(variant)
                              );
                            })
                          }
                          cancelText="No"
                          okText="Yes"
                        >
                          <Icon
                            icon={PlasmicIcon__Trash2}
                            className="monochrome-exempt"
                          />
                        </Popconfirm>
                      </Col>
                    )}
                  </Row>
                </React.Fragment>
              );
            })}
          </div>
          {isActiveOwnedBySite && !readOnly && (
            <Popover
              visible={showAddForm}
              placement={"bottomRight"}
              trigger={["click"]}
              onVisibleChange={(visible) => setShowAddForm(visible)}
              destroyTooltipOnHide
              content={
                <NewScreenVariantForm
                  isVisible={showAddForm}
                  onSubmit={() => setShowAddForm(false)}
                />
              }
            >
              <PlasmicButton
                type={"clear"}
                withIcons={["startIcon"]}
                startIcon={<Icon icon={PlasmicIcon__Plus} />}
              >
                New breakpoint
              </PlasmicButton>
            </Popover>
          )}
        </div>
      )}
    </>
  );
}
