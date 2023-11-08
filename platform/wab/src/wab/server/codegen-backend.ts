// tslint:disable:ordered-imports
import { spawn } from "../common";
import { codegenBackendMain } from "./codegen-backend-real";

if (require.main === module) {
  spawn(codegenBackendMain());
}
