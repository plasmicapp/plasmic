import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  Entry,
  Notification,
} from "@/wab/server/emails/comment-notification-email";
import {
  Branch,
  Permission,
  Project,
  User,
} from "@/wab/server/entities/Entities";
import {
  NotificationsByProject,
  NotificationsByUser,
} from "@/wab/server/scripts/send-comments-notifications";
import { withBranch } from "@/wab/server/test/branching-utils";
import {
  BranchId,
  CommentThreadId,
  ProjectId,
  UserId,
} from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { ensure, withoutNils, xGroupBy } from "@/wab/shared/common";
import { Connection } from "typeorm";

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
    branch: Branch;
  }) => Promise<void>
) {
  await withBranch(
    async (branch, _helpers, sudo, users, userDbs, project, em) => {
      const user1Db = userDbs[0]();
      await user1Db.grantProjectPermissionByEmail(
        project.id,
        users[1].email,
        "editor"
      );
      await user1Db.grantProjectPermissionByEmail(
        project.id,
        users[2].email,
        "editor"
      );
      await user1Db.grantProjectPermissionByEmail(
        project.id,
        users[3].email,
        "editor"
      );

      // Need to get entities in a specific way for send-comments-notifications.spec.ts
      // TODO: fix the test to be less specific
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
        branch,
      });
    },
    {
      numUsers: 4,
    }
  );
}

export function createNotificationsByUser(
  data: {
    projectId: ProjectId;
    branchId?: BranchId;
    userId: UserId;
    notificationsByThread: Map<CommentThreadId, Notification[]>;
  }[]
): NotificationsByUser {
  const groupedByUser = xGroupBy(data, (d) => d.userId);
  return new Map(
    Array.from(groupedByUser.entries()).map(([userId, items]) => [
      userId,
      createNotificationsByProject(items),
    ])
  );
}

export function createNotificationsByProject(
  data: {
    projectId: ProjectId;
    branchId?: BranchId;
    notificationsByThread: Map<CommentThreadId, Notification[]>;
  }[]
): NotificationsByProject {
  const groupedByProject = xGroupBy(data, (d) => d.projectId);
  return new Map(
    Array.from(groupedByProject.entries()).map(([projectId, items]) => [
      projectId,
      new Map(
        items.map(({ branchId, notificationsByThread: notifications }) => [
          branchId ?? "main",
          notifications,
        ])
      ),
    ])
  );
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
  const commentThreads = await sudo.getUnnotifiedCommentThreads(new Date());
  const commentThread = ensure(
    commentThreads.find((thread) => thread.id === commentThreadId),
    "commentThread must exist"
  );
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
      commentThread,
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
      commentThread,
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
    commentThread,
    entry: {
      ...entry,
      reaction,
    },
  };
}
