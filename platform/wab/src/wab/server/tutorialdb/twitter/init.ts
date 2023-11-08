import fs from "fs";
import path from "path";
import { Connection } from "typeorm";

export async function initDb(con: Connection) {
  const ddl = fs.readFileSync(path.join(__dirname, "twitter.sql")).toString();

  await con.query(ddl);
}
