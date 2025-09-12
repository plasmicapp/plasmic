import { verifyEmailHtml } from "@/wab/server/emails/email-html";
import { logger } from "@/wab/server/observability";
import { getSmtpAuth } from "@/wab/server/secrets";
import { createTransport, SentMessageInfo, Transporter } from "nodemailer";
import Mail from "nodemailer/lib/mailer";

export interface Mailer {
  sendMail(mailOptions: Mail.Options): Promise<SentMessageInfo>;
}

class NodeMailer implements Mailer {
  constructor(private transporter: Transporter) {}
  async sendMail(mailOptions: Mail.Options): Promise<SentMessageInfo> {
    return this.transporter.sendMail(mailOptions);
  }
}

class ConsoleMailer implements Mailer {
  async sendMail(mailOptions: Mail.Options): Promise<SentMessageInfo> {
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

export function createMailer() {
  if (process.env.NODE_ENV === "production") {
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
