import { toOpaque } from "@/wab/commons/types";
import { getUser, userDbMgr, withNext } from "@/wab/server/routes/util";
import { broadcastToStudioRoom } from "@/wab/server/socket-util";
import {
  AddCommentReactionRequest,
  ApiNotificationSettings,
  CommentId,
  CommentThreadId,
  EditCommentRequest,
  GetCommentsResponse,
  PostCommentRequest,
  PostCommentResponse,
  StudioRoomMessageTypes,
} from "@/wab/shared/ApiSchema";
import { parseProjectBranchId } from "@/wab/shared/ApiSchemaUtil";
import { ensureType, uncheckedCast, withoutNils } from "@/wab/shared/common";
import express from "express";
import { Request, Response } from "express-serve-static-core";
import { uniq } from "lodash";

export function addCommentsRoutes(app: express.Application) {
  app.get("/api/v1/comments/:projectBranchId", withNext(getCommentsForProject));
  app.post("/api/v1/comments/:projectBranchId", withNext(postCommentInProject));
  app.put(
    "/api/v1/comments/:projectBranchId/comment/:commentId",
    withNext(editComment)
  );
  app.delete(
    "/api/v1/comments/:projectBranchId/comment/:commentId",
    withNext(deleteCommentInProject)
  );
  app.delete(
    "/api/v1/comments/:projectBranchId/thread/:threadId",
    withNext(deleteThreadInProject)
  );
  app.post(
    "/api/v1/comments/:projectBranchId/comment/:commentId/reactions",
    withNext(addReactionToComment)
  );
  app.delete(
    "/api/v1/comments/:projectBranchId/reactions/:reactionId",
    withNext(removeReactionFromComment)
  );
  app.put(
    "/api/v1/comments/:projectBranchId/notification-settings",
    withNext(updateNotificationSettings)
  );
}

async function getCommentsForProject(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);

  const comments = await mgr.getCommentsForProject({ projectId, branchId });
  const reactions = await mgr.getReactionsForComments(comments);
  const selfNotificationSettings = req.user
    ? await mgr.tryGetNotificationSettings(req.user.id, toOpaque(projectId))
    : undefined;
  const usersIds = uniq(
    withoutNils([
      ...comments.map((c) => c.createdById),
      ...reactions.map((r) => r.createdById),
    ])
  );
  const users = await mgr.getUsersById(usersIds);

  res.json(
    ensureType<GetCommentsResponse>({
      comments,
      reactions,
      selfNotificationSettings,
      users,
    })
  );
}

async function postCommentInProject(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);

  const { location, body, threadId } = uncheckedCast<PostCommentRequest>(
    req.body
  );
  await mgr.postCommentInProject(
    { projectId, branchId },
    {
      location,
      body,
      threadId,
    }
  );

  res.json(ensureType<PostCommentResponse>({}));

  await broadcastToStudioRoom(
    req,
    projectId,
    StudioRoomMessageTypes.commentsUpdate
  );
}

async function deleteCommentInProject(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);

  const commentId = req.params.commentId as CommentId;
  await mgr.deleteCommentInProject({ projectId, branchId }, commentId);

  res.json({});

  await broadcastToStudioRoom(
    req,
    projectId,
    StudioRoomMessageTypes.commentsUpdate
  );
}

async function deleteThreadInProject(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);

  const threadId = req.params.threadId as CommentThreadId;
  await mgr.deleteThreadInProject({ projectId, branchId }, threadId);

  res.json({});

  await broadcastToStudioRoom(
    req,
    projectId,
    StudioRoomMessageTypes.commentsUpdate
  );
}

async function addReactionToComment(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);
  const { data } = uncheckedCast<AddCommentReactionRequest>(req.body);

  await mgr.addCommentReaction(toOpaque(req.params.commentId), data);
  res.json({});

  await broadcastToStudioRoom(
    req,
    projectId,
    StudioRoomMessageTypes.commentsUpdate
  );
}

async function removeReactionFromComment(req: Request, res: Response) {
  const mgr = userDbMgr(req);

  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);

  await mgr.removeCommentReaction(toOpaque(req.params.reactionId));
  res.json({});

  await broadcastToStudioRoom(
    req,
    projectId,
    StudioRoomMessageTypes.commentsUpdate
  );
}

async function editComment(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);
  const commentId = req.params.commentId as CommentId;

  const { body, resolved } = uncheckedCast<EditCommentRequest>(req.body);
  await mgr.editCommentInProject(commentId, {
    body,
    resolved,
  });

  res.json({});

  await broadcastToStudioRoom(
    req,
    projectId,
    StudioRoomMessageTypes.commentsUpdate
  );
}

async function updateNotificationSettings(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId, branchId } = parseProjectBranchId(
    req.params.projectBranchId
  );

  // Ensure the user has access to the project
  await mgr.getProjectById(projectId);

  const settings: ApiNotificationSettings = req.body;
  await mgr.updateNotificationSettings(
    getUser(req).id,
    toOpaque(projectId),
    settings
  );
  res.json({});
}
