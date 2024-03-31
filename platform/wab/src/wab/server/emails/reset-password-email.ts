import { Request } from "express-serve-static-core";

export async function sendResetPasswordEmail(
  req: Request,
  email: string,
  secret: string,
  appInfo?: {
    appName: string;
    nextPath: string;
  }
) {
  const resetPasswordFields = `email=${encodeURIComponent(
    email
  )}&token=${encodeURIComponent(secret)}`;

  const resetPasswordLink = appInfo
    ? `${appInfo.nextPath}&mode=reset+password&${resetPasswordFields}`
    : `${req.config.host}/reset-password?${resetPasswordFields}`;

  await req.mailer.sendMail({
    from: req.config.mailFrom,
    to: email,
    bcc: req.config.mailBcc,
    subject: `Request to reset your password`,
    text: `Did you forget your password? Click in the link below to choose a new one:

${resetPasswordLink}

If you don't mean to reset your password, ignore this email and your password will not change.`,
  });
}
