import { verifyEmailHtml } from "@/wab/server/emails/email-html";
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
    console.log(`SENDING MAIL TO CONSOLE`, mailOptions);

    // Run verification during development
    if (typeof mailOptions.html === "string") {
      verifyEmailHtml(mailOptions.html);
    }

    // Delay to simulate sending
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`MAIL SENT`);
  }
}

export function createMailer() {
  if (process.env.NODE_ENV === "production") {
    return new NodeMailer(
      createTransport({
        host: process.env.EMAIL_SMTP_HOST || "email-smtp.us-west-2.amazonaws.com",
        port: parseInt(process.env.EMAIL_SMTP_PORT || "587", 10),
        secure: process.env.EMAIL_SMTP_USE_TLS === "true",
        auth: {
          user: process.env.EMAIL_SMTP_USER,
          pass: process.env.EMAIL_SMTP_PASSWORD,
        },
      })
    );
  } else {
    return new ConsoleMailer();
  }
}
