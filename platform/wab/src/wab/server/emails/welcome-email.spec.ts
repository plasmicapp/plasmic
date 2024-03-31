import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import { sendWelcomeEmail } from "@/wab/server/emails/welcome-email";

describe("sendWelcomeEmail", () => {
  it("sends an email", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendWelcomeEmail(req, "newuser@example.com", "OneTimeUseToken", "/");
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "newuser@example.com",
      bcc: req.config.mailBcc,
      subject: `Welcome to Plasmic`,
      html: `<p><strong>Thanks for signing up for Plasmic!</strong></p>

<p>To start using Plasmic, just click in the link below</p>
<a href="https://studio.plasmic.app/email-verification?token=OneTimeUseToken&continueTo=%2F">https://studio.plasmic.app/email-verification?token=OneTimeUseToken&continueTo=%2F</a>

<p>For help and discussions, join our community - we want to hear all your questions and feedback.</p>

<p>Forum: <a href="https://forum.plasmic.app/">https://forum.plasmic.app/</a></p>

<p>Slack: <a href="https://plasmic.app/slack">https://plasmic.app/slack</a></p>

<p>We're excited to see what you build with Plasmic!</p>

<p>- The Plasmic team</p>`,
    });
  });
});
