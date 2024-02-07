// tslint:disable:ordered-imports
import { spawn } from "@/wab/common";
import { codegenBackendMain } from "./codegen-backend-real";

if (require.main === module) {
  spawn(codegenBackendMain());
}
