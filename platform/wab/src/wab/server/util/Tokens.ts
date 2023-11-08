import crypto from "crypto";

export function generateSomeApiToken() {
  return crypto.randomBytes(64).toString("base64").replace(/\W/g, "");
}
