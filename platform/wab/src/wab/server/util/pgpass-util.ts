import * as fs from "fs";
import * as path from "path";

export function extractUsernameAndPasswordFromPgPass(username: string) {
  const pgPassPath = path.join(process.env.HOME || "/home/node", ".pgpass");
  if (!fs.existsSync(pgPassPath)) {
    return { username, password: undefined };
  }
  const pgPassContent = fs.readFileSync(pgPassPath, "utf-8");
  const linesOfPgPass = pgPassContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"));
  const pgPassEntry = linesOfPgPass
    .map((line) => line.split(":"))
    .find((parts) => {
      const isValidPgPassLine = parts.length === 5;
      const usernameFromPgPass = parts[3];
      return isValidPgPassLine && usernameFromPgPass === username;
    });
  const password = pgPassEntry?.[4];
  return { username, password };
}
