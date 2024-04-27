import { AppCtx } from "@/wab/client/app-ctx";
import {
  useAppAccessRules,
  useAppAuthConfig,
  useAppRoles,
  useMutateHostAppAuthData,
} from "@/wab/client/components/app-auth/app-auth-contexts";
import InlineEditableResource from "@/wab/client/components/app-auth/InlineEditableResource";
import { ListBox, ListBoxItem } from "@/wab/client/components/widgets";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { arrayMoveIndex } from "@/wab/collections";
import { ApiProject } from "@/wab/shared/ApiSchema";
import * as tokens from "@/wab/styles/_tokens";
import { Menu, notification } from "antd";
import React from "react";

interface RolesControlProps {
  appCtx: AppCtx;
  project: ApiProject;
}

export function RolesControl({ appCtx, project }: RolesControlProps) {
  const { hostFrameApi } = useTopFrameCtx();
  const { roles, mutate: mutateRoles } = useAppRoles(appCtx, project.id);
  const mutateHostAppAuthData = useMutateHostAppAuthData(project.id);
  const { accesses } = useAppAccessRules(appCtx, project.id);
  const { config: appAuthConfig } = useAppAuthConfig(appCtx, project.id);
  return (
    <div className="flex fill-width">
      <ListBox
        appendPrepend="append"
        onReorder={async (from, to) => {
          const reordered = arrayMoveIndex(roles, from, to);
          const newOrders = reordered
            .filter((r) => !r.isFake)
            .reduce(
              (acc, r, i) => ({
                ...acc,
                // The order is reversed since we have the elements from highest to lowest
                // there is no -1 because the anonymous role should always mantain the lowest order = 0
                [r.id]: reordered.length - i,
              }),
              {}
            );
          await mutateRoles(
            async () => {
              await appCtx.api.changeAppRolesOrder(project.id, newOrders);
              return await appCtx.api.listAppRoles(project.id);
            },
            {
              optimisticData: reordered,
            }
          );

          await mutateHostAppAuthData();
        }}
      >
        {roles.map((role, i) => (
          <div
            key={role.id}
            className="fill-width"
            style={{
              paddingLeft: 12,
              borderBottom: `1px solid ${tokens.sand6}`,
            }}
          >
            <ListBoxItem
              key={role.id}
              index={i}
              showGrip={!role.isFake}
              showDelete={false}
              menu={
                <Menu>
                  <Menu.Item
                    onClick={async () => {
                      await navigator.clipboard.writeText(role.id);
                      notification.success({
                        message: `Role ID copied to clipboard`,
                      });
                    }}
                  >
                    Copy role ID
                  </Menu.Item>
                  {!role.isFake && (
                    <Menu.Item
                      onClick={async () => {
                        if (appAuthConfig?.registeredRoleId === role.id) {
                          notification.error({
                            message: `Role "${role.name}" is currently used as the general access role`,
                          });
                          return;
                        }

                        const usedInComponents = (
                          await hostFrameApi.getUsedRolesInProject()
                        ).filter(
                          (componentRole) => componentRole.roleId === role.id
                        );

                        if (usedInComponents.length > 0) {
                          notification.error({
                            message: `Role "${
                              role.name
                            }" is currently being used in components: ${usedInComponents
                              .map((r) => r.component)
                              .join(", ")}`,
                          });
                          return;
                        }

                        const usedInAccesses = accesses.filter(
                          (access) => access.roleId === role.id
                        );

                        if (usedInAccesses.length > 0) {
                          notification.error({
                            message: `Role "${role.name}" is currently being used in the access list`,
                          });
                          return;
                        }

                        if (roles.length === 1) {
                          notification.error({
                            message: `An app must have at least one role`,
                          });
                          return;
                        }

                        await mutateRoles(
                          async () => {
                            await appCtx.api.deleteAppRole(project.id, role.id);
                            return await appCtx.api.listAppRoles(project.id);
                          },
                          {
                            optimisticData: roles.filter(
                              (r) => r.id !== role.id
                            ),
                          }
                        );

                        await mutateHostAppAuthData();
                      }}
                    >
                      Delete
                    </Menu.Item>
                  )}
                </Menu>
              }
              mainContent={
                <div className="flex fill-width flex-vcenter justify-between">
                  <InlineEditableResource
                    isFake={role.isFake}
                    visibleValue={
                      <span style={{ fontSize: 12 }}>
                        {role.name +
                          (i === 0
                            ? " (highest)"
                            : i === roles.length - 1
                            ? " (lowest)"
                            : "")}
                      </span>
                    }
                    value={role.name}
                    onChange={async (val) => {
                      await mutateRoles(
                        async () => {
                          await appCtx.api.updateAppRoleName(
                            project.id,
                            role.id,
                            val
                          );
                          return await appCtx.api.listAppRoles(project.id);
                        },
                        {
                          optimisticData: roles.map((r) => {
                            if (r.id === role.id) {
                              return { ...r, name: val };
                            }
                            return r;
                          }),
                        }
                      );

                      await mutateHostAppAuthData();
                    }}
                  />
                </div>
              }
            />
          </div>
        ))}
      </ListBox>
    </div>
  );
}
