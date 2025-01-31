import { toOpaque } from "@/wab/commons/types";
import { Config } from "@/wab/server/config";
import { getDefaultConnection } from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { createMailer } from "@/wab/server/emails/Mailer";
import { sendUserNotificationEmail } from "@/wab/server/emails/comment-notification-email";
import {
  Comment,
  CommentThread,
  Permission,
  Project,
  User,
} from "@/wab/server/entities/Entities";
import { logError } from "@/wab/server/server-util";
import { ApiNotificationSettings } from "@/wab/shared/ApiSchema";
import { withoutNils } from "@/wab/shared/common";
import { groupBy, uniqBy } from "lodash";

const COMMENTS_NOTIFICATION_LOCK = "comments_notification_lock";

export interface UserComment {
  body: string;
  author?: string;
}

export interface ProjectThreads {
  projectName: string;
  threads: Map<string, UserComment[]>;
}

interface UserProjects {
  userEmail: string;
  projects: Map<string, ProjectThreads>;
}

type UserProjectRecord = Map<string, UserProjects>;

/**
 * Processes notifications for users based on recent comments in projects.
 */

export async function processUnnotifiedCommentsNotifications(
  dbManager: DbMgr
): Promise<{
  notificationsByUser: UserProjectRecord;
  recentCommentThreads: string[];
}> {
  const recentCommentThreads = await dbManager.getUnnotifiedCommentThreads();
  const commentThreadsByProject = groupBy(recentCommentThreads, "projectId");
  const notificationsByUser: UserProjectRecord = new Map();

  await Promise.all(
    Object.entries(commentThreadsByProject).map(([projectId, commentThreads]) =>
      processCommentsForProject(
        dbManager,
        projectId,
        commentThreads,
        notificationsByUser
      )
    )
  );

  return {
    notificationsByUser,
    recentCommentThreads: recentCommentThreads.map(
      (commentThread) => commentThread.id
    ),
  };
}

async function processCommentsForProject(
  dbManager: DbMgr,
  projectId: string,
  commentThreads: CommentThread[],
  notificationsByUser: UserProjectRecord
) {
  const permissions = await dbManager.getPermissionsForProject(projectId);
  const projectUsers = getUniqueUsersFromPermissions(permissions);
  const project = await dbManager.getProjectById(projectId);

  await Promise.all(
    projectUsers.map((user: User) =>
      processUserForProject(
        dbManager,
        user,
        projectId,
        commentThreads,
        project,
        notificationsByUser
      )
    )
  );
}

async function processUserForProject(
  dbManager: DbMgr,
  user: User,
  projectId: string,
  commentThreads: CommentThread[],
  project: Project,
  notificationsByUser: UserProjectRecord
) {
  const notificationSettings: ApiNotificationSettings =
    (await dbManager.tryGetNotificationSettings(
      user.id,
      toOpaque(projectId)
    )) || {
      notifyAbout: "mentions-and-replies",
    };

  if (notificationSettings.notifyAbout === "none") {
    return;
  }

  const filteredCommentThreads = filterOutUserCommentThreads(
    user,
    commentThreads
  );

  await Promise.all(
    filteredCommentThreads.map((commentThread) =>
      processThreadForUser(
        dbManager,
        commentThread.id,
        commentThread.comments,
        user,
        projectId,
        project,
        notificationsByUser,
        notificationSettings
      )
    )
  );
}

async function processThreadForUser(
  dbManager: DbMgr,
  threadId: string,
  threadComments: Comment[],
  user: User,
  projectId: string,
  project: Project,
  notificationsByUser: UserProjectRecord,
  notificationSettings: ApiNotificationSettings
) {
  const completeThreadComments = await dbManager.getCommentsForThread(
    toOpaque(threadId)
  );

  await Promise.all(
    threadComments.map((comment) =>
      processCommentForUser(
        comment,
        completeThreadComments,
        user,
        projectId,
        project,
        notificationsByUser,
        notificationSettings
      )
    )
  );
}

async function processCommentForUser(
  comment: Comment,
  completeThreadComments: Comment[],
  user: User,
  projectId: string,
  project: Project,
  notificationsByUser: UserProjectRecord,
  notificationSettings: ApiNotificationSettings
) {
  const isReply =
    completeThreadComments.findIndex(
      (threadComment) => comment.id === threadComment.id
    ) > 0;

  const userParticipatedBefore = completeThreadComments.some(
    (tc) => tc.createdById === user.id && tc.createdAt < comment.createdAt
  );

  const notify = shouldNotify(
    notificationSettings.notifyAbout,
    isReply,
    userParticipatedBefore
  );

  if (!notify) {
    return;
  }

  updateNotificationsByUser(
    notificationsByUser,
    user,
    projectId,
    project,
    comment,
    completeThreadComments
  );
}

function filterOutUserCommentThreads(
  user: User,
  commentThreads: CommentThread[]
): CommentThread[] {
  return commentThreads
    .map((commentThread) => {
      // Create a new CommentThread instance with filtered comments
      const filteredThread = new CommentThread();
      Object.assign(filteredThread, {
        ...commentThread,
        comments: commentThread.comments.filter(
          (comment) => comment.createdById !== user.id
        ),
      });
      return filteredThread;
    })
    .filter((commentThread) => commentThread.comments.length > 0);
}

// Function to update the notificationsByUser structure
function updateNotificationsByUser(
  notificationsByUser: UserProjectRecord,
  user: User,
  projectId: string,
  project: Project,
  comment: Comment,
  completeThreadComments: Comment[]
) {
  const { commentThreadId } = comment;
  if (!notificationsByUser.has(user.id)) {
    notificationsByUser.set(user.id, {
      userEmail: user.email,
      projects: new Map(),
    });
  }

  const userProjects = notificationsByUser.get(user.id)!;

  if (!userProjects.projects.has(projectId)) {
    userProjects.projects.set(projectId, {
      projectName: project.name,
      threads: new Map(),
    });
  }

  const projectThreads = userProjects.projects.get(projectId)!.threads;

  if (!projectThreads.has(commentThreadId)) {
    const commentNotification = getNotificationComment(
      completeThreadComments[0]
    );
    // always add root comment
    projectThreads.set(commentThreadId, [commentNotification]);
  }

  // Add the current comment only if it's not the root comment
  if (completeThreadComments[0].id !== comment.id) {
    const commentNotification = getNotificationComment(comment);
    projectThreads.get(commentThreadId)!.push(commentNotification);
  }
}

export function getNotificationComment(comment: Comment) {
  const { createdBy, body } = comment;
  return {
    author: `${createdBy?.firstName} ${createdBy?.lastName}`.trim(),
    body,
  };
}

function getUniqueUsersFromPermissions(permissions: Permission[]) {
  const users = withoutNils(permissions.map((permission) => permission.user));
  return uniqBy(users, (user) => user.id);
}

/**
 * Sends notification emails about new comments.
 */
export async function sendCommentsNotificationEmails(config: Config) {
  try {
    const mailer = createMailer();
    const connection = await getDefaultConnection();
    await connection.transaction(async (entityManager) => {
      const dbManager = new DbMgr(entityManager, SUPER_USER);

      await dbManager.waitLockTransactionResource(COMMENTS_NOTIFICATION_LOCK);

      const { notificationsByUser, recentCommentThreads } =
        await processUnnotifiedCommentsNotifications(dbManager);

      await Promise.all(
        Array.from(notificationsByUser).map(
          async ([_userId, { userEmail, projects }]) => {
            await sendUserNotificationEmail(
              mailer,
              userEmail,
              projects,
              config.host,
              config.mailFrom,
              config.mailBcc
            );
          }
        )
      );

      await dbManager.markCommentsAsNotified(recentCommentThreads);
    });
  } catch (err) {
    logError(err, "Failed to send comment notification emails");
  }
}

/**
 * Determines whether a notification should be sent based on the user's settings.
 */
function shouldNotify(
  notifyAbout: "all" | "mentions-and-replies" | "none",
  isReply: boolean,
  userParticipated: boolean
): boolean {
  if (notifyAbout === "all" && !isReply) {
    return true;
  }
  if (
    ["mentions-and-replies", "all"].includes(notifyAbout) &&
    isReply &&
    userParticipated
  ) {
    return true;
  }
  return false;
}
