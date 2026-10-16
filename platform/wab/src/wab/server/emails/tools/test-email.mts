import { createMailer } from "@/wab/server/emails/Mailer";
import {
  generateEmailHtml,
  writeHtmlToFile,
} from "@/wab/server/emails/tools/generate";
import { logger } from "@/wab/server/observability";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// NOTE: Customize the email template by changing the component name and its props below
const TEMPLATE_NAME = "Comments"; // The Plasmic component name representing an email template
const TEMPLATE_PROPS = {
  projectName: "Plexus Main",
  projectUrl: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk",
  userName: "Sarah Ahmed",
  comments: [
    {
      name: "Dinesh C.",
      avatarUrl:
        "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      comment:
        "🔥 really impressive! The structure is solid, and I can see the thought you put into it. A couple of minor tweaks with the colors, and I think it’ll be even more amazing.",
      link: "https://studio.plasmic.app/projects/4o7zzQoUVEQjWq5Yf6dG2p?comment=4809a952-8355-4e7d-938d-68d0c511d28f",
    },
    {
      name: "Sarah A.",
      avatarUrl:
        "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      comment: "# Hello\nworld",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
    },
    {
      name: "John D.",
      avatarUrl:
        "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      comment: "Good!",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
    },
  ],
  replies: [
    {
      rootComment: {
        name: "Sarah Ahmed",
        body: "🔥 really impressive! The structure is solid, and I can see the thought you put into it. A couple of minor tweaks with the colors, and I think it’ll be even more amazing.",
        avatarUrl:
          "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      },
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      replies: [
        {
          name: "John D.",
          avatarUrl:
            "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
          comment: "Sounds good!",
        },
        {
          name: "Sarah A.",
          avatarUrl:
            "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
          comment: "Ok!",
        },
      ],
    },
    {
      rootComment: {
        name: "Hannah Amin",
        body: "Lorem Ipsum dolor sit amit",
        avatarUrl:
          "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      },
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      replies: [
        {
          name: "John D.",
          avatarUrl:
            "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
          comment: "Great!",
        },
      ],
    },
  ],
  mentions: [
    {
      name: "Dinesh C.",
      avatarUrl:
        "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      comment:
        "🔥 really impressive! The structure is solid, and I can see the thought you put into it. A couple of minor tweaks with the colors, and I think it’ll be even more amazing.",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
    },
    {
      name: "Sarah A.",
      avatarUrl:
        "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      comment: "Here!",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
    },
    {
      name: "John D.",
      avatarUrl:
        "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      comment: "Good!",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
    },
  ],
  reactions: [
    {
      comment: "This is a great feature!",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      reactions: [
        {
          name: "John Doe",
          emoji: "👍",
        },
        {
          name: "Jane Smith",
          emoji: "👍",
        },
        {
          name: "Alex Johnson",
          emoji: "🔥",
        },
      ],
    },
    {
      comment: "Let's implement this change",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      reactions: [
        {
          name: "Sarah Wilson",
          emoji: "✅",
        },
        {
          name: "Mike Brown",
          emoji: "👍",
        },
      ],
    },
    {
      comment: "I found a bug in this section",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      reactions: [
        {
          name: "Emily Davis",
          emoji: "👏",
        },
      ],
    },
    {
      comment: "The design looks perfect",
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      reactions: [
        {
          name: "Chris Taylor",
          emoji: "👍",
        },
      ],
    },
  ],
  resolutions: [
    {
      name: "John Doe",
      resolved: true,
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      rootComment: {
        body: "cc: @<sarah@plasmic.app> Can you increase the font size?",
        name: "Chris Taylor",
        avatarUrl:
          "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      },
    },
    {
      name: "John Doe",
      resolved: false,
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      rootComment: {
        body: "Remove the padding",
        name: "Sarah Ahmed",
        avatarUrl:
          "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      },
    },
    {
      name: "Alex Johnson",
      resolved: true,
      link: "https://studio.plasmic.app/projects/4TLostoyTfLH5mX3DAFyDk/-/Homepage?arena_type=page&arena=WD_TUoTZLAp6",
      rootComment: {
        body: "Add a border",
        name: "Ali Ahmed",
        avatarUrl:
          "https://lh3.googleusercontent.com/a/ACg8ocLUgcV4UqX75IchRDB8Lza2hCZuW1AqqUjVfRrws_SLukggYyY=s96-c",
      },
    },
  ],
}; // The props to pass to the Plasmic component

const html = await generateEmailHtml(TEMPLATE_NAME, TEMPLATE_PROPS);

const args = await yargs(hideBin(process.argv)).option("email", {
  type: "string",
  description: "Email address to send the email to",
}).argv;

const outputPath = `out/${TEMPLATE_NAME}.html`;
await writeHtmlToFile(html, outputPath);
logger.info(`HTML saved to ${outputPath}. Open in the browser to preview!`);

if (args.email) {
  try {
    await createMailer({ prod: true }).sendMail({
      from: "test@plasmic.app",
      to: [args.email],
      subject: "Test email",
      html,
    });
    logger.info(`Email sent to ${args.email}`);
  } catch (err) {
    logger.error("Error sending email", err);
  }
}
