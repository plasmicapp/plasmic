import { maybe } from "@/wab/common";
import { DevFlagsType } from "@/wab/devflags";
import { ApiProject } from "./ApiSchema";
import { DomainValidator } from "./hosting";

/**
 * This does not also include the projectRepository.cachedCname, since it's legacy.
 */
export function prodUrlForProject(
  devflags: DevFlagsType,
  project: Pick<ApiProject, "extraData" | "hostUrl">,
  plasmicHostingDomains: string[]
) {
  const domainValidator = new DomainValidator(
    devflags.plasmicHostingSubdomainSuffix
  );

  return (
    project.extraData?.prodUrl ||
    maybe(project.hostUrl, (url) => new URL(url).origin) ||
    maybe(
      domainValidator.extractCustomDomain(plasmicHostingDomains),
      (u) => "https://" + u
    ) ||
    maybe(
      domainValidator.extractSubdomain(plasmicHostingDomains),
      (u) => "https://" + u
    )
  );
}
