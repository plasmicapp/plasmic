import { Project, User } from "@/wab/server/entities/Entities";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { createProjectUrl } from "@/wab/shared/urls";
import { Request } from "express-serve-static-core";

export async function sendCommentNotificationEmail(
  req: Request,
  project: Project,
  author: User,
  email: string,
  commentBody: string
) {
  const commentNotificationBody = `<p><strong>${fullName(
    author
  )}</strong> replied to a comment on <strong>${project.name}</strong>:</p>

<pre style="font: inherit;">${commentBody}</pre>

<p><a href="${createProjectUrl(
    req.config.host,
    project.id
  )}">Open project in Plasmic Studio</a> to reply or change notification settings</p>`;

  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: email,
    bcc: req.config.mailBcc,
    subject: `New comments from ${fullName(author)} on ${project.name}`,
    html: commentNotificationBody,
  });
}
