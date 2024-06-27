// tslint:disable:ordered-imports
import { spawn } from "@/wab/shared/common";
import { codegenBackendMain } from "@/wab/server/codegen-backend-real";

if (require.main === module) {
  spawn(codegenBackendMain());
}
