import { Project } from "@/wab/server/entities/Entities";
import { getUser } from "@/wab/server/routes/util";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { Request } from "express-serve-static-core";

export async function sendInviteApprovalAdminEmail(
  req: Request,
  email: string,
  project: Project
) {
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: req.config.mailUserOps,
    subject: `[Admin] ${fullName(getUser(req))} wants to invite ${email} to "${
      project.name
    }"`,
    text: `Go to the admin panel to whitelist this user or domain:

${req.config.host}/admin

Then we'll send out any queued share emails to the associated user(s).
    `,
  });
}

export async function sendInviteEmail(req: Request, email: string) {
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: email,
    bcc: req.config.mailBcc,
    subject: `You're invited to Plasmic!`,
    text: `Hello from the Plasmic team!

You're invited to Plasmic's beta program.

Get started by creating your account here:

https://studio.plasmic.app

Please sign up with the email ${email} (or let us know if you prefer a different email).

Join us on Slack as well:

https://plasmic.app/slack

We look forward to having you!

- The Plasmic team
`,
  });
}

export async function sendBlockedSignupAdminEmail(
  req: Request,
  email: string,
  firstName: string,
  lastName: string
) {
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: req.config.mailUserOps,
    subject: `[Admin] ${email} tried to sign up but was not whitelisted`,
    text: `${firstName} ${lastName} <${email}> tried to sign up.

You can go to the admin panel to "Invite & Whitelist" this user:

${req.config.host}/admin
`,
  });
}
