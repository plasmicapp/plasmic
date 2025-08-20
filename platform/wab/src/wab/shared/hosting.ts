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

// Shared instance for validating Plasmic Hosting domains/subdomains.
// Centralize the configuration so all server and shared utilities use
// the same suffix (from DEVFLAGS).
export const PLASMIC_HOSTING_DOMAIN_VALIDATOR = new DomainValidator(
  DEVFLAGS.plasmicHostingSubdomainSuffix
);
