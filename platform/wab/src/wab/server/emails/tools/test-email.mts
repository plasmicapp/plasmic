import { generateEmailHtml } from "@/wab/server/emails/tools/generate";
import * as fs from "fs";
import nodemailer from "nodemailer";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// NOTE: Customize the email template by changing the component name and its props below
const TEMPLATE_NAME = "Comments"; // The Plasmic component name representing an email template
const TEMPLATE_PROPS = {
  projectName: "Plexus Main",
  projectUrl: "https://studio.plasmic.app",
  userName: "Sarah Ahmed",
  comments: [
    {
      name: "Dinesh C.",
      avatarUrl: "",
      comment:
        "🔥 really impressive! The structure is solid, and I can see the thought you put into it. A couple of minor tweaks with the colors, and I think it’ll be even more amazing.",
    },
    {
      name: "Sarah A.",
      avatarUrl: "",
      comment: "# Hello\nworld",
    },
    {
      name: "John D.",
      avatarUrl: "",
      comment: "Good!",
    },
  ],
  replies: [
    {
      rootComment: {
        name: "Sarah Ahmed",
        body: "🔥 really impressive! The structure is solid, and I can see the thought you put into it. A couple of minor tweaks with the colors, and I think it’ll be even more amazing.",
      },
      replies: [
        {
          name: "John D.",
          avatarUrl: "",
          comment: "Sounds good!",
        },
        {
          name: "Sarah A.",
          avatarUrl: "",
          comment: "Ok!",
        },
      ],
    },
    {
      rootComment: {
        name: "Hannah Amin",
        body: "Lorem Ipsum dolor sit amit",
      },
      replies: [
        {
          name: "John D.",
          avatarUrl: "",
          comment: "Great!",
        },
      ],
    },
  ],
  mentions: [
    {
      name: "Dinesh C.",
      avatarUrl: "",
      comment:
        "🔥 really impressive! The structure is solid, and I can see the thought you put into it. A couple of minor tweaks with the colors, and I think it’ll be even more amazing.",
    },
    {
      name: "Sarah A.",
      avatarUrl: "",
      comment: "Here!",
    },
    {
      name: "John D.",
      avatarUrl: "",
      comment: "Good!",
    },
  ],
  reactions: [
    {
      comment: "This is a great feature!",
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
      reactions: [
        {
          name: "Emily Davis",
          emoji: "👏",
        },
      ],
    },
    {
      comment: "The design looks perfect",
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
      rootComment: {
        body: "cc: @<sarah@plasmic.app> Can you increase the font size?",
        name: "Chris Taylor",
      },
    },
    {
      name: "John Doe",
      resolved: false,
      rootComment: {
        body: "Remove the padding",
        name: "Sarah Ahmed",
      },
    },
    {
      name: "Alex Johnson",
      resolved: true,
      rootComment: {
        body: "Add a border",
        name: "Ali Ahmed",
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
console.log(`HTML saved to ${outputPath}. Open in the browser to preview!`);

if (args.email) {
  const transporter = nodemailer.createTransport({
    host: "email-smtp.us-west-2.amazonaws.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASSWORD,
    },
  });

  transporter.sendMail(
    {
      from: "test@plasmic.app",
      to: [args.email],
      subject: "Test email",
      html,
    },
    (err, info) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`Email sent to ${args.email}. Email ID: ${info.messageId}`);
    }
  );
}

/**
 * Writes HTML content to a file
 * @param htmlContent The HTML content to write
 * @param outputPath The path where the HTML file should be written
 * @returns Promise that resolves when the file is written
 */
export async function writeHtmlToFile(
  htmlContent: string,
  filePath: string = "out/output.html"
): Promise<void> {
  // Ensure the output directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, htmlContent, "utf8", (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
