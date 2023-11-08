import { Connection } from "typeorm";
import { Task } from "./entities";

export async function initDb(con: Connection) {
  await con.synchronize();

  await con.transaction(async (entManager) => {
    const repo = entManager.getRepository(Task);
    await entManager.save([
      repo.create({ title: "Get milk" }),
      repo.create({
        title: "Build a Plasmic app",
        description: "I hear it's awesome!",
      }),
    ]);
  });
}
