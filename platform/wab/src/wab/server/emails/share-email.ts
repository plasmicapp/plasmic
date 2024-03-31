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
  const text = `${fullName(
    sharer
  )} is using Plasmic and has invited you to the ${labelForResourceType(
    resourceType
  )} "${resourceName}":

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
    subject: `${fullName(sharer)} invited you to "${resourceName}"`,
    text,
  });
}
