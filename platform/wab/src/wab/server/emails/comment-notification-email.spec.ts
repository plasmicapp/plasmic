import { sendCommentNotificationEmail } from "@/wab/server/emails/comment-notification-email";
import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import { Project, User } from "@/wab/server/entities/Entities";

describe("sendCommentNotificationEmail", () => {
  it("sends an email", async () => {
    const { req, config, mailer } = setupEmailTest();
    await sendCommentNotificationEmail(
      req,
      {
        name: "My Project",
        id: "proj-id",
      } as Project,
      {
        email: "author@example.com",
        firstName: "Author",
        lastName: "Person",
      } as User,
      "recipient@example.com",
      "This is a comment"
    );

    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "recipient@example.com",
      bcc: req.config.mailBcc,
      subject: `New comments from Author Person on My Project`,
      html: `<p><strong>Author Person</strong> replied to a comment on <strong>My Project</strong>:</p>

<pre style="font: inherit;">This is a comment</pre>

<p><a href="https://studio.plasmic.app/projects/proj-id">Open project in Plasmic Studio</a> to reply or change notification settings</p>`,
    });
  });
});
