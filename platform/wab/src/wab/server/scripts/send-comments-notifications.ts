import { toOpaque } from "@/wab/commons/types";
import { Config } from "@/wab/server/config";
import { getDefaultConnection } from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { createMailer } from "@/wab/server/emails/Mailer";
import { sendUserNotificationEmail } from "@/wab/server/emails/comment-notification-email";
import {
  Comment,
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
  recentComments: string[];
}> {
  const recentComments = await dbManager.getUnnotifiedComments();
  const commentsByProject = groupBy(recentComments, "projectId");
  const notificationsByUser: UserProjectRecord = new Map();

  await Promise.all(
    Object.entries(commentsByProject).map(([projectId, comments]) =>
      processCommentsForProject(
        dbManager,
        projectId,
        comments,
        notificationsByUser
      )
    )
  );

  return {
    notificationsByUser,
    recentComments: recentComments.map((comment) => comment.id),
  };
}

async function processCommentsForProject(
  dbManager: DbMgr,
  projectId: string,
  comments: Comment[],
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
        comments,
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
  comments: Comment[],
  project: Project,
  notificationsByUser: UserProjectRecord
) {
  const notificationSettings = await dbManager.tryGetNotificationSettings(
    user.id,
    toOpaque(projectId)
  );

  if (!notificationSettings) {
    return;
  }

  const filteredComments = filterOutUserComments(user, comments);
  const commentsByThread = groupBy(filteredComments, "threadId");

  await Promise.all(
    Object.entries(commentsByThread).map(([threadId, threadComments]) =>
      processThreadForUser(
        dbManager,
        threadId,
        threadComments,
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

function filterOutUserComments(user: User, comments: Comment[]): Comment[] {
  return comments.filter((comment) => comment.createdById !== user.id);
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
  const { threadId } = comment;
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

  if (!projectThreads.has(threadId)) {
    // always add root comment
    projectThreads.set(threadId, [
      getNotificationComment(completeThreadComments[0]),
    ]);
  }

  // Add the current comment only if it's not the root comment
  if (completeThreadComments[0].id !== comment.id) {
    projectThreads.get(threadId)!.push(getNotificationComment(comment));
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

      const { notificationsByUser, recentComments } =
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

      await dbManager.markCommentsAsNotified(recentComments);
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
