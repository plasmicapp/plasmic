import { getSmtpPass } from "@/wab/server/secrets";
import { createTransport, SentMessageInfo, Transporter } from "nodemailer";
import Mail from "nodemailer/lib/mailer";

export class Mailer {
  constructor(private transporter: Transporter) {}
  async sendMail(mailOptions: Mail.Options): Promise<SentMessageInfo> {
    if (getSmtpPass()) {
      return this.transporter.sendMail(mailOptions);
    } else {
      console.log(`SENDING MAIL`, mailOptions);
    }
  }
}

export function createMailer() {
  return new Mailer(
    createTransport({
      host: "email-smtp.us-west-2.amazonaws.com",
      port: 587,
      auth: {
        user: "AKIA5VNZFKGRPSEJ6X6W",
        pass: getSmtpPass(),
      },
    })
  );
}
