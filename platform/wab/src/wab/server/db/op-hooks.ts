import { ProjectId } from "../../shared/ApiSchema";
import { DomainValidator } from "../../shared/hosting";
import { DbMgr } from "./DbMgr";

export async function onProjectDelete(
  dbMgr: DbMgr,
  projectId: ProjectId,
  domainValidator: DomainValidator
) {}
