import { Team } from "@/wab/server/entities/Entities";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { Request } from "express-serve-static-core";

export async function sendSupportWelcomeEmail(
  req: Request,
  args: {
    toEmail: string;
    team: Team;
  }
) {
  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: args.toEmail,
    bcc: req.config.mailBcc,
    subject: `Welcome to Plasmic support`,
    text: `Plasmic's customer support system is in the Plasmic forum. To get priority support direct from the Plasmic team, we've set up a private category for your ${ORGANIZATION_LOWER}, ${args.team.name}.

Please use the link below to get access to your private support category:

https://studio.plasmic.app/orgs/${args.team.id}/support`,
  });
}
