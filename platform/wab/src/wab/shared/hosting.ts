import type {
  SetCustomDomainForProjectResponse,
  SetDomainOperation,
  SetDomainOutcome,
} from "@/wab/shared/ApiSchema";
import { maybeOne } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import L from "lodash";

export class DomainValidator {
  constructor(private suffix: string) {}

  isValidDomain(domain: string) {
    return (
      domain.includes(".") &&
      domain.split(".").every((part) => !!part.match(/^[\w-]+$/))
    );
  }

  parseSubdomainPart(domain: string) {
    return domain.match(
      new RegExp(`^([\\w-]+)\\.${L.escapeRegExp(this.suffix)}$`)
    )?.[1];
  }

  isValidSubdomain(domain: string) {
    return !!this.parseSubdomainPart(domain);
  }

  isAnyPlasmicDomain(domain: string) {
    return !!domain.match(/(.*\.)?plasmic\.\w+$/);
  }

  isValidDomainOrSubdomain(domain: string) {
    return (
      this.isValidDomain(domain) &&
      (!domain.endsWith("." + this.suffix) || this.isValidSubdomain(domain))
    );
  }

  extractSubdomain(domains: string[]): string | undefined {
    return maybeOne(domains.filter((dom) => this.isValidSubdomain(dom)));
  }

  extractCustomDomain(domains: string[]): string | undefined {
    const customDomains = domains.filter((dom) => !this.isValidSubdomain(dom));
    // Prefer the www, which is canonical
    const wwwDomain = domains.find((dom) => dom.startsWith("www."));
    return wwwDomain ?? maybeOne(customDomains);
  }
}

export interface SetCustomDomainFailure extends SetDomainOutcome {
  /** The domain the failure is about; "" when the server didn't say. */
  domain: string;
}

/**
 * Setting and removing a custom domain both return 200 with a per-domain outcome,
 * and only `domains[""].status === "DomainUpdated"` means the change went through.
 */
export function getSetCustomDomainFailure(
  response: SetCustomDomainForProjectResponse
): SetCustomDomainFailure | undefined {
  if (response.domains[""]?.status === "DomainUpdated") {
    return undefined;
  }
  const [domain, outcome] = Object.entries(response.domains)[0] ?? [
    "",
    { status: "OtherDomainError" as const },
  ];
  return { domain, ...outcome };
}

/**
 * Submitting a new domain can fail while freeing the one the project is currently
 * saved on, so that's what we report to the user.
 */
export function pickFailedOperation(
  failure: SetCustomDomainFailure,
  submittedDomain?: string
): SetDomainOperation {
  return failure.operation ?? (submittedDomain ? "register" : "remove");
}

// Shared instance for validating Plasmic Hosting domains/subdomains.
// Centralize the configuration so all server and shared utilities use
// the same suffix (from DEVFLAGS).
export const PLASMIC_HOSTING_DOMAIN_VALIDATOR = new DomainValidator(
  DEVFLAGS.plasmicHostingSubdomainSuffix
);
