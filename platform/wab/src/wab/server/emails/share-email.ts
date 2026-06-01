import { sanitize } from "@/wab/server/emails/sanitize";
import { User } from "@/wab/server/entities/Entities";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { labelForResourceType, ResourceType } from "@/wab/shared/perms";
import { Request } from "express-serve-static-core";

export async function sendShareEmail(
  req: Request,
  sharer: User,
  email: string,
  resourceType: ResourceType,
  resourceName: string,
  resourceUrl: string,
  isInviteeExistingUser: boolean
) {
  const sharerName = sanitize(fullName(sharer)) || sharer.email;
  const safeResourceName = sanitize(resourceName);
  const text = `${sharerName} is using Plasmic and has invited you to the ${labelForResourceType(
    resourceType
  )} "${safeResourceName}":

${resourceUrl}

${
  isInviteeExistingUser
    ? ""
    : `
-

Plasmic is a visual website and application builder.

Learn more at:

https://www.plasmic.app`
}`.trim();
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    replyTo: sharer.email,
    to: email,
    bcc: req.config.mailBcc,
    subject: `${sharerName} invited you to "${safeResourceName}"`,
    text,
  });
}
