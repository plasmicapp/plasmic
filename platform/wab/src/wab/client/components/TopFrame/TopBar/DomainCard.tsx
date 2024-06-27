import { apiKey } from "@/wab/client/api";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultDomainCardProps,
  PlasmicDomainCard,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicDomainCard";
import { spawn, spawnWrapper } from "@/wab/shared/common";
import { ApiProject, CheckDomainResponse } from "@/wab/shared/ApiSchema";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import * as tldts from "tldts";

export interface DomainCardProps extends DefaultDomainCardProps {
  domain: string;
  project: ApiProject;
  /** This is a redirect domain */
  isSecondary?: boolean;
}

function DomainCard_(
  { domain, project, isSecondary = false, ...rest }: DomainCardProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();
  const api = appCtx.api;
  const projectId = project.id;

  const { data: domainStatus, isValidating } = useSWR<CheckDomainResponse>(
    apiKey(`checkDomain`, domain),
    () => {
      const effDom =
        recordType === "cname" && !subdomain ? "www." + domain : domain;
      return api.checkDomain(effDom);
    },
    { revalidateOnMount: true, refreshInterval: 5000 }
  );
  const isCorrect =
    domainStatus?.status.isValid && domainStatus?.status.isCorrectlyConfigured;
  const [removing, setRemoving] = useState(false);
  const subdomain = domain && tldts.parse(domain).subdomain; // if domain is a subdomain

  const [explicitRecordType, setExplicitRecordType] = useState<
    "cname" | "apex" | undefined
  >(undefined);

  const recordType = explicitRecordType ?? (subdomain ? "cname" : "apex");

  return (
    <PlasmicDomainCard
      root={{
        props: { ref, "data-test-id": "domain-card" },
      }}
      {...rest}
      refreshing={isValidating}
      error={!isCorrect ? recordType : isCorrect ? "success" : undefined}
      name={
        recordType === "apex"
          ? "@"
          : recordType == "cname" && subdomain
          ? subdomain
          : "www"
      }
      label={
        isSecondary
          ? {
              children: "Redirect domain",
            }
          : {}
      }
      openButton={{
        href: `https://${domain}`,
        target: "_blank",
        rel: "noreferrer",
      }}
      refreshButton={{
        onClick: () => spawn(mutate(apiKey(`checkDomain`, domain))),
      }}
      cnameTab={{
        wrap: (node) => subdomain && node,
        onClick: () => setExplicitRecordType("cname"),
      }}
      apexTab={{
        wrap: (node) => !subdomain && node,
        props: { onClick: () => setExplicitRecordType("apex") },
      }}
      customDomainLabel={{
        children: domain,
      }}
      removeButton={{
        disabled: removing,
        onClick: spawnWrapper(async () => {
          setRemoving(false);
          try {
            await api.setCustomDomainForProject(undefined, projectId);
            await mutate(apiKey("getDomainsForProject", projectId));
          } catch (err) {
            alert("Error removing domain");
          } finally {
            setRemoving(true);
          }
        }),
      }}
    />
  );
}

const DomainCard = React.forwardRef(DomainCard_);
export default DomainCard;
