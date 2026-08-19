import { verifyEmailHtml } from "@/wab/server/emails/email-html";
import { logger } from "@/wab/server/observability";
import { getResendApiKey, getSmtpAuth } from "@/wab/server/secrets";
import { ensure } from "@/wab/shared/common";
import { Transporter, createTransport } from "nodemailer";
import { Resend } from "resend";

export interface SendMailOptions {
  from: string;
  replyTo?: string;
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface Mailer {
  sendMail(mailOptions: SendMailOptions): Promise<void>;
}

class ResendMailer implements Mailer {
  constructor(private apiKey: string) {}
  async sendMail(mailOptions: SendMailOptions): Promise<void> {
    const resend = new Resend(this.apiKey);
    const content = mailOptions.html
      ? { html: mailOptions.html, text: mailOptions.text }
      : {
          text: ensure(
            mailOptions.text,
            "sendMail requires html or text content"
          ),
        };
    const { error } = await resend.emails.send({
      from: mailOptions.from,
      replyTo: mailOptions.replyTo,
      to: mailOptions.to,
      bcc: mailOptions.bcc,
      subject: mailOptions.subject,
      ...content,
    });
    if (error) {
      throw new Error(
        `Failed to send email "${mailOptions.subject}": ${error.name}: ${error.message}`
      );
    }
  }
}

class NodeMailer implements Mailer {
  constructor(private transporter: Transporter) {}
  async sendMail(mailOptions: SendMailOptions): Promise<void> {
    await this.transporter.sendMail(mailOptions);
  }
}

class ConsoleMailer implements Mailer {
  async sendMail(mailOptions: SendMailOptions): Promise<void> {
    logger().info(`SENDING MAIL TO CONSOLE`, mailOptions);

    // Run verification during development
    if (typeof mailOptions.html === "string") {
      verifyEmailHtml(mailOptions.html);
    }

    // Delay to simulate sending
    await new Promise((resolve) => setTimeout(resolve, 5000));
    logger().info(`MAIL SENT`);
  }
}

export function createMailer(): Mailer {
  if (process.env.NODE_ENV === "production") {
    const resendApiKey = getResendApiKey();
    if (resendApiKey) {
      return new ResendMailer(resendApiKey);
    }
    return new NodeMailer(
      createTransport({
        host: "email-smtp.us-west-2.amazonaws.com",
        port: 587,
        auth: getSmtpAuth(),
      })
    );
  } else {
    return new ConsoleMailer();
  }
}
