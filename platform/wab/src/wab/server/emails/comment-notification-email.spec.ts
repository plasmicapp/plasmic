import { ReadableStream, WritableStream } from "node:stream/web";
import React from "react";

// NOTE: The below is needed to for this test setup to work - START
jest.spyOn(React, "useLayoutEffect").mockImplementation(React.useEffect);
(globalThis as any).ReadableStream = ReadableStream;
(globalThis as any).WritableStream = WritableStream;
// END

import {
  Notification,
  sendUserNotificationEmail,
} from "@/wab/server/emails/comment-notification-email";
import { setupEmailTest } from "@/wab/server/emails/test/email-test-util";
import {
  Comment,
  CommentReaction,
  CommentThreadHistory,
} from "@/wab/server/entities/Entities";
import { getTeamAndWorkspace } from "@/wab/server/test/backend-util";
import {
  createNotification,
  createNotificationsByProject,
  withEndUserNotificationSetup,
} from "@/wab/server/test/comments-util";
import {
  CommentId,
  CommentReactionId,
  CommentThreadId,
  ThreadHistoryId,
} from "@/wab/shared/ApiSchema";
import { createProjectUrl } from "@/wab/shared/urls";
import * as uuid from "uuid";

const FOOTER_TEXT = `You're receiving this email because you have notifications enabled for this project. Manage your project notification settings here.
Plasmic, Inc.`;
const PLASMIC_WEBSITE = "https://plasmic.app";

function extractTextAndLinks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Extract anchor tags with href
  const links: { text: string; href: string | null }[] = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    links.push({
      text: a.textContent?.trim() || "",
      href: a.getAttribute("href") || null,
    });
  });

  // Extract plain text content
  const text = doc.body.textContent || "";

  return { text, links };
}

function getProjectLink(projectId: string, branchName?: string) {
  return createProjectUrl("https://studio.plasmic.app", projectId, branchName);
}

function assertLinks(
  links: { href: string | null }[],
  expectedLinks: { url: string; count: number }[]
) {
  // Extract the first link as header (Plasmic website link)
  const [headerLink] = links;
  // Extract the last link as footer (Plasmic website link)
  const footerLink = links[links.length - 1];
  // Extract all links in between as content links
  const contentLinks = links.slice(1, -1);

  expect(headerLink.href).toBe(PLASMIC_WEBSITE);
  expect(footerLink.href).toBe(PLASMIC_WEBSITE);

  const totalExpectedLinks = expectedLinks.reduce(
    (sum, link) => sum + link.count,
    (headerLink ? 1 : 0) + (footerLink ? 1 : 0)
  );
  expect(links).toHaveLength(totalExpectedLinks);

  // Verify each expected content link appears the correct number of times
  expectedLinks.forEach(({ url, count }) => {
    const matchingLinks = contentLinks.filter((link) => link.href === url);
    expect(matchingLinks).toHaveLength(count);
  });
}

describe("sendUserNotificationEmail", () => {
  it("can send a comment notification email (with markdown support)", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();
        const projectId = project.id;

        // User 1 comment
        const user1Comment = await userDbs[1]().postRootCommentInProject(
          { projectId },
          {
            body: "# This looks great!", // The markdown symbols (like `# `) will be removed in the expected output to prove markdown support in comment emails
            location: { subject: { uuid: "", iid: "" }, variants: [] },
            commentId: uuid.v4() as CommentId,
            commentThreadId: uuid.v4() as CommentThreadId,
          }
        );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId,
            notificationsByThread: new Map([
              [
                user1Comment.commentThreadId,
                [
                  await createNotification(
                    user1Comment.commentThreadId,
                    users[0],
                    project,
                    user1Comment.createdAt,
                    { type: "COMMENT", comment: user1Comment },
                    sudo
                  ),
                ],
              ],
            ]),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        // Get the actual email body sent
        const { text: receivedHtmlContent, links } = extractTextAndLinks(
          mailer.sendMail.mock.calls[0][0].html
        );

        const projectLink = getProjectLink(projectId);
        assertLinks(links, [{ url: projectLink, count: 3 }]);

        expect(receivedHtmlContent).toEqual(
          `My projectYang 2 Zhang left a commentYang 2 ZhangThis looks great!View in Plasmic${FOOTER_TEXT}`
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(1);
        // Assert other email properties
        expect(mailer.sendMail).toHaveBeenCalledWith({
          from: config.mailFrom,
          to: users[0].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 2 in My project",
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
  it("can send a reply notification email", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();
        const projectId = project.id;

        // User 0 posts a comment
        const rootComment = await userDbs[0]().postRootCommentInProject(
          { projectId },
          {
            body: "This looks great!",
            location: { subject: { uuid: "", iid: "" }, variants: [] },
            commentId: uuid.v4() as CommentId,
            commentThreadId: uuid.v4() as CommentThreadId,
          }
        );

        // user 1 replies to user 0 comment
        const reply = await userDbs[1]().postCommentInThread(
          { projectId },
          {
            body: "I agree...",
            id: uuid.v4() as CommentId,
            threadId: rootComment.commentThreadId as CommentThreadId,
          }
        );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId,
            notificationsByThread: new Map([
              [
                rootComment.commentThreadId,
                [
                  await createNotification(
                    reply.commentThreadId,
                    users[0],
                    project,
                    reply.createdAt,
                    { type: "COMMENT", comment: reply },
                    sudo
                  ),
                ],
              ],
            ]),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        // Get the actual email body sent
        const { text: receivedHtmlContent, links } = extractTextAndLinks(
          mailer.sendMail.mock.calls[0][0].html
        );

        const projectLink = getProjectLink(projectId);
        assertLinks(links, [{ url: projectLink, count: 3 }]);

        expect(receivedHtmlContent).toEqual(
          `My projectYang 2 Zhang replied to a commentYang 1 ZhangThis looks great!
NEW COMMENTSYang 2 ZhangI agree...
View in Plasmic${FOOTER_TEXT}`
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(1);
        // Assert other email properties
        expect(mailer.sendMail).toHaveBeenCalledWith({
          from: config.mailFrom,
          to: users[0].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 2 in My project",
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
  it("can send a reaction notification email", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();
        const projectId = project.id;

        // User 0 comment
        const user1Comment = await userDbs[0]().postRootCommentInProject(
          { projectId },
          {
            body: "This looks great!",
            location: { subject: { uuid: "", iid: "" }, variants: [] },
            commentId: uuid.v4() as CommentId,
            commentThreadId: uuid.v4() as CommentThreadId,
          }
        );

        // User 1 reacts to user 0 comment
        const reaction = await userDbs[1]().addCommentReaction(
          uuid.v4() as CommentReactionId,
          user1Comment.id,
          {
            emojiName: "1f4af",
          }
        );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId,
            notificationsByThread: new Map([
              [
                user1Comment.commentThreadId,
                [
                  await createNotification(
                    user1Comment.commentThreadId,
                    users[0],
                    project,
                    reaction.createdAt,
                    { type: "REACTION", reaction },
                    sudo
                  ),
                ],
              ],
            ]),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        // Get the actual email body sent
        const { text: receivedHtmlContent, links } = extractTextAndLinks(
          mailer.sendMail.mock.calls[0][0].html
        );

        const projectLink = getProjectLink(projectId);
        assertLinks(links, [{ url: projectLink, count: 3 }]);

        expect(receivedHtmlContent).toEqual(
          `My projectYang 2 Zhang reacted to your comment💯Yang 1 ZhangThis looks great!
View in Plasmic${FOOTER_TEXT}`
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(1);
        // Assert other email properties
        expect(mailer.sendMail).toHaveBeenCalledWith({
          from: config.mailFrom,
          to: users[0].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 2 in My project",
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
  it("can send a mention notification email", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();
        const projectId = project.id;

        // User 1 comment
        const user1Comment = await userDbs[1]().postRootCommentInProject(
          { projectId },
          {
            body: "Hey @<yang1@test.com>, can you look into this?",
            location: { subject: { uuid: "", iid: "" }, variants: [] },
            commentId: uuid.v4() as CommentId,
            commentThreadId: uuid.v4() as CommentThreadId,
          }
        );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId,
            notificationsByThread: new Map([
              [
                user1Comment.commentThreadId,
                [
                  await createNotification(
                    user1Comment.commentThreadId,
                    users[0],
                    project,
                    user1Comment.createdAt,
                    { type: "COMMENT", comment: user1Comment },
                    sudo
                  ),
                ],
              ],
            ]),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        // Get the actual email body sent
        const { text: receivedHtmlContent, links } = extractTextAndLinks(
          mailer.sendMail.mock.calls[0][0].html
        );

        const projectLink = getProjectLink(projectId);
        assertLinks(links, [
          { url: projectLink, count: 3 },
          { url: "mailto:yang1@test.com", count: 1 },
        ]);

        expect(receivedHtmlContent).toEqual(
          `My projectYang 2 Zhang mentioned you in a commentYang 2 ZhangHey @yang1@test.com, can you look into this?
View in Plasmic${FOOTER_TEXT}`
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(1);
        // Assert other email properties
        expect(mailer.sendMail).toHaveBeenCalledWith({
          from: config.mailFrom,
          to: users[0].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 2 in My project",
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
  it("can send a resolution notification", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();
        const projectId = project.id;

        const user1Comment = await userDbs[0]().postRootCommentInProject(
          { projectId },
          {
            body: "This looks great!",
            location: { subject: { uuid: "", iid: "" }, variants: [] },
            commentId: uuid.v4() as CommentId,
            commentThreadId: uuid.v4() as CommentThreadId,
          }
        );

        // User 1 resolves user 0 comment
        const resolution = await userDbs[1]().resolveThreadInProject(
          uuid.v4() as ThreadHistoryId,
          user1Comment.commentThreadId,
          true
        );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId,
            notificationsByThread: new Map([
              [
                user1Comment.commentThreadId,
                [
                  await createNotification(
                    user1Comment.commentThreadId,
                    users[0],
                    project,
                    resolution.createdAt,
                    { type: "THREAD_HISTORY", history: resolution },
                    sudo
                  ),
                ],
              ],
            ]),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        // Get the actual email body sent
        const { text: receivedHtmlContent, links } = extractTextAndLinks(
          mailer.sendMail.mock.calls[0][0].html
        );

        const projectLink = getProjectLink(projectId);
        assertLinks(links, [{ url: projectLink, count: 3 }]);

        expect(receivedHtmlContent).toEqual(
          `My projectYang 2 Zhang resolved a commentYang 1 ZhangThis looks great!
View in Plasmic${FOOTER_TEXT}`
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(1);
        // Assert other email properties
        expect(mailer.sendMail).toHaveBeenCalledWith({
          from: config.mailFrom,
          to: users[0].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 2 in My project",
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
  it("can send comment, reply, reaction, resolution, and mention notifications in the same email", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();
        const projectId = project.id;

        const rootComments: Comment[] = [];
        const replies: Comment[] = [];
        const reactions: CommentReaction[] = [];
        const resolutions: CommentThreadHistory[] = [];

        // User 0 root comment
        rootComments.push(
          await userDbs[0]().postRootCommentInProject(
            { projectId },
            {
              body: "This looks great!",
              location: { subject: { uuid: "", iid: "" }, variants: [] },
              commentId: uuid.v4() as CommentId,
              commentThreadId: uuid.v4() as CommentThreadId,
            }
          )
        );

        // User 0 another root comment
        rootComments.push(
          await userDbs[0]().postRootCommentInProject(
            { projectId },
            {
              body: "Can you increase the font size?",
              location: { subject: { uuid: "", iid: "" }, variants: [] },
              commentId: uuid.v4() as CommentId,
              commentThreadId: uuid.v4() as CommentThreadId,
            }
          )
        );

        // User 1 root comment
        rootComments.push(
          await userDbs[1]().postRootCommentInProject(
            { projectId },
            {
              body: "yang1@test.com reverted this change", // NOTE: this is NOT a mention, because it's not in the @<email> format
              location: { subject: { uuid: "", iid: "" }, variants: [] },
              commentId: uuid.v4() as CommentId,
              commentThreadId: uuid.v4() as CommentThreadId,
            }
          )
        );

        // User 2 root comment
        rootComments.push(
          await userDbs[2]().postRootCommentInProject(
            { projectId },
            {
              body: "Looks good to me!",
              location: { subject: { uuid: "", iid: "" }, variants: [] },
              commentId: uuid.v4() as CommentId,
              commentThreadId: uuid.v4() as CommentThreadId,
            }
          )
        );

        // user 2 reply to User 0 comment
        replies.push(
          await userDbs[2]().postCommentInThread(
            { projectId },
            {
              body: "I agree...",
              id: uuid.v4() as CommentId,
              threadId: rootComments[0].commentThreadId as CommentThreadId,
            }
          )
        );

        // user 1 reply to User 0 comment
        replies.push(
          await userDbs[1]().postCommentInThread(
            { projectId },
            {
              body: "Thanks",
              id: uuid.v4() as CommentId,
              threadId: rootComments[0].commentThreadId as CommentThreadId,
            }
          )
        );

        // User 2 reply to another User 0 comment
        replies.push(
          await userDbs[2]().postCommentInThread(
            { projectId },
            {
              body: "20px?",
              id: uuid.v4() as CommentId,
              threadId: rootComments[1].commentThreadId as CommentThreadId,
            }
          )
        );

        // User 1 reaction to User 0 comment
        reactions.push(
          await userDbs[1]().addCommentReaction(
            uuid.v4() as CommentReactionId,
            rootComments[0].id as CommentId,
            {
              emojiName: "1f44d",
            }
          )
        );
        // User 1 reaction to User 0 comment
        reactions.push(
          await userDbs[1]().addCommentReaction(
            uuid.v4() as CommentReactionId,
            rootComments[0].id as CommentId,
            {
              emojiName: "1f525",
            }
          )
        );
        // User 2 reaction to User 0 comment
        reactions.push(
          await userDbs[2]().addCommentReaction(
            uuid.v4() as CommentReactionId,
            rootComments[0].id as CommentId,
            {
              emojiName: "1f525",
            }
          )
        );
        // User 2 reaction to another User 0 comment
        reactions.push(
          await userDbs[2]().addCommentReaction(
            uuid.v4() as CommentReactionId,
            rootComments[1].id as CommentId,
            {
              emojiName: "2705",
            }
          )
        );
        // User 1 mention (in root comment) to User 0 comment
        rootComments.push(
          await userDbs[1]().postRootCommentInProject(
            { projectId },
            {
              body: "Hey @<yang1@test.com>, can you look into this?",
              location: { subject: { uuid: "", iid: "" }, variants: [] },
              commentId: uuid.v4() as CommentId,
              commentThreadId: uuid.v4() as CommentThreadId,
            }
          )
        );
        // User 2 mention (in thread) to User 0 comment
        replies.push(
          await userDbs[2]().postCommentInThread(
            { projectId },
            {
              body: "cc: @<yang1@test.com>",
              id: uuid.v4() as CommentId,
              threadId: rootComments[0].commentThreadId as CommentThreadId,
            }
          )
        );

        resolutions.push(
          await userDbs[2]().resolveThreadInProject(
            uuid.v4() as ThreadHistoryId,
            rootComments[0].commentThreadId,
            false
          )
        );

        resolutions.push(
          await userDbs[2]().resolveThreadInProject(
            uuid.v4() as ThreadHistoryId,
            rootComments[1].commentThreadId,
            true
          )
        );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId,
            notificationsByThread: new Map(
              await Promise.all(
                rootComments.map(
                  async (
                    rootComment
                  ): Promise<[CommentThreadId, Notification[]]> => [
                    rootComment.commentThreadId,
                    await Promise.all([
                      ...rootComments
                        .filter(
                          (comment) =>
                            comment.id === rootComment.id &&
                            comment.createdById !== users[0].id
                        )
                        .map(
                          async (comment): Promise<Notification> =>
                            await createNotification(
                              comment.commentThreadId,
                              users[0],
                              project,
                              comment.createdAt,
                              { type: "COMMENT", comment },
                              sudo
                            )
                        ),
                      ...replies
                        .filter(
                          (reply) =>
                            reply.commentThreadId ===
                            rootComment.commentThreadId
                        )
                        .map(
                          async (reply): Promise<Notification> =>
                            await createNotification(
                              reply.commentThreadId,
                              users[0],
                              project,
                              reply.createdAt,
                              { type: "COMMENT", comment: reply },
                              sudo
                            )
                        ),
                      ...resolutions
                        .filter(
                          (resolution) =>
                            resolution.commentThreadId ===
                            rootComment.commentThreadId
                        )
                        .map(
                          async (resolution): Promise<Notification> =>
                            await createNotification(
                              resolution.commentThreadId,
                              users[0],
                              project,
                              resolution.createdAt,
                              { type: "THREAD_HISTORY", history: resolution },
                              sudo
                            )
                        ),
                      ...reactions
                        .filter(
                          (reaction) =>
                            reaction.comment?.commentThreadId ===
                            rootComment.commentThreadId
                        )
                        .map(
                          async (reaction): Promise<Notification> =>
                            await createNotification(
                              reaction.comment?.commentThreadId!,
                              users[0],
                              project,
                              reaction.createdAt,
                              { type: "REACTION", reaction },
                              sudo
                            )
                        ),
                    ]),
                  ]
                )
              )
            ),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        // Get the actual email body sent
        const { text: receivedHtmlContent, links } = extractTextAndLinks(
          mailer.sendMail.mock.calls[0][0].html
        );

        const projectLink = getProjectLink(projectId);
        assertLinks(links, [
          { url: projectLink, count: 8 },
          { url: "mailto:yang1@test.com", count: 3 },
        ]);

        expect(receivedHtmlContent).toEqual(
          `My projectYang 3 Zhang and others mentioned you in 2 commentsYang 3 Zhangcc: @yang1@test.com
Yang 2 ZhangHey @yang1@test.com, can you look into this?
View in PlasmicYang 3 Zhang and others replied to these commentsYang 1 ZhangThis looks great!
NEW COMMENTSYang 3 ZhangI agree...
Yang 2 ZhangThanks
View in PlasmicYang 1 ZhangCan you increase the font size?
NEW COMMENTSYang 3 Zhang20px?
View in PlasmicYang 2 Zhang and others left 2 commentsYang 2 Zhangyang1@test.com reverted this change
Yang 3 ZhangLooks good to me!
View in PlasmicYang 2 Zhang and 1 others reacted to your comment👍Yang 1 ZhangThis looks great!
Yang 3 Zhang reacted to your comment✅Yang 1 ZhangCan you increase the font size?
View in PlasmicYang 3 Zhang reopened a commentYang 1 ZhangThis looks great!
Yang 3 Zhang resolved a commentYang 1 ZhangCan you increase the font size?
View in Plasmic${FOOTER_TEXT}`
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(1);
        // Assert other email properties
        expect(mailer.sendMail).toHaveBeenCalledWith({
          from: config.mailFrom,
          to: users[0].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 3 and others in My project",
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
  it("sends a separate email for each project", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();

        // Create a second project
        const { workspace } = await getTeamAndWorkspace(userDbs[0]());
        const { project: project2 } = await userDbs[0]().createProject({
          name: "My project 2",
          workspaceId: workspace.id,
        });

        // user 0 comment in project 1
        const user0Comment = await userDbs[0]().postRootCommentInProject(
          { projectId: project.id },
          {
            body: "comment text in project 1",
            location: { subject: { uuid: "", iid: "" }, variants: [] },
            commentId: uuid.v4() as CommentId,
            commentThreadId: uuid.v4() as CommentThreadId,
          }
        );

        // user 0 comment in project 2
        const user0CommentInProject2 =
          await userDbs[0]().postRootCommentInProject(
            { projectId: project2.id },
            {
              body: "comment text in project 2",
              location: { subject: { uuid: "", iid: "" }, variants: [] },
              commentId: uuid.v4() as CommentId,
              commentThreadId: uuid.v4() as CommentThreadId,
            }
          );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId: project.id,
            notificationsByThread: new Map([
              [
                user0Comment.commentThreadId,
                [
                  await createNotification(
                    user0Comment.commentThreadId,
                    users[1],
                    project,
                    user0Comment.createdAt,
                    { type: "COMMENT", comment: user0Comment },
                    sudo
                  ),
                ],
              ],
            ]),
          },
          {
            projectId: project2.id,
            notificationsByThread: new Map([
              [
                user0CommentInProject2.commentThreadId,
                [
                  await createNotification(
                    user0CommentInProject2.commentThreadId,
                    users[1],
                    project2,
                    user0CommentInProject2.createdAt,
                    { type: "COMMENT", comment: user0CommentInProject2 },
                    sudo
                  ),
                ],
              ],
            ]),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(2);

        const call1 = mailer.sendMail.mock.calls[0][0];
        const call2 = mailer.sendMail.mock.calls[1][0];

        // Get the actual email body sent
        const {
          text: receivedHtmlForProject1,
          links: receivedLinksForProject1,
        } = extractTextAndLinks(call1.html);
        const project1Link = getProjectLink(project.id);
        assertLinks(receivedLinksForProject1, [
          { url: project1Link, count: 3 },
        ]);
        expect(receivedHtmlForProject1).toEqual(
          `My projectYang 1 Zhang left a commentYang 1 Zhangcomment text in project 1
View in Plasmic${FOOTER_TEXT}`
        );

        const {
          text: receivedHtmlForProject2,
          links: receivedLinksForProject2,
        } = extractTextAndLinks(call2.html);
        const project2Link = getProjectLink(project2.id);
        assertLinks(receivedLinksForProject2, [
          { url: project2Link, count: 3 },
        ]);
        expect(receivedHtmlForProject2).toEqual(
          `My project 2Yang 1 Zhang left a commentYang 1 Zhangcomment text in project 2
View in Plasmic${FOOTER_TEXT}`
        );

        // Assert other email properties
        expect(call1).toEqual({
          from: config.mailFrom,
          to: users[1].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 1 in My project",
          html: expect.any(String), // Already tested above
        });
        expect(call2).toEqual({
          from: config.mailFrom,
          to: users[1].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 1 in My project 2",
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
  it("sends a separate email for each branch of the same project", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        const { req, config, mailer } = setupEmailTest();

        const projectId = project.id;
        const branchName = "my-branch-2";
        const branch2 = await userDbs[0]().createBranchFromLatestPkgVersion(
          project.id,
          {
            name: branchName,
          }
        );

        // user 0 comment in main branch
        const user0comment = await userDbs[0]().postRootCommentInProject(
          { projectId },
          {
            body: "comment text in main branch",
            location: { subject: { uuid: "", iid: "" }, variants: [] },
            commentId: uuid.v4() as CommentId,
            commentThreadId: uuid.v4() as CommentThreadId,
          }
        );

        // user 0 comment in branch
        const user0commentInBranch =
          await userDbs[0]().postRootCommentInProject(
            { projectId, branchId: branch2.id },
            {
              body: "comment text in feature branch",
              location: { subject: { uuid: "", iid: "" }, variants: [] },
              commentId: uuid.v4() as CommentId,
              commentThreadId: uuid.v4() as CommentThreadId,
            }
          );

        // Mock input
        const notifications = createNotificationsByProject([
          {
            projectId,
            notificationsByThread: new Map([
              [
                user0comment.commentThreadId,
                [
                  await createNotification(
                    user0comment.commentThreadId,
                    users[1],
                    project,
                    user0comment.createdAt,
                    { type: "COMMENT", comment: user0comment },
                    sudo
                  ),
                ],
              ],
            ]),
          },
          {
            projectId,
            branchId: branch2.id,
            notificationsByThread: new Map([
              [
                user0commentInBranch.commentThreadId,
                [
                  await createNotification(
                    user0commentInBranch.commentThreadId,
                    users[1],
                    project,
                    user0commentInBranch.createdAt,
                    { type: "COMMENT", comment: user0commentInBranch },
                    sudo
                  ),
                ],
              ],
            ]),
          },
        ]);

        await sendUserNotificationEmail(
          mailer,
          notifications,
          req.config.host,
          config.mailFrom,
          req.config.mailBcc // Optional BCC
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(2);

        const call1 = mailer.sendMail.mock.calls[0][0];

        // Get the actual email body sent
        const { text: receivedHtmlMainBranch, links: linksMainBranch } =
          extractTextAndLinks(call1.html);

        const projectLink = getProjectLink(project.id);

        assertLinks(linksMainBranch, [{ url: projectLink, count: 3 }]);

        expect(receivedHtmlMainBranch).toEqual(
          `My projectYang 1 Zhang left a commentYang 1 Zhangcomment text in main branch
View in Plasmic${FOOTER_TEXT}`
        );

        const call2 = mailer.sendMail.mock.calls[1][0];

        // Get the actual email body sent
        const {
          text: receivedHtmlFeatureBranchBranch,
          links: linksFeatureBranch,
        } = extractTextAndLinks(call2.html);

        const projectLinkFeatureBranch = getProjectLink(project.id, branchName);

        assertLinks(linksFeatureBranch, [
          { url: projectLinkFeatureBranch, count: 3 },
        ]);

        expect(receivedHtmlFeatureBranchBranch).toEqual(
          `My projectYang 1 Zhang left a commentYang 1 Zhangcomment text in feature branch
View in Plasmic${FOOTER_TEXT}`
        );

        expect(mailer.sendMail).toHaveBeenCalledTimes(2);

        // Assert other email properties
        expect(call1).toEqual({
          from: config.mailFrom,
          to: users[1].email,
          bcc: req.config.mailBcc,
          subject: "New Activity from Yang 1 in My project",
          html: expect.any(String), // Already tested above
        });
        expect(call2).toEqual({
          from: config.mailFrom,
          to: users[1].email,
          bcc: req.config.mailBcc,
          subject: `New Activity from Yang 1 in My project (${branchName})`,
          html: expect.any(String), // Already tested above
        });
      }
    );
  });
});
