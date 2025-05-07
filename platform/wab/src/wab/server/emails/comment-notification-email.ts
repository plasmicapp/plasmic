import { Mailer } from "@/wab/server/emails/Mailer";
import {
  Comment,
  CommentReaction,
  CommentThread,
  CommentThreadHistory,
  Project,
  User,
} from "@/wab/server/entities/Entities";
import { CommentThreadId, ProjectId } from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { createProjectUrl } from "@/wab/shared/urls";

export interface Notification {
  user: User;
  project: Project;
  rootComment: Comment;
  commentThread: CommentThread;
  entry: Entry;
  timestamp: Date;
}

export type Entry = CommentEntry | ReactionEntry | HistoryEntry;

export interface CommentEntry {
  type: "COMMENT";
  comment: Comment;
}

export interface ReactionEntry {
  type: "REACTION";
  reaction: CommentReaction;
}

export interface HistoryEntry {
  type: "THREAD_HISTORY";
  history: CommentThreadHistory;
}

const getUserFullName = (user: User | null) =>
  user ? fullName(user) : "Unknown User";

function getNotification(notification: Notification) {
  const { entry } = notification;
  if (entry.type === "COMMENT") {
    const { comment } = entry;
    const userFullName = getUserFullName(comment.createdBy);
    return `<p>${comment.body} by <strong>${userFullName}</strong></p>`;
  }

  if (entry.type === "THREAD_HISTORY") {
    const { history } = entry;
    const userFullName = getUserFullName(history.createdBy);
    return `<p>Thread was resolved by <strong>${userFullName}</strong></p>`;
  }

  const { reaction } = entry;
  const userFullName = getUserFullName(reaction.createdBy);
  return `<p><strong>${userFullName}</strong> reacted to your comment</p>`;
}

function getRootNotification(comment: Comment, threadUrl: string) {
  return `<p><a href="${threadUrl}" target="_blank">${comment.body}</a> ${
    comment.createdBy
      ? `by <strong>${comment.createdBy.firstName} ${comment.createdBy.lastName}</strong>`
      : ""
  }</p>`;
}

/**
 * Sends a user notification email with detailed project, thread, and comment breakdowns.
 */
export async function sendUserNotificationEmail(
  mailer: Mailer,
  projectWiseUserNotification: Map<
    ProjectId,
    Map<CommentThreadId, Notification[]>
  >,
  host: string,
  mailFrom: string,
  mailBcc?: string
) {
  let emailBodyContent = ``;
  let userEmail = "";

  // Process each project in the Map
  for (const [projectId, threadNotifications] of projectWiseUserNotification) {
    const projectUrl = createProjectUrl(host, projectId);

    // Access the project name from the first notification in the thread
    const projectName = threadNotifications.values().next().value[0]
      .project.name;

    emailBodyContent += `<div><h2>New updates in project: <a href="${projectUrl}" target="_blank">${projectName}</a></h2>`;

    // Process each thread in the project

    for (const [threadId, notifications] of threadNotifications) {
      if (notifications.length === 0) {
        continue;
      }

      userEmail = notifications[0].user.email;
      const commentThread = notifications[0].commentThread;

      emailBodyContent += `<hr>${getRootNotification(
        notifications[0].rootComment,
        commentThread.branch?.name
          ? `${projectUrl}?branch=${encodeURIComponent(
              commentThread.branch.name
            )}`
          : projectUrl
      )}`;

      // Skip the first notification if it's a COMMENT and its comment is the same as rootComment
      const filteredNotifications =
        notifications[0].entry.type === "COMMENT" &&
        notifications[0].entry.comment.id === notifications[0].rootComment.id
          ? notifications.slice(1)
          : notifications;

      if (filteredNotifications.length === 0) {
        continue; // Skip if nothing remains after filtering
      }

      emailBodyContent += `<ul>`;
      filteredNotifications.forEach((notification) => {
        emailBodyContent += `<li>${getNotification(notification)}</li>`;
      });
      emailBodyContent += `</ul>`;
    }

    emailBodyContent += `</div>`;
  }

  if (!userEmail) {
    return; // No emails to send if no valid notifications exist
  }

  const emailBody = `<p>
    You have new activity in your projects:</p>
      ${emailBodyContent}
    <p>If you wish to modify your notification settings, please visit the appropriate section in Plasmic Studio.</p>`;

  // Send the email
  await mailer.sendMail({
    from: mailFrom,
    to: userEmail,
    bcc: mailBcc,
    subject: "New Activity in Your Projects",
    html: emailBody,
  });
}
