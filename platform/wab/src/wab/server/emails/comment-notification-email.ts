import { Mailer } from "@/wab/server/emails/Mailer";
import { TemplateCommentsProps } from "@/wab/server/emails/templates/TemplateComments";
import { generateEmailHtml } from "@/wab/server/emails/tools/generate";
import {
  Comment,
  CommentReaction,
  CommentThread,
  CommentThreadHistory,
  Project,
  User,
} from "@/wab/server/entities/Entities";
import { NotificationsByProject } from "@/wab/server/scripts/send-comments-notifications";
import {
  fullName,
  fullNameLastAbbreviated,
  getUserEmail,
} from "@/wab/shared/ApiSchemaUtil";
import { extractMentionedEmails, REACTIONS } from "@/wab/shared/comments-utils";
import { assert } from "@/wab/shared/common";
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

function isCommentEntry(entry: Entry): entry is CommentEntry {
  return entry.type === "COMMENT";
}

function isReactionEntry(entry: Entry): entry is ReactionEntry {
  return entry.type === "REACTION";
}

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

class ParticipantManager {
  private participants = new Map<string, User>();

  addParticipant(user: User | null | undefined) {
    assert(user, "participant user missing");
    this.participants.set(user.id, user);
  }

  getFormattedString(): string {
    const participants = Array.from(this.participants.values());
    if (participants.length === 0) {
      return "";
    }

    const p1 = fullNameLastAbbreviated(participants[0]);
    if (this.participants.size === 1) {
      return p1;
    } else {
      return `${p1} and others`;
    }
  }
}

/**
 * Sends a user notification email with detailed project, thread, and comment breakdowns.
 */
export async function sendUserNotificationEmail(
  mailer: Mailer,
  projectWiseUserNotification: NotificationsByProject,
  host: string,
  mailFrom: string,
  mailBcc?: string
) {
  // Process each project in the Map
  for (const [projectId, branchNotifications] of projectWiseUserNotification) {
    for (const [_branchId, threadNotifications] of branchNotifications) {
      const notifications = Array.from(threadNotifications.values()).flat();

      if (notifications.length === 0) {
        continue;
      }

      const { user, project, commentThread } = notifications[0];
      const projectName = project.name;
      const branchName = commentThread.branch?.name;
      const projectUrl = createProjectUrl(host, projectId, branchName);

      const userEmail = getUserEmail(user);
      const userName = getUserFullName(user);

      const participantManager = new ParticipantManager();

      if (!userEmail) {
        return; // No emails to send if no valid notifications exist
      }

      const templateProps: TemplateCommentsProps = {
        projectName,
        projectUrl,
        userName,
        mentions: [],
        replies: [],
        comments: [],
        reactions: [],
        resolutions: [],
      };

      notifications.forEach((notification) => {
        const { entry, rootComment } = notification;

        if (isCommentEntry(entry)) {
          const { comment } = entry;
          participantManager.addParticipant(comment.createdBy);
          const commentData = {
            name: getUserFullName(comment.createdBy),
            avatarUrl: comment.createdBy?.avatarUrl,
            commentId: comment.id,
            comment: comment.body,
          };
          const mentionedEmails = extractMentionedEmails(comment.body);
          if (mentionedEmails.includes(userEmail)) {
            templateProps.mentions.push(commentData);
          } else if (rootComment.id === comment.id) {
            templateProps.comments.push(commentData);
          } else {
            const existingRootComment = templateProps.replies.find(
              (replyData) => replyData.rootComment.id === rootComment.id
            );
            if (existingRootComment) {
              existingRootComment.replies.push(commentData);
            } else {
              templateProps.replies.push({
                rootComment: {
                  name: getUserFullName(rootComment.createdBy),
                  body: rootComment.body ?? "",
                  id: rootComment.id,
                },
                replies: [commentData],
              });
            }
          }
        } else if (isReactionEntry(entry)) {
          const { reaction } = entry;
          participantManager.addParticipant(reaction.createdBy);
          const name = getUserFullName(reaction.createdBy);
          const existingReactionData = templateProps.reactions.find(
            (r) => r.commentId === reaction.commentId
          );
          if (existingReactionData) {
            existingReactionData.reactions.push({
              name,
              emoji: REACTIONS[reaction.data.emojiName],
            });
          } else {
            templateProps.reactions.push({
              commentId: reaction.commentId,
              comment: reaction.comment?.body ?? "",
              reactions: [{ name, emoji: REACTIONS[reaction.data.emojiName] }],
            });
          }
        } else {
          const { history } = entry;
          participantManager.addParticipant(history.createdBy);
          const name = getUserFullName(history.createdBy);
          templateProps.resolutions.push({
            name,
            resolved: history.resolved,
            rootComment: {
              body: rootComment.body ?? "",
              name: getUserFullName(rootComment.createdBy),
            },
          });
        }
      });

      const html = await generateEmailHtml("Comments", templateProps);

      let projectBranch = projectName;
      if (branchName) {
        projectBranch += ` (${branchName})`;
      }

      // Send the email
      await mailer.sendMail({
        from: mailFrom,
        to: userEmail,
        bcc: mailBcc,
        subject: `New activity in ${projectBranch} from ${participantManager.getFormattedString()}`,
        html,
      });
    }
  }
}
