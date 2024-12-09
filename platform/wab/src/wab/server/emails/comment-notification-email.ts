import { Mailer } from "@/wab/server/emails/Mailer";
import {
  ProjectThreads,
  UserComment,
} from "@/wab/server/scripts/send-comments-notifications";
import { createProjectUrl } from "@/wab/shared/urls";

function getComment(comment: UserComment) {
  return `<p>${comment.body} ${
    comment.author ? `by <strong>${comment.author}</strong>` : ""
  }</p>`;
}

/**
 * Sends a user notification email with detailed project, thread, and comment breakdowns.
 */
export async function sendUserNotificationEmail(
  mailer: Mailer,
  email: string,
  projects: Map<string, ProjectThreads>,
  host: string,
  mailFrom: string,
  mailBcc?: string
) {
  let commentsBody = ``;

  // Process each project in the Map
  for (const [projectId, { projectName, threads }] of projects) {
    const projectUrl = createProjectUrl(host, projectId);

    commentsBody += `<div><h2>New comments in project: <a href="${projectUrl}">${projectName}</a></h2>`;

    // Process each thread in the project (threads is a Map)
    for (const [threadId, comments] of threads) {
      if (comments.length === 0) {
        return;
      } // Skip empty threads

      commentsBody += `<hr>${getComment(comments[0])}`;

      if (comments.length > 1) {
        commentsBody += `<ul>`;

        // Add remaining comments
        comments.slice(1).forEach((comment) => {
          commentsBody += `
            <li>${getComment(comment)}</li>
          `;
        });

        commentsBody += `</ul>`;
      }
    }

    commentsBody += `</div>`;
  }

  const emailBody = `<p>
    You have new activity in your projects:</p>
      ${commentsBody}
    <p>If you wish to modify your notification settings, please visit the appropriate section in Plasmic Studio.</p>`;

  // Send the email
  await mailer.sendMail({
    from: mailFrom,
    to: email,
    bcc: mailBcc, // Optional BCC
    subject: "New Activity in Your Projects",
    html: emailBody,
  });
}
