import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { makeUserTraits } from "@/wab/server/routes/util";
import { getSegmentWriteKey } from "@/wab/server/secrets";
import Analytics from "analytics-node";
import { EntityManager } from "typeorm";

export async function reIdentifyUsers(em: EntityManager) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const users = await dbMgr.listAllUsers();
  console.log(`Identifiying ${users.length} users...`);
  const analytics = new Analytics(getSegmentWriteKey());
  for (const user of users) {
    analytics.identify({
      userId: user.id,
      traits: makeUserTraits(user),
    });
  }

  await flush(analytics);
}

async function flush(analytics: Analytics) {
  return new Promise<void>((resolve, reject) => {
    analytics.flush((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
