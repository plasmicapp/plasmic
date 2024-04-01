import { sendSupportWelcomeEmail } from "@/wab/server/emails/support-welcome-email";
import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import { Team } from "@/wab/server/entities/Entities";

describe("sendSupportWelcomeEmail", () => {
  it("sends an email", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendSupportWelcomeEmail(req, {
      toEmail: "recipient@example.com",
      team: {
        id: "123",
        name: "My Company",
      } as Team,
    });
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "recipient@example.com",
      bcc: req.config.mailBcc,
      subject: `Welcome to Plasmic support`,
      text: `Plasmic's customer support system is in the Plasmic forum. To get priority support direct from the Plasmic team, we've set up a private category for your organization, My Company.

Please use the link below to get access to your private support category:

https://studio.plasmic.app/orgs/123/support`,
    });
  });
});
