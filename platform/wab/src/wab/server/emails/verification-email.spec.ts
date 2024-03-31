import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import { sendEmailVerificationToUser } from "@/wab/server/emails/verification-email";

describe("sendEmailVerificationToUser", () => {
  it("sends an email", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendEmailVerificationToUser(
      req,
      "newuser@example.com",
      "OneTimeUseToken",
      "/"
    );
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "newuser@example.com",
      bcc: req.config.mailBcc,
      subject: `Verify your email address for Plasmic`,
      html: `<p><strong>Verify your email address</strong></p>

<p>To start using Plasmic, just click in the link below</p>

<a href="https://studio.plasmic.app/email-verification?token=OneTimeUseToken&continueTo=%2F">https://studio.plasmic.app/email-verification?token=OneTimeUseToken&continueTo=%2F</a>

<p>If you didn't create an account in Plasmic, ignore this email.</p>`,
    });
  });
});
