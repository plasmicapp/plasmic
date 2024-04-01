import { sendSupportWelcomeEmail } from "@/wab/server/emails/support-welcome-email";
import { superDbMgr } from "@/wab/server/routes/util";
import { logError } from "@/wab/server/server-util";
import { SendEmailsResponse, TeamId } from "@/wab/shared/ApiSchema";
import { MIN_ACCESS_LEVEL_FOR_SUPPORT } from "@/wab/shared/discourse/config";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { Request } from "express-serve-static-core";

export async function sendTeamSupportWelcomeEmail(
  req: Request,
  teamId: TeamId
): Promise<SendEmailsResponse> {
  const mgr = superDbMgr(req);
  const team = await mgr.getTeamById(teamId);
  const perms = await mgr.getPermissionsForTeams([teamId]);
  const sent: string[] = [];
  const failed: string[] = [];
  for (const perm of perms) {
    const email = perm.user?.email;
    if (
      !email ||
      accessLevelRank(perm.accessLevel) <
        accessLevelRank(MIN_ACCESS_LEVEL_FOR_SUPPORT)
    ) {
      continue;
    }

    try {
      await sendSupportWelcomeEmail(req, {
        toEmail: email,
        team,
      });
      sent.push(email);
    } catch (err) {
      logError(err, "sendTeamSupportWelcomeEmail");
      failed.push(email);
    }
  }
  return {
    sent,
    failed,
  };
}
