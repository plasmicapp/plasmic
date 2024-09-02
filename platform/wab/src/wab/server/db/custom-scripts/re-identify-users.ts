import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { makeUserTraits } from "@/wab/server/routes/util";
import { AMPLITUDE_API_KEY } from "@/wab/shared/analytics/AmplitudeAnalytics";
import { createInstance, Identify } from "@amplitude/analytics-node";
import { EntityManager } from "typeorm";

export async function reIdentifyUsers(em: EntityManager) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const users = await dbMgr.listAllUsers();

  console.log(`Identifying ${users.length} users...`);
  const amplitude = createInstance();
  amplitude.init(AMPLITUDE_API_KEY);
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
