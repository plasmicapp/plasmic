import { sendResetPasswordEmail } from "@/wab/server/emails/reset-password-email";
import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";

describe("sendResetPasswordEmail", () => {
  it("sends an email", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendResetPasswordEmail(req, "forgetful@example.com", "SuperSecret");
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "forgetful@example.com",
      bcc: req.config.mailBcc,
      subject: `Request to reset your password`,
      text: `Did you forget your password? Click in the link below to choose a new one:

https://studio.plasmic.app/reset-password?email=forgetful%40example.com&token=SuperSecret

If you don't mean to reset your password, ignore this email and your password will not change.`,
    });
  });

  it("sends an email for an app using Plasmic auth", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendResetPasswordEmail(req, "forgetful@example.com", "SuperSecret", {
      appName: "My App",
      nextPath: "https://exampleapp.com/login?continueTo=%2F",
    });
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "forgetful@example.com",
      bcc: req.config.mailBcc,
      subject: `Request to reset your password`,
      text: `Did you forget your password? Click in the link below to choose a new one:

https://exampleapp.com/login?continueTo=%2F&mode=reset+password&email=forgetful%40example.com&token=SuperSecret

If you don't mean to reset your password, ignore this email and your password will not change.`,
    });
  });
});
