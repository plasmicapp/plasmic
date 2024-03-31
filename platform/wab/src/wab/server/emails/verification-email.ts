import { Request } from "express-serve-static-core";

export function generateEmailVerificationLink(
  host: string,
  token: string,
  nextPath?: string
) {
  return `${host}/email-verification?token=${encodeURIComponent(token)}${
    nextPath ? `&continueTo=${encodeURIComponent(nextPath)}` : ""
  }`;
}

const PLASMIC_EMAIL_VERIFICATION_HTML = (
  appName: string,
  emailVerificationLink: string
) => `<p><strong>Verify your email address</strong></p>

<p>To start using ${appName}, just click in the link below</p>

<a href="${emailVerificationLink}">${emailVerificationLink}</a>

<p>If you didn't create an account in ${appName}, ignore this email.</p>`;

export async function sendEmailVerificationToUser(
  req: Request,
  email: string,
  token: string,
  nextPath?: string,
  appName?: string
) {
  // If the user is signing up for an app, we will perform the email verification
  // in the app authorization page instead of the general email verification page.
  const emailVerificationLink = appName
    ? `${nextPath}&token=${encodeURIComponent(token)}&mode=email+verification`
    : generateEmailVerificationLink(req.config.host, token, nextPath);

  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: email,
    bcc: req.config.mailBcc,
    subject: `Verify your email address for ${appName ?? "Plasmic"}`,
    html: PLASMIC_EMAIL_VERIFICATION_HTML(
      appName ?? "Plasmic",
      emailVerificationLink
    ),
  });
}
