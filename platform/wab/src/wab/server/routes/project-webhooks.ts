import { ensureType } from "@/wab/shared/common";
import { userDbMgr } from "@/wab/server/routes/util";
import { triggerWebhook } from "@/wab/server/trigger-webhooks";
import {
  ApiProjectWebhook,
  ApiProjectWebhookEvent,
  apiProjectWebhookFields,
  ProjectWebhookEventsResponse,
} from "@/wab/shared/ApiSchema";
import { Request, Response } from "express-serve-static-core";
import _ from "lodash";

export async function triggerProjectWebhook(req: Request, res: Response) {
  const { projectId } = req.params;
  const mgr = userDbMgr(req);
  await mgr.checkProjectPerms(projectId, "content", "trigger webhook");

  const webhook = {
    method: req.body.method,
    url: req.body.url,
    headers: req.body.headers,
    payload: req.body.payload,
  };

  const event = ensureType<ApiProjectWebhookEvent>(
    await triggerWebhook(mgr, projectId, webhook)
  );
  res.json({ event });
}

export async function getProjectWebhooks(req: Request, res: Response) {
  const { projectId } = req.params;
  const mgr = userDbMgr(req);
  const webhooks = await mgr.listProjectWebhooks(projectId);
  res.json({
    webhooks: ensureType<ApiProjectWebhook[]>(
      webhooks.map((w) => _.pick(w, apiProjectWebhookFields))
    ),
  });
}

export async function createProjectWebhook(req: Request, res: Response) {
  const { projectId } = req.params;
  const { url, method, headers, payload } = req.body ?? {};
  const mgr = userDbMgr(req);
  const webhook = await mgr.createProjectWebhook({
    projectId,
    method: method ?? "GET",
    url: url ?? "",
    headers: headers ?? [],
    payload: payload ?? "",
  });
  res.json({
    webhook: ensureType<ApiProjectWebhook>(
      _.pick(webhook, apiProjectWebhookFields)
    ),
  });
}

export async function updateProjectWebhook(req: Request, res: Response) {
  const { webhookId } = req.params;
  const { url, method, headers, payload } = req.body;
  const mgr = userDbMgr(req);
  const webhook = await mgr.updateProjectWebhook({
    id: webhookId,
    url,
    method,
    headers,
    payload,
  });
  res.json({
    webhook: ensureType<ApiProjectWebhook>(
      _.pick(webhook, apiProjectWebhookFields)
    ),
  });
}

export async function deleteProjectWebhook(req: Request, res: Response) {
  const { webhookId } = req.params;
  const mgr = userDbMgr(req);
  await mgr.permanentlyDeleteProjectWebhook(webhookId);
  res.json({});
}

export async function getProjectWebhookEvents(req: Request, res: Response) {
  const { projectId } = req.params;
  const mgr = userDbMgr(req);
  const events = await mgr.listLastProjectWebhookEvents(projectId, 10);
  res.json(ensureType<ProjectWebhookEventsResponse>({ events }));
}
