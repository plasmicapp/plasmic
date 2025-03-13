import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  Entry,
  Notification,
} from "@/wab/server/emails/comment-notification-email";
import { Permission, Project, User } from "@/wab/server/entities/Entities";
import { withDb } from "@/wab/server/test/backend-util";
import { CommentThreadId } from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { withoutNils } from "@/wab/shared/common";
import { Connection } from "typeorm";

async function setupNotifications(
  mgr: DbMgr,
  userMgrs: (() => DbMgr)[],
  users: User[],
  project: Project
) {
  // Add users to project
  await userMgrs[0]().grantProjectPermissionByEmail(
    project.id,
    users[1].email,
    "editor"
  );
  await userMgrs[0]().grantProjectPermissionByEmail(
    project.id,
    users[2].email,
    "editor"
  );
}

function getUniqueUsersWithCommentAccess(permissions: Permission[]): User[] {
  const users = withoutNils(
    permissions
      .filter(
        (p) => accessLevelRank(p.accessLevel) >= accessLevelRank("commenter")
      )
      .map((permission) => permission.user)
  );
  return [...new Map(users.map((user) => [user.id, user])).values()];
}

export async function withEndUserNotificationSetup(
  f: (args: {
    sudo: DbMgr;
    dbCon: Connection;
    users: User[];
    project: Project;
    userDbs: (() => DbMgr)[];
  }) => Promise<void>
) {
  await withDb(async (sudo, users, userDbs, project, em) => {
    await setupNotifications(sudo, userDbs, users, project);

    const permissions = await sudo.getPermissionsForProject(project.id);
    const projectUsers = getUniqueUsersWithCommentAccess(permissions).sort(
      (a, b) => a.email.localeCompare(b.email)
    );
    const threadProject = await sudo.getProjectById(project.id);

    await f({
      sudo,
      users: projectUsers,
      dbCon: em.connection,
      project: threadProject,
      userDbs,
    });
  });
}

export async function createNotification(
  commentThreadId: CommentThreadId,
  user: User,
  project: Project,
  timestamp: Date,
  entry: Entry,
  sudo: DbMgr
): Promise<Notification> {
  const threadComments = await sudo.getCommentsForThread(commentThreadId);
  if (entry.type === "COMMENT") {
    let comment = entry.comment;
    const unnotifiedComments = await sudo.getUnnotifiedCommentsByThreadIds(
      [commentThreadId],
      new Date()
    );
    comment = unnotifiedComments.find((c) => c.id === comment.id) || comment;
    return {
      user,
      project,
      rootComment: threadComments[0],
      timestamp,
      entry: {
        ...entry,
        comment,
      },
    };
  }
  if (entry.type === "THREAD_HISTORY") {
    let history = entry.history;
    const unnotifiedHistories =
      await sudo.getUnnotifiedCommentsThreadHistoriesByThreadIds(
        [commentThreadId],
        new Date()
      );
    history = unnotifiedHistories.find((th) => th.id === history.id) || history;
    return {
      user,
      project,
      rootComment: threadComments[0],
      timestamp,
      entry: {
        ...entry,
        history,
      },
    };
  }

  let reaction = entry.reaction;
  const unnotifiedReactions =
    await sudo.getUnnotifiedCommentsReactionsByThreadIds(
      [commentThreadId],
      new Date()
    );
  reaction = unnotifiedReactions.find((r) => r.id === reaction.id) || reaction;
  return {
    user,
    project,
    rootComment: threadComments[0],
    timestamp,
    entry: {
      ...entry,
      reaction,
    },
  };
}
