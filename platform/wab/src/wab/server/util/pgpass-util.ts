import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function extractUsernameAndPasswordFromPgPass(username: string) {
  const pgPassPath = join(process.env.HOME || "/home/node", ".pgpass");
  if (!existsSync(pgPassPath)) {
    return { username, password: undefined };
  }
  const pgPassContent = readFileSync(pgPassPath, "utf-8");
  const linesOfPgPass = pgPassContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"));

  const pgPassEntry = linesOfPgPass
    .map((line) => {
      // Split only on first 4 colons to handle passwords with colons
      const parts = line.split(":");
      if (parts.length >= 5) {
        // Rejoin everything after the 4th colon as the password
        return [
          parts[0],
          parts[1],
          parts[2],
          parts[3],
          parts.slice(4).join(":"),
        ];
      }
      return parts;
    })
    .find((parts) => {
      const isValidPgPassLine = parts.length === 5;
      const usernameFromPgPass = parts[3];
      return isValidPgPassLine && usernameFromPgPass === username;
    });
  const password = pgPassEntry?.[4];
  return { username, password };
}
