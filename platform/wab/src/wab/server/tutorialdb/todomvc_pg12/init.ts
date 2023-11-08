import fs from "fs";
import path from "path";
import { Connection } from "typeorm";

export async function initDb(con: Connection) {
  const setup = fs
    .readFileSync(path.join(__dirname, "todomvc_pg12.sql"))
    .toString();

  await con.query(setup);
}
