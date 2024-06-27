import { useAppRoles } from "@/wab/client/components/app-auth/app-auth-contexts";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ifDevFlag } from "@/wab/client/utils/ifDevFlag";
import { zIndex } from "@/wab/client/z-index";
import { ensure } from "@/wab/shared/common";
import { ApiAppRole } from "@/wab/shared/ApiSchema";
import { findAllDataSourceOpExprForComponent } from "@/wab/shared/cached-selectors";
import {
  dataSourceTemplateToString,
  getTemplateFieldType,
  mkDataSourceTemplate,
} from "@/wab/shared/data-sources-meta/data-sources";
import { Component, DataSourceOpExpr } from "@/wab/shared/model/classes";
import { Select as AntSelect, Form, notification } from "antd";
import { Dictionary, keyBy, mapValues } from "lodash";
import { observer } from "mobx-react";
import React from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";

// const LOGIN_NEEDED =
//   "If checked, only logged in user will be able to see this page";

const MIN_ROLE_TOOLTIP =
  "Any user that has role lower than the selected one won't be able to see this page";

function PageMinRoleSection_({ page }: { page: Component }) {
  const studioCtx = useStudioCtx();
  const appId = studioCtx.siteInfo.id;
  const appCtx = studioCtx.appCtx;

  const pageMeta = ensure(page.pageMeta, "Page component without pageMeta");

  const { roles } = useAppRoles(appCtx, appId);

  if (!studioCtx.siteInfo.appAuthProvider) {
    return null;
  }

  function allDataOperationsInPage() {
    return findAllDataSourceOpExprForComponent(page);
  }

  function getOperationsToBeUpdated(
    operations: DataSourceOpExpr[],
    newRoleId: string
  ) {
    return operations.filter((op) => {
      if (newRoleId === "anon") {
        return !!op.roleId;
      }
      return op.roleId !== newRoleId;
    });
  }
  async function isAllowedToDowngrade(
    operations: DataSourceOpExpr[],
    rolesById: Dictionary<ApiAppRole>,
    newRoleId: string
  ) {
    const hasAnyDowngrade = operations.some((op) => {
      if (newRoleId === "anon") {
        if (op.roleId) {
          return true;
        } else {
          return false;
        }
      }
      if (!op.roleId) {
        return false;
      }
      const newRole = rolesById[newRoleId];
      const opRole = rolesById[op.roleId];
      return opRole.order > newRole.order;
    });

    if (hasAnyDowngrade) {
      const answer = await showTemporaryPrompt<"keep" | "downgrade">(
        (onSubmit, onCancel) => (
          <Modal
            title={"Downgrade minimum role to execute operations?"}
            visible={true}
            footer={null}
            onCancel={onCancel}
            closable={false}
            zIndex={zIndex.quickModal}
          >
            <Form onFinish={() => onSubmit("downgrade")}>
              <span>
                Some operations in the current page have higher minimum role
                than the new selected minimum role of the page. Do you want to
                downgrade them or keep the required role?
              </span>
              <Form.Item style={{ marginBottom: 0, marginTop: 28 }}>
                <Button
                  className="mr-sm"
                  type="backlitError"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button className="mr-sm" onClick={() => onSubmit("keep")}>
                  keep
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  onClick={() => onSubmit("downgrade")}
                  autoFocus
                >
                  Downgrade
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        )
      );

      if (!answer) {
        return {
          cancel: true,
        };
      }

      return {
        cancel: false,
        downgrade: answer === "downgrade",
      };
    } else {
      return {
        cancel: false,
        downgrade: true,
      };
    }
  }

  return (
    <SidebarSection style={{ paddingTop: 12 }}>
      <LabeledItemRow label="Role needed" tooltip={MIN_ROLE_TOOLTIP}>
        <AntSelect
          className="form-control textboxlike"
          style={{ width: "100%" }}
          suffixIcon={<Icon icon={TriangleBottomIcon} />}
          value={pageMeta.roleId ?? "anon"}
          onChange={async (newId) => {
            const allOperations = allDataOperationsInPage();
            const changingOperations = getOperationsToBeUpdated(
              allOperations,
              newId
            );
            const rolesById = keyBy(roles, "id");
            // Ask only about downgrades and perform upgrades automatically
            const userAnswer = await isAllowedToDowngrade(
              changingOperations,
              rolesById,
              newId
            );

            if (userAnswer.cancel) {
              return;
            }

            const canDowngrade = userAnswer.downgrade;

            const oldToNewOpId: Dictionary<string> = {};

            const upgradeOperations = changingOperations.filter((op) => {
              // if we will update to anon, there's no upgrade
              if (newId === "anon") {
                return false;
              }
              // if there is no roleId, it will be upgraded
              if (!op.roleId) {
                return true;
              }
              return rolesById[newId].order > rolesById[op.roleId].order;
            });

            const downgradeOperations = changingOperations.filter((op) => {
              // if we will update to anon, having something is a downgrade
              if (newId === "anon") {
                return !!op.roleId;
              }
              // if there is no roleId, it will be upgraded
              if (!op.roleId) {
                return false;
              }
              return rolesById[newId].order < rolesById[op.roleId].order;
            });

            const rawNewId = newId === "anon" ? undefined : newId;

            const toUpdateOperations = [
              ...upgradeOperations,
              ...(canDowngrade ? downgradeOperations : []),
            ];

            if (changingOperations.length > 0) {
              await studioCtx.app.withSpinner(
                (async function () {
                  await Promise.all(
                    toUpdateOperations.map(async (op) => {
                      const { opId: newOpId } =
                        await appCtx.api.getDataSourceOpId(
                          studioCtx.siteInfo.id,
                          op.sourceId,
                          {
                            name: op.opName,
                            templates: mapValues(op.templates, (v) =>
                              dataSourceTemplateToString(
                                mkDataSourceTemplate({
                                  fieldType: getTemplateFieldType(v),
                                  value: v.value,
                                  bindings: v.bindings,
                                }),
                                {
                                  projectFlags: studioCtx.projectFlags(),
                                  component: page,
                                  inStudio: true,
                                }
                              )
                            ),
                            roleId: rawNewId,
                          }
                        );
                      oldToNewOpId[op.opId] = newOpId;
                    })
                  );
                })()
              );
            }

            await studioCtx.change(({ success }) => {
              pageMeta.roleId = rawNewId;

              toUpdateOperations.forEach((op) => {
                op.roleId = rawNewId;
                op.opId = oldToNewOpId[op.opId] ?? op.opId;
              });
              return success();
            });

            if (upgradeOperations.length > 0) {
              notification.warn({
                message:
                  "Data source operations have been upgraded to match the new page minimum role.",
              });
            }
          }}
        >
          {roles.map((role) => (
            <AntSelect.Option value={role.id} key={role.id}>
              {role.name}
            </AntSelect.Option>
          ))}
          <AntSelect.Option value="anon" key="anon">
            Anonymous
          </AntSelect.Option>
        </AntSelect>
      </LabeledItemRow>
    </SidebarSection>
  );
}

export const PageMinRoleSection = ifDevFlag(
  "appAuth",
  observer(PageMinRoleSection_)
);
