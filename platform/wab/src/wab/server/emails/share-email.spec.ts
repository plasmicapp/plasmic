import { sendShareEmail } from "@/wab/server/emails/share-email";
import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import { User } from "@/wab/server/entities/Entities";

describe("sendShareEmail", () => {
  it("sends an email", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendShareEmail(
      req,
      {
        email: "sharer@example.com",
        firstName: "Sherry",
        lastName: "Sender",
      } as User,
      "recipient@example.com",
      "project",
      "My Website",
      "https://studio.plasmic.app/projects/123",
      true
    );
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      replyTo: "sharer@example.com",
      to: "recipient@example.com",
      bcc: req.config.mailBcc,
      subject: `Sherry Sender invited you to "My Website"`,
      text: `Sherry Sender is using Plasmic and has invited you to the project "My Website":

https://studio.plasmic.app/projects/123`,
    });
  });

  it("sends an email with extra invitation to Plasmic for new users", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendShareEmail(
      req,
      {
        email: "sharer@example.com",
        firstName: "Sherry",
        lastName: "Sender",
      } as User,
      "recipient@example.com",
      "team",
      "My Company",
      "https://studio.plasmic.app/orgs/123",
      false
    );
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      replyTo: "sharer@example.com",
      to: "recipient@example.com",
      bcc: req.config.mailBcc,
      subject: `Sherry Sender invited you to "My Company"`,
      text: `Sherry Sender is using Plasmic and has invited you to the organization "My Company":

https://studio.plasmic.app/orgs/123


-

Plasmic is a visual website and application builder.

Learn more at:

https://www.plasmic.app`,
    });
  });
});
