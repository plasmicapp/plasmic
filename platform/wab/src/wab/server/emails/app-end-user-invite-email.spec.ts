import { sendAppEndUserInviteEmail } from "@/wab/server/emails/app-end-user-invite-email";
import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import { User } from "@/wab/server/entities/Entities";

describe("sendAppEndUserInviteEmail", () => {
  it("sends an email", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendAppEndUserInviteEmail(req, {
      sharer: {
        email: "sharer@example.com",
        firstName: "Sherry",
        lastName: "Sender",
      } as User,
      email: "recipient@example.com",
      appName: "My App",
      url: "https://exampleapp.com",
    });
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "recipient@example.com",
      bcc: req.config.mailBcc,
      subject: `Sherry Sender invited you to My App`,
      text: `Sherry Sender invited you to use My App.

https://exampleapp.com`,
    });
  });
});
