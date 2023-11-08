import fs from "fs";
import path from "path";
import { Connection } from "typeorm";

export async function initDb(con: Connection) {
  const ddl = fs
    .readFileSync(path.join(__dirname, "pokedex_ddl.sql"))
    .toString();

  await con.query(ddl);

  const data = fs
    .readFileSync(path.join(__dirname, "pokedex_data.sql"))
    .toString();

  await con.query(data);
}
