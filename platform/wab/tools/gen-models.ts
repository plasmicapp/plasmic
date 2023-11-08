import {
  writeClassesMetas,
  writeTypescriptClasses,
} from "../src/wab/model/model-generator";
import { schema } from "../src/wab/model/model-schema";

writeTypescriptClasses(schema, "src/wab/classes.ts");
writeClassesMetas(schema, "src/wab/classes-metas.ts");
