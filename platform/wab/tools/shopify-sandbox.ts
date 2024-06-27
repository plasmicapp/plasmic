import * as fs from "fs";
import * as repl from "repl";
import { getConnection } from "typeorm";
import {
  bytesToHex,
  stringToUTF8Bytes,
} from "../src/wab/commons/string-encodings";
import { loadConfig } from "../src/wab/server/config";
import { ensureDbConnection } from "../src/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "../src/wab/server/db/DbMgr";
import {
  addShopify,
  getShopifyClientForUserId,
  shopifyPostInstallSetup,
} from "../src/wab/server/routes/shopify";
import { ensure, spawn } from "../src/wab/shared/common";

async function getClientFor(db: DbMgr, email: string) {
  const user = await db.getUserByEmail(email);
  return getShopifyClientForUserId(db, user.id);
}

async function main() {
  const config = loadConfig(process.env.CONFIG_FILE);
  await ensureDbConnection(config.databaseUri);
  const connectionPool = getConnection();
  await connectionPool.transaction(async (txMgr) => {
    const db = new DbMgr(txMgr, SUPER_USER);
    const { session, client } = await getClientFor(db, process.argv[2]);
    addShopify(config, session.shop);
    switch (process.argv[3]) {
      case "repl":
        Object.assign(repl.start("> ").context, { db, client, getClientFor });
        break;
      case "setup":
        await shopifyPostInstallSetup(client);
        break;
      case "force-setup":
        await shopifyPostInstallSetup(client, { force: true });
        break;
      case "encode-origin": {
        const combined = bytesToHex(stringToUTF8Bytes(process.argv[4]));
        console.log(combined.slice(0, 63));
        break;
      }
      case "set-cookies":
        await db.setKeyValue(
          "shopify-store-data",
          ensure(process.argv[4]),
          JSON.stringify({ cookies: ensure(process.argv[5]) })
        );
        break;
      case "get-token": {
        const user = await db.getUserByEmail(process.argv[2]);
        const token = await db.tryGetOauthToken(user.id, "shopify");
        console.log(JSON.stringify(token, null, 2));
        break;
      }
      case "set-token": {
        const user = await db.getUserByEmail(process.argv[2]);
        await db.upsertOauthToken(
          user.id,
          "shopify",
          JSON.parse(fs.readFileSync(process.argv[4], "utf8")),
          {}
        );
        break;
      }
    }
  });
}

spawn(main());
