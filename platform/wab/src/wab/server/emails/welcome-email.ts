import { generateEmailVerificationLink } from "@/wab/server/emails/verification-email";
import { Request } from "express-serve-static-core";

export async function sendWelcomeEmail(
  req: Request,
  email: string,
  token: string | null,
  nextPath?: string
) {
  let tokenLink = "";
  if (token) {
    const emailVerificationLink = generateEmailVerificationLink(
      req.config.host,
      token,
      nextPath
    );
    tokenLink = `<p>To start using Plasmic, just click in the link below</p>
<a href="${emailVerificationLink}">${emailVerificationLink}</a>`;
  }

  const welcomeEmailBody = `<p><strong>Thanks for signing up for Plasmic!</strong></p>

${tokenLink}

<p>For help and discussions, join our community - we want to hear all your questions and feedback.</p>

<p>Forum: <a href="https://forum.plasmic.app/">https://forum.plasmic.app/</a></p>

<p>Slack: <a href="https://plasmic.app/slack">https://plasmic.app/slack</a></p>

<p>We're excited to see what you build with Plasmic!</p>

<p>- The Plasmic team</p>`;

  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: email,
    bcc: req.config.mailBcc,
    subject: `Welcome to Plasmic`,
    html: welcomeEmailBody,
  });
}
