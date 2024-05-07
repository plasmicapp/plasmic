// tslint:disable:ordered-imports
import { spawn } from "@/wab/common";
import { appBackendMain } from "@/wab/server/app-backend-real";
if (require.main === module) {
  spawn(appBackendMain());
}
