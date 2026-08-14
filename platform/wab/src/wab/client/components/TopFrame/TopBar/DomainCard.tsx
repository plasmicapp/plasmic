import { apiKey } from "@/wab/client/api";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultDomainCardProps,
  PlasmicDomainCard,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicDomainCard";
import {
  ApiProject,
  CheckDomainResponse,
  SetDomainOperation,
  SetDomainStatus,
} from "@/wab/shared/ApiSchema";
import { spawn, spawnWrapper } from "@/wab/shared/common";
import {
  getSetCustomDomainFailure,
  pickFailedOperation,
} from "@/wab/shared/hosting";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import * as tldts from "tldts";

export interface DomainCardError {
  /** Undefined when the request threw rather than returning a status. */
  status?: SetDomainStatus;
  /** Vercel's error code, for support to diagnose from a screenshot. */
  vercelErrorCode?: string;
  /** Raw error message, shown for failures we have no copy for. */
  message?: string;
  /** Attempted operation, only changes the copy. */
  operation: SetDomainOperation;
}

export interface DomainCardProps extends DefaultDomainCardProps {
  domain: string;
  project: ApiProject;
  /** This is a redirect domain */
  isSecondary?: boolean;
  /** Set when the last attempt to register this domain failed. */
  setError?: DomainCardError;
  /**
   * Set when this card is for a domain that isn't saved on the project, i.e. one
   * we failed to register. Removing it would delete whatever domain the project
   * is serving on, so we only dismiss the card.
   */
  onDismiss?: () => void;
  onRemoved?: () => void;
}

/**
 * DNS instructions are only actionable when the domain was registered, for every
 * other failure they're misleading, so we show what really went wrong.
 */
export function renderDomainErrorMessage(
  domain: string,
  { status, vercelErrorCode, message, operation }: DomainCardError
) {
  const suffix = vercelErrorCode ? ` (${vercelErrorCode})` : "";
  const done = operation === "remove" ? "removed" : "registered";
  switch (status) {
    case "DomainUsedElsewhereInPlasmic":
      return `${domain} is already used by another Plasmic project, please remove it there first.`;
    case "DomainUsedElsewhereInVercel":
      return `${domain} is owned by another account on our hosting provider. Contact support to request access${suffix}.`;
    case "DomainInvalid":
      return `${domain} is not a valid domain for Plasmic hosting.`;
    case "VercelAuthError":
      return `Plasmic couldn't reach our hosting provider to ${operation} ${domain}. Please contact support.`;
    default:
      return message
        ? `${domain} couldn't be ${done}: ${message}`
        : `${domain} couldn't be ${done}${suffix}. Please contact support.`;
  }
}

function DomainCard_(
  {
    domain,
    project,
    isSecondary = false,
    setError,
    onDismiss,
    onRemoved,
    ...rest
  }: DomainCardProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();
  const api = appCtx.api;
  const projectId = project.id;

  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<DomainCardError | undefined>(
    undefined
  );
  const subdomain = domain && tldts.parse(domain).subdomain; // if domain is a subdomain

  const [explicitRecordType, setExplicitRecordType] = useState<
    "cname" | "apex" | undefined
  >(undefined);

  const recordType = explicitRecordType ?? (subdomain ? "cname" : "apex");

  const effDom =
    recordType === "cname" && !subdomain ? `www.${domain}` : domain;
  const checkKey = apiKey(`checkDomain`, effDom);

  const [freshKey, setFreshKey] = useState<string | undefined>(undefined);
  const { data: domainStatus, isValidating } = useSWR<CheckDomainResponse>(
    checkKey,
    () => api.checkDomain(effDom),
    {
      revalidateOnMount: true,
      // Check once if errored since a rejected domain won't magically become configured.
      refreshInterval: (latest) =>
        setError ||
        removeError ||
        (latest?.status?.isValid && latest?.status?.isCorrectlyConfigured)
          ? 0
          : 5000,
      dedupingInterval: 1500,
      onSuccess: (_data, key) => setFreshKey(key),
    }
  );
  // Avoid serving a stale SWR cache result. isCorrectlyConfigured can be shown
  // right away, but we shouldn't flash a stale error.
  const trustedStatus =
    freshKey === checkKey ||
    (domainStatus?.status.isValid && domainStatus.status.isCorrectlyConfigured)
      ? domainStatus?.status
      : undefined;
  const isCorrect =
    trustedStatus?.isValid && trustedStatus.isCorrectlyConfigured;
  // We couldn't check, so we don't know that anything is wrong with their DNS.
  const configCheckFailed =
    trustedStatus?.isValid && trustedStatus.configCheckFailed;

  // A registration failure for a saved domain is stale once the check shows it serving.
  // A candidate's domain stays unregistered no matter what its DNS says.
  const staleSetError =
    setError?.operation === "register" && !onDismiss && isCorrect;

  const errorMessage = removeError
    ? renderDomainErrorMessage(domain, removeError)
    : setError && !staleSetError
    ? renderDomainErrorMessage(domain, setError)
    : undefined;

  return (
    <PlasmicDomainCard
      root={{
        props: { ref, "data-test-id": "domain-card", key: domain },
      }}
      {...rest}
      refreshing={isValidating}
      error={errorMessage ? "error" : isCorrect ? "success" : recordType}
      domainErrorMessage4={
        errorMessage
          ? { children: errorMessage }
          : configCheckFailed
          ? {
              // Stays in the cname/apex variant so the DNS instructions keep
              // matching the record type, only the feedback note changes.
              children: `We couldn't check the configuration of ${domain} right now. If the site is live, it will keep working.`,
            }
          : undefined
      }
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
        onClick: () => spawn(mutate(checkKey)),
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
      removeButton={
        onDismiss
          ? {
              children: "Dismiss",
              onClick: () => onDismiss(),
            }
          : {
              disabled: removing,
              onClick: spawnWrapper(async () => {
                setRemoving(true);
                try {
                  const response = await api.setCustomDomainForProject(
                    undefined,
                    projectId
                  );
                  await mutate(apiKey("getDomainsForProject", projectId));
                  const failure = getSetCustomDomainFailure(response);
                  if (failure) {
                    // Domain is still registered and serving the project, so the card stays.
                    setRemoveError({
                      status: failure.status,
                      vercelErrorCode: failure.vercelErrorCode,
                      operation: pickFailedOperation(failure),
                    });
                    return;
                  }
                  setRemoveError(undefined);
                  onRemoved?.();
                } catch (err) {
                  setRemoveError({
                    message: err instanceof Error ? err.message : undefined,
                    operation: "remove",
                  });
                } finally {
                  setRemoving(false);
                }
              }),
            }
      }
    />
  );
}

const DomainCard = React.forwardRef(DomainCard_);
export default DomainCard;
