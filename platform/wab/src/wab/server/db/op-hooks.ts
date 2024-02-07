import { ProjectId } from "@/wab/shared/ApiSchema";
import { DomainValidator } from "@/wab/shared/hosting";
import { DbMgr } from "./DbMgr";

export async function onProjectDelete(
  dbMgr: DbMgr,
  projectId: ProjectId,
  domainValidator: DomainValidator
) {}
