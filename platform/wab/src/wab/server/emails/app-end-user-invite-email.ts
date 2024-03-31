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
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: email,
    bcc: req.config.mailBcc,
    subject: `${fullName(sharer)} invited you to ${appName}`,
    text: `${fullName(sharer)} invited you to use ${appName}.

${url}`,
  });
}
