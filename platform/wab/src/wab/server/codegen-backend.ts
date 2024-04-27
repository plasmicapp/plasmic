// tslint:disable:ordered-imports
import { spawn } from "@/wab/common";
import { codegenBackendMain } from "@/wab/server/codegen-backend-real";

if (require.main === module) {
  spawn(codegenBackendMain());
}
