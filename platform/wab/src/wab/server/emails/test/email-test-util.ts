import { Config } from "@/wab/server/config";
import type { Mailer } from "@/wab/server/emails/Mailer";
import { Request } from "express-serve-static-core";

export function setupEmailTest() {
  const config = {
    host: "https://studio.plasmic.app",
    mailFrom: "from@example.com",
    mailBcc: "bcc@example.com",
    mailUserOps: "ops@example.com",
  } as Config;
  const mailer = {
    sendMail: jest.fn(),
  } as jest.Mocked<Mailer>;
  const req = {
    config,
    mailer,
  } as Partial<Request> as Request;
  return { req, config, mailer };
}
