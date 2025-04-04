import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  NotificationsByUser,
  processUnnotifiedCommentsNotifications,
} from "@/wab/server/scripts/send-comments-notifications";
import {
  createNotification,
  withEndUserNotificationSetup,
} from "@/wab/server/test/comments-util";
import {
  CommentId,
  CommentReactionId,
  CommentThreadId,
  ThreadHistoryId,
} from "@/wab/shared/ApiSchema";
import * as uuid from "uuid";

async function addComment(
  dbManager: DbMgr,
  projectId: string,
  threadId?: CommentThreadId
) {
  const comment = threadId
    ? await dbManager.postCommentInThread(
        { projectId },
        { body: "reply text", threadId, id: uuid.v4() as CommentId }
      )
    : await dbManager.postRootCommentInProject(
        { projectId },
        {
          body: "comment text",
          location: { subject: { uuid: "", iid: "" }, variants: [] },
          commentId: uuid.v4() as CommentId,
          commentThreadId: uuid.v4() as CommentThreadId,
        }
      );
  return comment;
}

async function updatedThreadStatus(
  dbManager: DbMgr,
  threadId: CommentThreadId,
  status: boolean = false
) {
  const threadHistory = await dbManager.resolveThreadInProject(
    uuid.v4() as ThreadHistoryId,
    threadId,
    Boolean(status)
  );
  return threadHistory;
}

async function reactOnComment(dbManager: DbMgr, commentId: CommentId) {
  const commentReaction = await dbManager.addCommentReaction(
    uuid.v4() as CommentReactionId,
    commentId,
    {
      emojiName: "1f44d",
    }
  );
  return commentReaction;
}

async function removeReactionOnComment(
  dbManager: DbMgr,
  reactionId: CommentReactionId
) {
  await dbManager.removeCommentReaction(reactionId);
}

describe("sendCommentsNotificationEmails", () => {
  it("should send notifications based on user settings", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        await userDbs[2]().updateNotificationSettings(users[2].id, project.id, {
          notifyAbout: "all",
        });

        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,

                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[2].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[2],
                        project,
                        user0comment.createdAt,
                        { type: "COMMENT", comment: user0comment },
                        sudo
                      ),
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[2],
                        project,

                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                  [
                    user1Comment.commentThreadId,
                    [
                      await createNotification(
                        user1Comment.commentThreadId,
                        users[2],
                        project,
                        user1Comment.createdAt,
                        { type: "COMMENT", comment: user1Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        // Check if the notificationsByUser structure is correct
        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should not notify user about replies to their own comment", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        await userDbs[2]().updateNotificationSettings(users[2].id, project.id, {
          notifyAbout: "all",
        });
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // user 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 0 replies to their own comment
        const user0Reply = await addComment(
          userDbs[0](),
          project.id,
          user0comment.commentThreadId
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Expect user 0 not to be notified about their own reply
        const expectedNotification = new Map([
          [
            users[2].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[2],
                        project,
                        user0comment.createdAt,
                        { type: "COMMENT", comment: user0comment },
                        sudo
                      ),
                      await createNotification(
                        user0Reply.commentThreadId,
                        users[2],
                        project,
                        user0Reply.createdAt,
                        { type: "COMMENT", comment: user0Reply },
                        sudo
                      ),
                    ],
                  ],
                  [
                    user1Comment.commentThreadId,
                    [
                      await createNotification(
                        user1Comment.commentThreadId,
                        users[2],
                        project,
                        user1Comment.createdAt,
                        { type: "COMMENT", comment: user1Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should only notify user with 'mentions-and-replies' preference about replies to their comments or replies after they replied", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // Set user 1's preference to 'mentions-and-replies'
        await sudo.updateNotificationSettings(users[1].id, project.id, {
          notifyAbout: "mentions-and-replies",
        });

        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // user 0 selfReply
        // user 1 should not be notified for this because user 1 has not yet responded
        const user0SelfReply = await addComment(
          userDbs[0](),
          project.id,
          user0comment.commentThreadId
        );

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 replied to user 1 comment should be notified
        const user0Replied = await addComment(
          userDbs[0](),
          project.id,
          user1Comment.commentThreadId
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // User 1 should not be notified about the comment and reply from user 0 on thread1
        expect(
          notificationsByUser
            .get(users[1].id)
            ?.get(project.id)
            ?.get(user0comment.commentThreadId)
        ).toBeUndefined();
        // user 1 will be notified about user 0 reply to their comment
        expect(
          notificationsByUser
            .get(users[1].id)
            ?.get(project.id)
            ?.get(user1Comment.commentThreadId)?.length
        ).toBe(1);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user0comment.commentThreadId,
          user1Comment.commentThreadId,
        ]);
      }
    );
  });

  it("should not notify user with 'none' notification preference", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // Set user 0's preference to 'none'
        await sudo.updateNotificationSettings(users[0].id, project.id, {
          notifyAbout: "none",
        });

        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // user 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // user 1 reply to user 0 comment
        const user1Reply = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 1 reply to user 0 comment, should not be notified
        const user1MentionUser0 = await userDbs[1]().postCommentInThread(
          { projectId: project.id },
          {
            body: `@<${users[0].email}> should check`,
            threadId: user1Comment.commentThreadId,
            id: uuid.v4() as CommentId,
          }
        );

        // user 1 resolved a thread that user has participated but will not be notified
        const commentThreadUnResolvedHistoryForUser1Comment =
          await updatedThreadStatus(
            userDbs[1](),
            user0comment.commentThreadId,
            false
          );

        // user 1 reacted to user 0 comment but user 0 should not be notified
        await reactOnComment(userDbs[1](), user0comment.id);

        // user 0 should not be notified about the comment
        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check that user 0 has no notifications and no 'projects' entry
        expect(notificationsByUser.get(users[0].id)).toBeUndefined();

        // User 1 should have notifications

        expect(notificationsByUser.get(users[1].id)).toEqual(undefined);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should not notify user about the same comment once notified", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // Post a comment (user 0)
        const user0comment = await addComment(userDbs[0](), project.id);

        // Post another comment (user 1)
        const user1Comment = await addComment(userDbs[1](), project.id);

        // Post a reply (user 1)
        const user1Reply = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // Process notifications and send out emails
        const { notificationsByUser, recentCommentThreads, notifiedDate } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Ensure user 0 is notified about the reply
        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[0],
                        project,
                        user1Reply.createdAt,
                        { type: "COMMENT", comment: user1Reply },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check the recentComments array (it should include user0comment, user1Comment, and user0Reply)
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);

        // Simulate sending notifications, after which the threads should be marked as notified
        await sudo.markCommentThreadsAsNotified(
          [
            user0comment.commentThreadId,
            user1Comment.commentThreadId,
            user1Reply.commentThreadId,
          ],
          notifiedDate
        );

        // Process notifications again after the comments have been notified
        const { notificationsByUser: secondNotificationCheck } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check that user 0 has no notifications and no 'projects' entry
        expect(secondNotificationCheck.get(users[0].id)).toBeUndefined();
      }
    );
  });

  it("should handle mixed notification preferences correctly", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // Set notification preferences for users
        await sudo.updateNotificationSettings(users[0].id, project.id, {
          notifyAbout: "mentions-and-replies",
        });
        await sudo.updateNotificationSettings(users[1].id, project.id, {
          notifyAbout: "all",
        });
        // Notify only for mentions and replies
        await sudo.updateNotificationSettings(users[2].id, project.id, {
          notifyAbout: "none",
        });

        // user 0 posts a comment
        const user0Comment = await addComment(userDbs[0](), project.id);

        // user 1 replies to user 0's comment
        const user1Reply = await addComment(
          userDbs[1](),
          project.id,
          user0Comment.commentThreadId
        );

        // user 1 posts a comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // user 2 replies to user 1's comment
        const user2Reply = await addComment(
          userDbs[2](),
          project.id,
          user1Comment.commentThreadId
        );

        // Process notifications
        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Validate notifications
        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0Comment.commentThreadId,
                    [
                      await createNotification(
                        user0Comment.commentThreadId,
                        users[0],
                        project,
                        user1Reply.createdAt,
                        { type: "COMMENT", comment: user1Reply },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
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
                  [
                    user1Comment.commentThreadId,
                    [
                      await createNotification(
                        user2Reply.commentThreadId,
                        users[1],
                        project,
                        user2Reply.createdAt,
                        { type: "COMMENT", comment: user2Reply },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser.get(users[1].id)).toEqual(
          expectedNotification.get(users[1].id)
        );

        // Validate that user 2 receives no notifications
        expect(notificationsByUser.get(users[2].id)).toBeUndefined();

        // Validate processed comments
        expect(recentCommentThreads).toEqual([
          user0Comment.commentThreadId,
          user1Comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify user if thread is resolved and user have participated", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        await sudo.updateNotificationSettings(users[2].id, project.id, {
          notifyAbout: "none",
        }); // Do not notify at all

        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 resolved his thread which should notify user1 because he has participated
        const commentThreadResolvedHistoryForUser0Comment =
          await updatedThreadStatus(
            userDbs[0](),
            user0comment.commentThreadId,
            true
          );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[1],
                        project,
                        commentThreadResolvedHistoryForUser0Comment.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history: commentThreadResolvedHistoryForUser0Comment,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify user if thread is resolved/unresolved multiple times and user have participated", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 resolved his thread which should notify user1 because he has participated
        const commentThreadResolvedHistoryForUser0Comment =
          await updatedThreadStatus(
            userDbs[0](),
            user0comment.commentThreadId,
            true
          );
        const commentThreadUnResolvedHistoryForUser0Comment =
          await updatedThreadStatus(
            userDbs[0](),
            user0comment.commentThreadId,
            false
          );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[1],
                        project,
                        commentThreadResolvedHistoryForUser0Comment.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history: commentThreadResolvedHistoryForUser0Comment,
                        },
                        sudo
                      ),
                      await createNotification(
                        user0comment.commentThreadId,
                        users[1],
                        project,
                        commentThreadUnResolvedHistoryForUser0Comment.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history:
                            commentThreadUnResolvedHistoryForUser0Comment,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify user if thread is resolved/unresolved if notification preference is mentions-and-replies", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        await sudo.updateNotificationSettings(users[1].id, project.id, {
          notifyAbout: "mentions-and-replies",
        });

        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 resolved his thread which should notify user1 because he has participated
        const commentThreadResolvedHistoryForUser0Comment =
          await updatedThreadStatus(
            userDbs[0](),
            user0comment.commentThreadId,
            true
          );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[1],
                        project,
                        commentThreadResolvedHistoryForUser0Comment.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history: commentThreadResolvedHistoryForUser0Comment,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should not notify user if thread is resolved/unresolved by user himself", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 1 resolved his thread and user should not be notified
        const commentThreadResolvedHistoryForUser0Comment =
          await updatedThreadStatus(
            userDbs[1](),
            user1Comment.commentThreadId,
            true
          );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user0comment.commentThreadId,
          user1Comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify user if another user react to their comment", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 reacted to user 1 comment, user 1 should be notified
        const user0CommentReaction = await reactOnComment(
          userDbs[0](),
          user1Comment.id
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1Comment.commentThreadId,
                    [
                      await createNotification(
                        user1Comment.commentThreadId,
                        users[1],
                        project,
                        user0CommentReaction.createdAt,
                        {
                          type: "REACTION",
                          reaction: user0CommentReaction,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user0comment.commentThreadId,
          user1Comment.commentThreadId,
        ]);
      }
    );
  });

  it("should not be notified user if reaction is removed", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );
        // user 0 reacted to user 1 comment, user 1
        const user0CommentReaction = await reactOnComment(
          userDbs[0](),
          user1Comment.id
        );
        // removed the reaction now user should not be notified for this reaction
        await removeReactionOnComment(userDbs[0](), user0CommentReaction.id);

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user0comment.commentThreadId,
          user1Comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify new reaction on old comment", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        const { notificationsByUser, recentCommentThreads, notifiedDate } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);

        // Simulate sending notifications, after which the threads should be marked as notified
        // You can either mark them as notified in the system or simulate this in your mock logic
        await sudo.markCommentThreadsAsNotified(
          [user1Comment.commentThreadId, user0comment.commentThreadId],
          notifiedDate
        );

        // users are notified now we add a reaction on an old comment, it should only notify for reaction

        // user 0 reacted to user 1 comment, user 1
        const user0CommentReaction = await reactOnComment(
          userDbs[0](),
          user1Comment.id
        );

        const {
          notificationsByUser: notificationsByUser2,
          recentCommentThreads: recentCommentThreads2,
        } = await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification2: NotificationsByUser = new Map([
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1Comment.commentThreadId,
                    [
                      await createNotification(
                        user1Comment.commentThreadId,
                        users[1],
                        project,
                        user0CommentReaction.createdAt,
                        {
                          type: "REACTION",
                          reaction: user0CommentReaction,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);
        expect(notificationsByUser2).toEqual(expectedNotification2);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads2).toEqual([user1Comment.commentThreadId]);
      }
    );
  });

  it("should notify reaction and comment combined if both are new", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 reacted to user 1 comment, user 1
        const user0CommentReaction = await reactOnComment(
          userDbs[0](),
          user1Comment.id
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // user 0 for user 1 reply, while user 1 will be notified for user 0 reaction on user 1 comment

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1Comment.commentThreadId,
                    [
                      await createNotification(
                        user1Comment.commentThreadId,
                        users[1],
                        project,
                        user0CommentReaction.createdAt,
                        {
                          type: "REACTION",
                          reaction: user0CommentReaction,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user0comment.commentThreadId,
          user1Comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify for resolving an old thread", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        const { notificationsByUser, recentCommentThreads, notifiedDate } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);

        // Simulate sending notifications, after which the threads should be marked as notified
        // You can either mark them as notified in the system or simulate this in your mock logic
        await sudo.markCommentThreadsAsNotified(
          [user1Comment.commentThreadId, user0comment.commentThreadId],
          notifiedDate
        );

        // users are notified now we resolved an old thread, it should only notify for thread history

        // user 0 resolved their thread
        const user0CommentThreadHistory = await updatedThreadStatus(
          userDbs[0](),
          user0comment.commentThreadId,
          true
        );

        const {
          notificationsByUser: notificationsByUser2,
          recentCommentThreads: recentCommentThreads2,
        } = await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        // only user 1 has participated, user 0 is not notified for it's self thread history updated
        const expectedNotification2: NotificationsByUser = new Map([
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[1],
                        project,
                        user0CommentThreadHistory.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history: user0CommentThreadHistory,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);
        expect(notificationsByUser2).toEqual(expectedNotification2);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads2).toEqual([user0comment.commentThreadId]);
      }
    );
  });

  it("should notify thread history and comment combined if both are new", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 resolved their thread
        const user0CommentThreadHistory = await updatedThreadStatus(
          userDbs[0](),
          user0comment.commentThreadId,
          true
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // user 0 and 2 will be notified for user 1 comment, while user 1 will be notified for user 0 reaction on user 1 comment

        // only user 1 has participated, user 1 will be notified for thread history and comment, user 0 is not notified for it's self thread history updated
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[1],
                        project,
                        user0CommentThreadHistory.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history: user0CommentThreadHistory,
                        },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify user if mentioned", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // user 2 is mentioned so user 2 should be notified
        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await userDbs[1]().postCommentInThread(
          { projectId: project.id },
          {
            body: `@<${users[2].email}> should check`,
            threadId: user0comment.commentThreadId,
            id: uuid.v4() as CommentId,
          }
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,

                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[2].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      // user 2 is mentioned because user was mentioned
                      await createNotification(
                        user0comment.commentThreadId,
                        users[2],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        // Check if the notificationsByUser structure is correct
        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should not notify if user mentioned self", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // user 1 mentioned self so user 1 should not be notified
        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await userDbs[1]().postCommentInThread(
          { projectId: project.id },
          {
            body: `@<${users[1].email}> should check`,
            threadId: user0comment.commentThreadId,
            id: uuid.v4() as CommentId,
          }
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,

                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        // Check if the notificationsByUser structure is correct
        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should notify user with 'mentions-and-replies'", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // Set user 2's preference to 'mentions-and-replies'
        await sudo.updateNotificationSettings(users[2].id, project.id, {
          notifyAbout: "mentions-and-replies",
        });

        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // user 2 is mentioned so user 2 should be notified
        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await userDbs[1]().postCommentInThread(
          { projectId: project.id },
          {
            body: `@<${users[2].email}> should check`,
            threadId: user0comment.commentThreadId,
            id: uuid.v4() as CommentId,
          }
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,

                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[2].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user0comment.commentThreadId,
                    [
                      // user 2 is mentioned because user was mentioned
                      await createNotification(
                        user0comment.commentThreadId,
                        users[2],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        // Check if the notificationsByUser structure is correct
        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });

  it("should not notify user if mentioned without preceding @", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // user 2 is mentioned but without preceding @ so user 2 should not be notified
        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await userDbs[1]().postCommentInThread(
          { projectId: project.id },
          {
            body: `<${users[2].email}> should check`,
            threadId: user0comment.commentThreadId,
            id: uuid.v4() as CommentId,
          }
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,

                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        // Check if the notificationsByUser structure is correct
        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });
  it("should notify user for all recent notifications with 'all' notification preference", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // Set user 0's preference to 'all'
        await sudo.updateNotificationSettings(users[0].id, project.id, {
          notifyAbout: "all",
        });

        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // user 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // user 2 reply to user 1 comment
        const user2Reply = await addComment(
          userDbs[2](),
          project.id,
          user1Comment.commentThreadId
        );

        // user 2 mentioned user 1
        const user2MentionUser1 = await userDbs[2]().postCommentInThread(
          { projectId: project.id },
          {
            body: `@<${users[1].email}> should check`,
            threadId: user0comment.commentThreadId,
            id: uuid.v4() as CommentId,
          }
        );

        // user 2 resolved a thread that user has participated
        const commentThreadUnResolvedHistoryForUser1Comment =
          await updatedThreadStatus(
            userDbs[2](),
            user1Comment.commentThreadId,
            false
          );

        // user 1 reacted to user 0 comment
        const user1Reaction = await reactOnComment(
          userDbs[1](),
          user0comment.id
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        const expectedNotification = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
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
                      await createNotification(
                        user2Reply.commentThreadId,
                        users[0],
                        project,

                        user2Reply.createdAt,
                        { type: "COMMENT", comment: user2Reply },
                        sudo
                      ),
                      await createNotification(
                        commentThreadUnResolvedHistoryForUser1Comment.commentThreadId,
                        users[0],
                        project,

                        commentThreadUnResolvedHistoryForUser1Comment.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history:
                            commentThreadUnResolvedHistoryForUser1Comment,
                        },
                        sudo
                      ),
                    ],
                  ],
                  [
                    user0comment.commentThreadId,
                    [
                      await createNotification(
                        user0comment.commentThreadId,
                        users[0],
                        project,

                        user2MentionUser1.createdAt,
                        {
                          type: "COMMENT",
                          comment: user2MentionUser1,
                        },
                        sudo
                      ),
                      await createNotification(
                        user0comment.commentThreadId,
                        users[0],
                        project,

                        user1Reaction.createdAt,
                        { type: "REACTION", reaction: user1Reaction },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user2Reply.commentThreadId,
                    [
                      await createNotification(
                        user2Reply.commentThreadId,
                        users[1],
                        project,
                        user2Reply.createdAt,
                        { type: "COMMENT", comment: user2Reply },
                        sudo
                      ),
                      await createNotification(
                        commentThreadUnResolvedHistoryForUser1Comment.commentThreadId,
                        users[1],
                        project,

                        commentThreadUnResolvedHistoryForUser1Comment.createdAt,
                        {
                          type: "THREAD_HISTORY",
                          history:
                            commentThreadUnResolvedHistoryForUser1Comment,
                        },
                        sudo
                      ),
                    ],
                  ],
                  [
                    user2MentionUser1.commentThreadId,
                    [
                      await createNotification(
                        user2MentionUser1.commentThreadId,
                        users[1],
                        project,
                        user2MentionUser1.createdAt,
                        { type: "COMMENT", comment: user2MentionUser1 },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user1Comment.commentThreadId,
          user0comment.commentThreadId,
        ]);
      }
    );
  });
  it("should not notify user if reacted to self comment", async () => {
    await withEndUserNotificationSetup(
      async ({ sudo, users, project, userDbs }) => {
        // user 0 comment
        const user0comment = await addComment(userDbs[0](), project.id);

        // User 1 comment
        const user1Comment = await addComment(userDbs[1](), project.id);

        // User 1 reply to user 0 comment
        const user1ReplyToUser0Comment = await addComment(
          userDbs[1](),
          project.id,
          user0comment.commentThreadId
        );

        // user 0 reacted to self comment, user 0 should not be notified
        const user0CommentReaction = await reactOnComment(
          userDbs[0](),
          user0comment.id
        );

        // user 0 reacted to user 1 comment, user 1 should be notified
        const user1CommentReaction = await reactOnComment(
          userDbs[0](),
          user1Comment.id
        );

        const { notificationsByUser, recentCommentThreads } =
          await processUnnotifiedCommentsNotifications(sudo);

        // Check if the notificationsByUser structure is correct
        // user 1 not be notified of self reaction
        const expectedNotification: NotificationsByUser = new Map([
          [
            users[0].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1ReplyToUser0Comment.commentThreadId,
                    [
                      await createNotification(
                        user1ReplyToUser0Comment.commentThreadId,
                        users[0],
                        project,
                        user1ReplyToUser0Comment.createdAt,
                        { type: "COMMENT", comment: user1ReplyToUser0Comment },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
          [
            users[1].id,
            new Map([
              [
                project.id,
                new Map([
                  [
                    user1Comment.commentThreadId,
                    [
                      await createNotification(
                        user1Comment.commentThreadId,
                        users[1],
                        project,
                        user1CommentReaction.createdAt,
                        { type: "REACTION", reaction: user1CommentReaction },
                        sudo
                      ),
                    ],
                  ],
                ]),
              ],
            ]),
          ],
        ]);

        expect(notificationsByUser).toEqual(expectedNotification);

        // Check if the processed threads match the recentThreads
        expect(recentCommentThreads).toEqual([
          user0comment.commentThreadId,
          user1Comment.commentThreadId,
        ]);
      }
    );
  });
});
