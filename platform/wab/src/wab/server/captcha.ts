import { Request } from "express-serve-static-core";

export async function checkCaptchaToken(_opts: {
  req: Request;
  captchaToken: string;
  expectedAction: string;
}): Promise<void> {
  // stub
}
