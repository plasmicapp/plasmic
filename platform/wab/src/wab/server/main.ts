// tslint:disable:ordered-imports
import { spawn } from "@/wab/shared/common";
import { appBackendMain } from "@/wab/server/app-backend-real";
import { maybeStartGoogleCloudProfiler } from "@/wab/server/util/profiler";

if (require.main === module) {
  spawn(maybeStartGoogleCloudProfiler());
  spawn(appBackendMain());
}
