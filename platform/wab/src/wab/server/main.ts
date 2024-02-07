// tslint:disable:ordered-imports
import { spawn } from "@/wab/common";
import { appBackendMain } from "./app-backend-real";
if (require.main === module) {
  spawn(appBackendMain());
}
