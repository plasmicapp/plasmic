import {
  executeDataSourceOperation,
  getDataSourceOperation,
  getOperationCurrentUserUsage,
} from "@/wab/server/data-sources/data-source-utils";
import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  extractAppUserFromToken,
  trackAppUserActivity,
} from "@/wab/server/routes/app-oauth";
import {
  buildFakeCurrentUser,
  canCurrentUserExecuteOperation,
  checkPermissionToPerformOperationAsUser,
  getAppUserInfo,
} from "@/wab/server/routes/end-user";
import { superDbMgr, userDbMgr } from "@/wab/server/routes/util";
import { asyncTimed } from "@/wab/server/timing-util";
import { withSpan } from "@/wab/server/util/apm-util";
import { GenericDataSource } from "@/wab/shared/data-sources-meta/data-source-registry";
import { OperationTemplate } from "@/wab/shared/data-sources-meta/data-sources";
import { Request, Response } from "express-serve-static-core";
import { isString } from "lodash";

export function executeDataSourceOperationWithCurrentUserHandler(
  inStudioAuth: boolean
) {
  const getCurrentUserInfo = asyncTimed(
    "getCurrentUserInfo",
    async function getCurrentUserInfo(
      req: Request,
      mgr: DbMgr,
      op: OperationTemplate
    ): Promise<
      | {
          appUser: Awaited<ReturnType<typeof getAppUserInfo>>;
          appId: string;
          appUserEmail?: string;
          appUserExternalId?: string;
          appRoleId?: string;
          isAuthorized: boolean;
        }
      | {
          error: string;
        }
    > {
      const userInfo = inStudioAuth
        ? await (async () => {
            const { appId, userEmail } = req.body;
            const endUser = userEmail
              ? await mgr.getEndUserByIdentifier(
                  {
                    email: userEmail,
                  },
                  appId,
                  {
                    // It will be considered that to be able to execute an operation in studio,
                    // the user must have access to the app. Which is later checked by the
                    // canCurrentUserExecuteOperation function. This way it won't require the
                    // user to have access to the directory/team to perform the operation.
                    skipDirectoryPermsCheck: true,
                  }
                )
              : undefined;
            return {
              appId,
              endUserId: endUser?.id,
            };
          })()
        : extractAppUserFromToken(req, true);

      const authUsage = getOperationCurrentUserUsage(op);
      if (!authUsage.usesAuth && !authUsage.usesCurrentUser) {
        return {
          appUser: {},
          appId: userInfo.appId,
          isAuthorized: true,
        };
      }

      if (!inStudioAuth) {
        const appUser = await getAppUserInfo(
          req.con,
          mgr,
          userInfo,
          authUsage.usesCurrentUserCustomProperties
        );
        const isAuthorized = await canCurrentUserExecuteOperation(
          mgr,
          userInfo.appId,
          appUser,
          op
        );

        if (userInfo.appId && userInfo.endUserId && "email" in appUser) {
          trackAppUserActivity(
            req,
            userInfo.appId,
            userInfo.endUserId,
            "data-operation"
          );
        }

        return {
          appId: userInfo.appId,
          appUser,
          appUserEmail: "email" in appUser ? appUser.email : undefined,
          appUserExternalId:
            "externalId" in appUser ? appUser.externalId : undefined,
          appRoleId: "roleId" in appUser ? appUser.roleId : undefined,
          isAuthorized,
        };
      } else {
        // In studio, we allow user to perform operations as user
        const { identifier: reqIdentifier } = req.body;
        const identifier = {
          ...(reqIdentifier?.email && isString(reqIdentifier.email)
            ? { email: reqIdentifier.email }
            : {}),
          ...(reqIdentifier?.externalId && isString(reqIdentifier.externalId)
            ? { externalId: reqIdentifier.externalId }
            : {}),
        };
        if (identifier.email || identifier.externalId) {
          const isAbleToExecuteAs =
            await checkPermissionToPerformOperationAsUser(
              req,
              mgr,
              userInfo.appId,
              identifier
            );

          if (!isAbleToExecuteAs) {
            return {
              error: "Not authorized",
            };
          }

          const appUser = await buildFakeCurrentUser(
            req.con,
            mgr,
            userInfo.appId,
            identifier,
            authUsage.usesCurrentUserCustomProperties
          );
          const isAuthorized = await canCurrentUserExecuteOperation(
            mgr,
            userInfo.appId,
            appUser,
            op
          );
          return {
            appId: userInfo.appId,
            appUser,
            appUserEmail: "email" in appUser ? appUser.email : undefined,
            appUserExternalId:
              "externalId" in appUser ? appUser.externalId : undefined,
            appRoleId: "roleId" in appUser ? appUser.roleId : undefined,
            isAuthorized,
          };
        } else {
          return {
            appId: userInfo.appId,
            appUser: {},
            appUserEmail: "Anonymous",
            isAuthorized: await canCurrentUserExecuteOperation(
              mgr,
              userInfo.appId,
              {},
              op
            ),
          };
        }
      }
    }
  );

  return async function (req: Request, res: Response) {
    const dataSourceId = req.params.dataSourceId;
    const superMgr = superDbMgr(req);
    const reqMgr = inStudioAuth ? userDbMgr(req) : superMgr;
    const dataSource = await reqMgr.getDataSourceById(dataSourceId, {
      skipPermissionCheck: !inStudioAuth,
    });

    const opString = req.body.opId as string;
    const op = await getDataSourceOperation(reqMgr, dataSourceId, opString);

    res.header("Access-Control-Allow-Origin", "*");

    const currentUserInfo = await getCurrentUserInfo(req, reqMgr, op);

    if ("error" in currentUserInfo) {
      res.status(400).json({
        error: currentUserInfo.error,
      });
      return;
    }

    if (!currentUserInfo.isAuthorized) {
      console.error(
        `App: ${currentUserInfo.appId} (User: ${currentUserInfo.appUserEmail}) (ExtId: ${currentUserInfo.appUserExternalId}) (RoleId: ${currentUserInfo.appRoleId}) is not authorized to perform operation requiring (RoleId: ${op.roleId})`
      );
      res.status(401).json({
        error: "Not authorized",
      });
      return;
    }

    const currentUser = currentUserInfo.appUser;

    const userArgs = req.body.userArgs ?? undefined;
    await req.resolveTransaction();
    const data = await withSpan(
      "execute-data-op",
      asyncTimed(`executeDataSourceOperation`, () =>
        executeDataSourceOperation(
          req.con,
          dataSource as GenericDataSource,
          op,
          userArgs,
          {
            paginate: req.body.paginate,
          },
          currentUser,
          false
        )
      ),
      `ExecuteDataOp ${dataSourceId} (${dataSource.source} - "${
        dataSource.name
      }") op:${opString} args:${JSON.stringify(userArgs)}`
    );

    res.json(data);
  };
}

export const executeDataSourceOperationHandler =
  executeDataSourceOperationWithCurrentUserHandler(false);

export const executeDataSourceOperationHandlerInStudio =
  executeDataSourceOperationWithCurrentUserHandler(true);
