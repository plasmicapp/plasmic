import { generateEmailHtml } from "@/wab/server/emails/templates/generate";
import * as fs from "fs";
import nodemailer from "nodemailer";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// NOTE: Customize the email template by changing the component name and its props below
const TEMPLATE_NAME = "TemplateTestEmail"; // The Plasmic component name representing an email template
const TEMPLATE_PROPS = {
  title: "Test Email",
  content: "This is test content.",
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
