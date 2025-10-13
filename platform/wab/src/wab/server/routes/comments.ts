import { toOpaque } from "@/wab/commons/types";
import { commitTransaction, getUser, startTransaction, userDbMgr } from "@/wab/server/routes/util";
import { getUniqueUsersWithCommentAccess } from "@/wab/server/scripts/send-comments-notifications";
import { broadcastProjectsMessage } from "@/wab/server/socket-util";
import {
  AddCommentReactionRequest,
  ApiNotificationSettings,
  CommentId,
  CommentThreadId,
  EditCommentRequest,
  GetCommentsResponse,
  PostCommentResponse,
  ResolveThreadRequest,
  RootCommentData,
  ThreadCommentData,
} from "@/wab/shared/ApiSchema";
import { parseProjectBranchId } from "@/wab/shared/ApiSchemaUtil";
import { ensureType, uncheckedCast, withoutNils } from "@/wab/shared/common";
import express from "express";
import { Request, Response } from "express-serve-static-core";
import { uniq } from "lodash";

export function addCommentsRoutes(app: express.Application) {
  app.get("/api/v1/comments/:projectBranchId", getCommentsForProject);
  app.post("/api/v1/comments/:projectBranchId", postRootCommentInProject);
  app.post("/api/v1/comments/:projectBranchId/thread/:threadId", postCommentInThread);
  app.put("/api/v1/comments/:projectBranchId/comment/:commentId", editComment);
  app.put("/api/v1/comments/:projectBranchId/thread/:commentThreadId", editThread);
  app.delete("/api/v1/comments/:projectBranchId/comment/:commentId", deleteCommentInProject);
  app.delete("/api/v1/comments/:projectBranchId/thread/:threadId", deleteThreadInProject);
  app.post("/api/v1/comments/:projectBranchId/comment/:commentId/reactions", addReactionToComment);
  app.delete("/api/v1/comments/:projectBranchId/reactions/:reactionId", removeReactionFromComment);
  app.put("/api/v1/comments/:projectBranchId/notification-settings", updateNotificationSettings);
}

async function getCommentsForProject(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);

  const threads = await mgr.getThreadsForProject({ projectId, branchId });
  const reactions = await mgr.getReactionsForComments(threads);
  const selfNotificationSettings = req.user
    ? await mgr.tryGetNotificationSettings(req.user.id, toOpaque(projectId))
    : undefined;

  const permissions = await mgr.getPermissionsForProject(projectId);
  const projectUsers = getUniqueUsersWithCommentAccess(permissions);
  const usersIds = uniq(
    withoutNils([
      ...threads.map((c) => c.createdById),
      ...reactions.map((r) => r.createdById),
    ])
  );
  const commentUsers = await mgr.getUsersById(usersIds);
  const users = uniq(withoutNils([...commentUsers, ...projectUsers]));

  res.json(
    ensureType<GetCommentsResponse>({
      threads,
      reactions,
      selfNotificationSettings,
      users,
    })
  );
}

async function postRootCommentInProject(req: Request, res: Response) {
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    const { commentId, commentThreadId, location, body } =
      uncheckedCast<RootCommentData>(req.body);
    await mgr.postRootCommentInProject(
      { projectId, branchId },
      {
        commentId,
        commentThreadId,
        location,
        body,
      }
    );

    return commitTransaction();
  });

  res.json(ensureType<PostCommentResponse>({}));

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function postCommentInThread(req: Request, res: Response) {
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );
  const threadId = req.params.threadId as CommentThreadId;

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    const { id, body } = uncheckedCast<ThreadCommentData>(req.body);
    await mgr.postCommentInThread(
      { projectId, branchId },
      {
        id,
        threadId,
        body,
      }
    );

    return commitTransaction();
  });

  res.json(ensureType<PostCommentResponse>({}));

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function deleteCommentInProject(req: Request, res: Response) {
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );
  const commentId = req.params.commentId as CommentId;

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    await mgr.deleteCommentInProject({ projectId, branchId }, commentId);

    return commitTransaction();
  });

  res.json({});

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function deleteThreadInProject(req: Request, res: Response) {
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );
  const threadId = req.params.threadId as CommentThreadId;

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    await mgr.deleteThreadInProject({ projectId, branchId }, threadId);

    return commitTransaction();
  });

  res.json({});

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function addReactionToComment(req: Request, res: Response) {
  const { projectId } = parseProjectBranchId(req.params.projectBranchId);
  const { data, id } = uncheckedCast<AddCommentReactionRequest>(req.body);

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    await mgr.addCommentReaction(id, toOpaque(req.params.commentId), data);

    return commitTransaction();
  });

  res.json({});

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function removeReactionFromComment(req: Request, res: Response) {
  const { projectId } = parseProjectBranchId(req.params.projectBranchId);

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    await mgr.removeCommentReaction(toOpaque(req.params.reactionId));

    return commitTransaction();
  });

  res.json({});

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function editComment(req: Request, res: Response) {
  const { projectId } = parseProjectBranchId(req.params.projectBranchId);
  const commentId = req.params.commentId as CommentId;
  const { body } = uncheckedCast<EditCommentRequest>(req.body);

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    await mgr.editCommentInProject(commentId, body);

    return commitTransaction();
  });

  res.json({});

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function editThread(req: Request, res: Response) {
  const { projectId } = parseProjectBranchId(req.params.projectBranchId);
  const commentThreadId = req.params.commentThreadId as CommentThreadId;
  const { resolved, id } = uncheckedCast<ResolveThreadRequest>(req.body);

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    await mgr.resolveThreadInProject(id, commentThreadId, resolved);

    return commitTransaction();
  });

  res.json({});

  await broadcastProjectsMessage({
    room: `projects/${projectId}`,
    type: "commentsUpdate",
    message: {},
  });
}

async function updateNotificationSettings(req: Request, res: Response) {
  const { projectId } = parseProjectBranchId(
    req.params.projectBranchId
  );
  const settings: ApiNotificationSettings = req.body;

  await startTransaction(req, async () => {
    const mgr = userDbMgr(req);

    // Ensure the user has access to the project
    await mgr.getProjectById(projectId);

    await mgr.updateNotificationSettings(
      getUser(req).id,
      toOpaque(projectId),
      settings
    );

    return commitTransaction();
  });

  res.json({});
}
