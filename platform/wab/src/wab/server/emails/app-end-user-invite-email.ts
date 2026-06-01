import { sanitize } from "@/wab/server/emails/sanitize";
import { User } from "@/wab/server/entities/Entities";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { Request } from "express-serve-static-core";

export async function sendAppEndUserInviteEmail(
  req: Request,
  {
    email,
    appName,
    url,
    sharer,
  }: { sharer: User; email: string; appName: string; url: string }
) {
  const sharerName = sanitize(fullName(sharer)) || sharer.email;
  const safeAppName = sanitize(appName);
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: email,
    bcc: req.config.mailBcc,
    subject: `${sharerName} invited you to ${safeAppName}`,
    text: `${sharerName} invited you to use ${safeAppName}.

${url}`,
  });
}
