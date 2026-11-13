import { Config } from "@/wab/server/config";
import { Mailer } from "@/wab/server/emails/Mailer";
import { Team } from "@/wab/server/entities/Entities";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { Temporal } from "temporal-polyfill";

export async function sendPastDueEmail(
  mailer: Mailer,
  config: Config,
  args: {
    team: Pick<Team, "id" | "name">;
    toEmails: string[];
    lastDay: Temporal.PlainDate;
  },
) {
  const date = args.lastDay.toLocaleString("en-US", { dateStyle: "long" });
  await mailer.sendMail({
    from: config.mailFrom,
    to: args.toEmails,
    bcc: config.mailBcc,
    subject: `Action needed: Plasmic editing for ${args.team.name} is available through ${date}`,
    text: `We could not collect payment for your Plasmic ${ORGANIZATION_LOWER} "${args.team.name}".

You can continue editing in Plasmic Studio through ${date}. After that, editing will pause unless payment has gone through. Your projects and published sites are not affected.

Update your payment method here:
${config.host}${APP_ROUTES.orgBilling.fill({ teamId: args.team.id })}

If you have already paid, no action is needed. Access continues automatically once payment goes through.`,
  });
}
