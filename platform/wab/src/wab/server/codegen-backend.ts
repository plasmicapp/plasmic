// tslint:disable:ordered-imports
import { spawn } from "@/wab/shared/common";
import { codegenBackendMain } from "@/wab/server/codegen-backend-real";
import { maybeStartGoogleCloudProfiler } from "@/wab/server/util/profiler";

if (require.main === module) {
  spawn(maybeStartGoogleCloudProfiler());
  spawn(codegenBackendMain());
}
