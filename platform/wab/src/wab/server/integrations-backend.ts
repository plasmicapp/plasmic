// tslint:disable:ordered-imports
import "@/wab/server/integrations-backend-real";
import { spawn } from "@/wab/common";
import { serverDataBackendMain } from "@/wab/server/integrations-backend-real";
if (require.main === module) {
  spawn(serverDataBackendMain());
}
