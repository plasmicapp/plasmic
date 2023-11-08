import { RefactorSvc } from "../server/RefactorSvc";
import { startTsSvc } from "../server/TsSvc";
import { setupRefactorProject } from "../test/eval";
import { RefactorClient } from "./RefactorClient";

describe("RefactorClient", () => {
  it("works", async () => {
    const { parts, site, tplMgr } = setupRefactorProject();
    const ts = await startTsSvc();
    try {
      const svc = new RefactorSvc(ts);
      const client = new RefactorClient((req) => svc.findFreeVars(req));
      for (const part of parts) {
        const freeVars = await client.findFreeVars(part, tplMgr, site);
        expect(freeVars).toEqual({ myNum: "number" });
      }
    } finally {
      await ts.stop();
    }
  }, 90000);
});
