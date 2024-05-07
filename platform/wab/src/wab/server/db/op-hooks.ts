import { DbMgr } from "@/wab/server/db/DbMgr";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { DomainValidator } from "@/wab/shared/hosting";

export async function onProjectDelete(
  dbMgr: DbMgr,
  projectId: ProjectId,
  domainValidator: DomainValidator
) {}
