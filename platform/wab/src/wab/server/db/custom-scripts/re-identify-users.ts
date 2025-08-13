import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { logger } from "@/wab/server/observability";
import { makeUserTraits } from "@/wab/server/routes/util";
import { Identify, createInstance } from "@amplitude/analytics-node";
import { EntityManager } from "typeorm";

export async function reIdentifyUsers(em: EntityManager) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const users = await dbMgr.listAllUsers();

  logger().info(`Identifying ${users.length} users...`);
  const amplitude = createInstance();
  amplitude.init(process.env.AMPLITUDE_API_KEY!);
  for (const user of users) {
    const identify = new Identify();
    for (const [key, value] of Object.entries(makeUserTraits(user))) {
      identify.set(key, value);
    }
    amplitude.identify(identify, {
      user_id: user.id,
    });
  }

  await amplitude.flush().promise;
}
