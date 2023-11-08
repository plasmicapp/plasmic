import fs from "fs";
import path from "path";
import { Connection } from "typeorm";

export async function initDb(con: Connection) {
  const setup = fs
    .readFileSync(path.join(__dirname, "ticketing.sql"))
    .toString();

  await con.query(setup);
}
