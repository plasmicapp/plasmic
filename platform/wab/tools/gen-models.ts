import {
  writeClassesMetas,
  writeTypescriptClasses,
} from "../src/wab/shared/model/model-generator";
import { schema } from "../src/wab/shared/model/model-schema";

writeTypescriptClasses(schema, "src/wab/shared/model/classes.ts");
writeClassesMetas(schema, "src/wab/shared/model/classes-metas.ts");
