import { sendUserNotificationEmail } from "@/wab/server/emails/comment-notification-email";
import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import { createProjectUrl } from "@/wab/shared/urls";

// Utility function to normalize HTML by removing extra whitespace
const normalizeHtml = (html) => html.replace(/\s+/g, " ");

describe("sendUserNotificationEmail", () => {
  it("sends an email with notifications grouped by project", async () => {
    const { req, config, mailer } = setupEmailTest();

    // Mock input
    const notifications = new Map([
      [
        "proj-1",
        {
          projectName: "Project Alpha",
          threads: new Map([
            [
              "thread1",
              [
                {
                  author: "John Doe",
                  body: "What's this supposed to mean?",
                },
                {
                  author: "Zoro",
                  body: "This is a navigation system that I have developed",
                },
              ],
            ],
            [
              "thread2",
              [
                {
                  author: "John Doe",
                  body: "When can we expect to deliver this?",
                },
                {
                  author: "Zoro",
                  body: "In a week may be",
                },
              ],
            ],
          ]),
        },
      ],
      [
        "proj-2",
        {
          projectName: "Project Beta",
          threads: new Map([
            [
              "thread1",
              [
                {
                  author: "John Doe",
                  body: "Comment",
                },
                {
                  author: "Sanji",
                  body: "I can reply",
                },
                {
                  author: "Nami",
                  body: "I can aswell",
                },
              ],
            ],
            [
              "thread2",
              [
                {
                  author: "John Doe",
                  body: "this is a comment",
                },
                {
                  author: "Nami",
                  body: "this is a reply",
                },
              ],
            ],
          ]),
        },
      ],
    ]);

    const expectedEmailBody = normalizeHtml(
      `<p>
        You have new activity in your projects:</p> <div><h2>New comments in project: <a href="${createProjectUrl(
          req.config.host,
          "proj-1"
        )}">${
        notifications.get("proj-1")?.projectName
      }</a></h2><hr><p>What's this supposed to mean? by <strong>John Doe</strong></p><ul> <li><p>This is a navigation system that I have developed by <strong>Zoro</strong></p></li> </ul><hr><p>When can we expect to deliver this? by <strong>John Doe</strong></p><ul> <li><p>In a week may be by <strong>Zoro</strong></p></li> </ul></div><div><h2>New comments in project: <a href="${createProjectUrl(
        req.config.host,
        "proj-2"
      )}">${
        notifications.get("proj-2")?.projectName
      }</a></h2><hr><p>Comment by <strong>John Doe</strong></p><ul> <li><p>I can reply by <strong>Sanji</strong></p></li> <li><p>I can aswell by <strong>Nami</strong></p></li> </ul><hr><p>this is a comment by <strong>John Doe</strong></p><ul> <li><p>this is a reply by <strong>Nami</strong></p></li> </ul></div> <p>If you wish to modify your notification settings, please visit the appropriate section in Plasmic Studio.</p>`
    );

    await sendUserNotificationEmail(
      mailer,
      "recipient@example.com", // User's email
      notifications,
      req.config.host,
      config.mailFrom,
      req.config.mailBcc // Optional BCC
    );

    // Get the actual email body sent
    const receivedHtml = normalizeHtml(mailer.sendMail.mock.calls[0][0].html);

    // Assert that the normalized HTML matches
    expect(receivedHtml).toBe(expectedEmailBody);

    // Assert other email properties
    expect(mailer.sendMail).toHaveBeenCalledWith({
      from: config.mailFrom,
      to: "recipient@example.com",
      bcc: req.config.mailBcc,
      subject: "New Activity in Your Projects",
      html: expect.any(String), // Already tested above
    });
  });
});
