import { isValidEmail } from "@/wab/shared/common";
import { getIntercomToken } from "@/wab/server/secrets";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import axios from "axios";
import { Request, Response } from "express-serve-static-core";

async function addUser(email: string) {
  const intercomToken = getIntercomToken();
  const resp = await axios({
    method: "post",
    url: `https://api.intercom.io/contacts/`,
    headers: {
      Authorization: `Bearer ${intercomToken}`,
      Accept: "application/json",
    },
    data: {
      role: "user",
      email,
    },
  });
  return resp;
}

export async function subscribe(req: Request, res: Response) {
  const email = req.body.email;
  if (!email.trim() || !isValidEmail(email)) {
    throw new BadRequestError(`Invalid email ${email}`);
  }

  // Upload to Intercom in idempotent way
  // https://developers.intercom.com/intercom-api-reference/reference#create-contact
  // should get a 200 with contact model here if succeed
  // should get a 409 error if email already exists
  const user = await addUser(email);
  res.json({});
}
