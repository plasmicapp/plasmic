import { apiKey } from "@/wab/client/api";
import {
  useGetDomainsForProject,
  usePlasmicHostingSettings,
} from "@/wab/client/api-hooks";
import DomainCard, {
  DomainCardError,
} from "@/wab/client/components/TopFrame/TopBar/DomainCard";
import {
  canUpgradeTeam,
  promptBilling,
} from "@/wab/client/components/modals/PricingModal";
import { ImageUploader } from "@/wab/client/components/style-controls/ImageSelector";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultPlasmicHostingSettingsProps,
  PlasmicPlasmicHostingSettings,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicPlasmicHostingSettings";
import { checkIsOrgOnFreeTierOrTrial } from "@/wab/client/studio-ctx/StudioCtx";
import useDebounce from "@/wab/commons/components/use-debounce";
import { ApiProject, CheckDomainResponse } from "@/wab/shared/ApiSchema";
import { spawn, spawnWrapper } from "@/wab/shared/common";
import { imageDataUriToBlob } from "@/wab/shared/data-urls";
import {
  DomainValidator,
  getSetCustomDomainFailure,
  pickFailedOperation,
} from "@/wab/shared/hosting";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useEffect, useState } from "react";
import { FaUpload } from "react-icons/fa";
import useSWR, { mutate } from "swr";
import * as tldts from "tldts";

export interface PlasmicHostingSettingsProps
  extends DefaultPlasmicHostingSettingsProps {
  project: ApiProject;
  refreshProjectAndPerms: () => void;
  onRemove: () => void;
}

interface HostingSettings {
  subdomain: string;
  customDomain: string;
}

/** www.example.com and example.com are the same site to us. */
function withoutWww(domain: string) {
  return tldts.parse(domain).subdomain === "www" ? domain.slice(4) : domain;
}

/**
 * Which domain cards to render, given the domain saved on the project and the
 * domain the last failed attempt was about.
 *
 * A failed attempt never replaces the domain the project is serving on, so a
 * rejected candidate gets a card of its own: removing a domain from the project
 * is only offered on the card of the domain that is actually saved.
 */
export function pickDomainCards(
  savedDomain: string | undefined,
  failedDomain: string | undefined
) {
  // www.example.com and example.com register as a pair. Either form may be the
  // saved canonical, and each needs DNS instructions, they get their own cards.
  // A subdomain like foo.example.com stands alone.
  const apexDomain = savedDomain && withoutWww(savedDomain);
  const secondaryDomain =
    apexDomain && !tldts.parse(apexDomain).subdomain
      ? savedDomain === apexDomain
        ? "www." + apexDomain
        : apexDomain
      : undefined;
  const isAboutSavedDomain =
    !!failedDomain &&
    !!savedDomain &&
    withoutWww(failedDomain) === withoutWww(savedDomain);
  return {
    savedDomain,
    secondaryDomain,
    candidateDomain: isAboutSavedDomain ? undefined : failedDomain,
    // Show a failure about the saved domain on the card that names it, falling
    // back to the primary card.
    erroredDomain: !isAboutSavedDomain
      ? undefined
      : failedDomain === secondaryDomain
      ? secondaryDomain
      : savedDomain,
  };
}

function mkDomainCardError(error: any): DomainCardError {
  return {
    status: error.code,
    vercelErrorCode: error.vercelErrorCode,
    // Only meaningful when the request threw instead of returning a status;
    // otherwise `message` is just the status string.
    message: error.code ? undefined : error.message,
    operation: error.operation,
  };
}

function PlasmicHostingSettings_(
  {
    project,
    refreshProjectAndPerms,
    onRemove: _onRemove,
    ...rest
  }: PlasmicHostingSettingsProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();
  const appConfig = appCtx.appConfig;
  const api = appCtx.api;
  const projectId = project.id;
  const projectTeam = appCtx.teams.find((team) => team.id === project.teamId);
  const isOrgOnFreeTierOrTrial = checkIsOrgOnFreeTierOrTrial(projectTeam);

  const { data: domainsResult } = useGetDomainsForProject(projectId);
  const { data: hostingSettings, mutate: mutateHostingSettings } =
    usePlasmicHostingSettings(projectId);

  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const [data, setData] = useState<HostingSettings>({
    subdomain: "",
    customDomain: "",
  });

  const domainValidator = new DomainValidator(
    appConfig.plasmicHostingSubdomainSuffix
  );

  const settings: HostingSettings = {
    subdomain:
      domainValidator.parseSubdomainPart(
        domainValidator.extractSubdomain(domainsResult?.domains ?? []) ?? ""
      ) ?? "",
    customDomain:
      domainValidator.extractCustomDomain(domainsResult?.domains ?? []) ?? "",
  };

  useEffect(() => {
    if (settings) {
      setData(settings);
    }
  }, [JSON.stringify(settings)]);

  const [showDomainCardFor, setShowDomainCardFor] = useState<string | null>(
    null
  );

  useEffect(() => {
    setShowDomainCardFor(settings.customDomain || null);
  }, [settings.customDomain]);

  const debouncedSubdomain = useDebounce(data.subdomain, 1500);
  const { data: domainStatus } = useSWR(
    debouncedSubdomain ? ([`checkDomain`, debouncedSubdomain] as const) : null,
    async ([_key, subdomainToCheck]): Promise<
      CheckDomainResponse & { domain: string; subdomain: string }
    > => {
      const domainToCheck = `${debouncedSubdomain}.${appConfig.plasmicHostingSubdomainSuffix}`;
      try {
        const response = await api.checkDomain(domainToCheck);
        return {
          domain: domainToCheck,
          subdomain: subdomainToCheck,
          ...response,
        };
      } catch (err) {
        console.error(err);
        return {
          domain: domainToCheck,
          subdomain: subdomainToCheck,
          status: {
            isValid: false,
          },
        };
      }
    },
    {
      shouldRetryOnError: false,
    }
  );

  async function handleCustomDomain() {
    const fullCustomDomain = data.customDomain;
    // The server expands to the www/non-www pair either way.
    const customDomain = withoutWww(fullCustomDomain);

    setAdding(true);

    try {
      const response = await api.setCustomDomainForProject(
        customDomain || undefined,
        projectId
      );

      const failure = getSetCustomDomainFailure(response);
      if (failure) {
        const failedDomain = failure.domain || fullCustomDomain;
        setError({
          code: failure.status,
          domain: failedDomain,
          message: failure.status,
          vercelErrorCode: failure.vercelErrorCode,
          operation: pickFailedOperation(failure, customDomain),
        });
        setShowDomainCardFor(failedDomain);
        spawn(mutate(apiKey("checkDomain", failedDomain)));
        return;
      }
      setError(null);

      await mutate(apiKey("getDomainsForProject", projectId));
    } catch (err) {
      // The request threw, so the server never said which domain the failure
      // is about; pin it to the attempted one, or the error would track
      // whatever is typed into the input next.
      const failedDomain = fullCustomDomain || settings.customDomain;
      setError({
        domain: failedDomain,
        message: err instanceof Error ? err.message : String(err),
        operation: customDomain ? "register" : "remove",
      });
      setShowDomainCardFor(failedDomain || null);
      if (failedDomain) {
        spawn(mutate(apiKey("checkDomain", failedDomain)));
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <PlasmicPlasmicHostingSettings
      root={{ ref }}
      {...rest}
      subdomain={
        domainStatus && !domainStatus.status.isValid
          ? "error"
          : saving
          ? "loading"
          : undefined
      }
      subdomainSuffix={"." + appConfig.plasmicHostingSubdomainSuffix}
      subdomainForm={{
        onSubmit: spawnWrapper(async (e) => {
          e.preventDefault();
          setSaving(true);
          const subdomain = data.subdomain
            ? data.subdomain.toLowerCase()
            : undefined;
          try {
            await api.setSubdomainForProject(
              subdomain
                ? `${subdomain}.${appConfig.plasmicHostingSubdomainSuffix}`
                : undefined,
              projectId
            );
            await mutate(apiKey("getDomainsForProject", projectId));
          } finally {
            setSaving(false);
          }
        }),
      }}
      subdomainInput={{
        value: data.subdomain,
        onChange: (e) => {
          const subdomain = e.target.value;
          setData((data_) => ({
            ...data_,
            subdomain: subdomain,
          }));
        },
      }}
      saveSubdomainButton={{
        htmlType: "submit",
        // checked domain must be different from the saved one
        disabled:
          !domainStatus || // domain must be checked
          !domainStatus.status.isValid || // checked domain must be valid
          domainStatus.subdomain !== data.subdomain || // checked domain must be the same as the one in the input
          data.subdomain === settings.subdomain,
      }}
      subdomainErrorFeedback={{
        children: domainStatus ? (
          <>
            <strong>{domainStatus.domain}</strong> is not available. Please
            choose another subdomain.
          </>
        ) : (
          <></>
        ),
      }}
      customDomain={
        settings.customDomain || showDomainCardFor
          ? "added"
          : adding
          ? "loading"
          : error
          ? "preliminaryError"
          : undefined
      }
      customDomainForm={{
        onSubmit: (e) => {
          e.preventDefault();
          spawn(handleCustomDomain());
        },
      }}
      customDomainInput={{
        value: data.customDomain || "",
        onChange: (e) => {
          const customDomain = e.target.value;
          setData((data_) => ({
            ...data_,
            customDomain,
          }));
        },
      }}
      customDomainPreliminaryErrorFeedback={{
        children:
          !showDomainCardFor && error ? (
            <p>
              <strong>{String(error.domain || "")}</strong>:{" "}
              {String(error.message || "Unable to set domain")}
            </p>
          ) : null,
      }}
      addCustomDomainButton={{
        htmlType: "submit",
        disabled: !error && settings.customDomain === data.customDomain,
      }}
      domainCard={{
        wrap: (_node) => {
          const {
            savedDomain,
            secondaryDomain,
            candidateDomain,
            erroredDomain,
          } = pickDomainCards(
            settings.customDomain || undefined,
            error ? error.domain || undefined : undefined
          );
          if (!savedDomain && !candidateDomain) {
            return null;
          }
          const setErrorFor = (
            cardDomain: string
          ): DomainCardError | undefined =>
            error && cardDomain === erroredDomain
              ? mkDomainCardError(error)
              : undefined;
          const onDismiss = () => {
            setShowDomainCardFor(savedDomain ?? null);
            setError(null);
            setData((d) => ({ ...d, customDomain: savedDomain ?? "" }));
          };
          const onRemoved = () => {
            setShowDomainCardFor(null);
            setError(null);
            setData((d) => ({ ...d, customDomain: "" }));
          };
          return (
            <>
              {candidateDomain && (
                <DomainCard
                  key={candidateDomain}
                  project={project}
                  domain={candidateDomain}
                  setError={mkDomainCardError(error)}
                  onDismiss={onDismiss}
                />
              )}
              {savedDomain && (
                <DomainCard
                  key={savedDomain}
                  project={project}
                  domain={savedDomain}
                  setError={setErrorFor(savedDomain)}
                  onRemoved={onRemoved}
                />
              )}
              {secondaryDomain && (
                <DomainCard
                  key={secondaryDomain}
                  project={project}
                  domain={secondaryDomain}
                  isSecondary
                  setError={setErrorFor(secondaryDomain)}
                  onRemoved={onRemoved}
                />
              )}
            </>
          );
        },
      }}
      showBadge={{
        isChecked: !project.extraData?.hideHostingBadge,
        onChange: (newValue) => {
          spawn(
            (async function () {
              await api.setShowHostingBadge(projectId, newValue);
              refreshProjectAndPerms();
            })()
          );
        },
        isDisabled: isOrgOnFreeTierOrTrial,
      }}
      paidFeaturesInfoText={
        !isOrgOnFreeTierOrTrial
          ? {
              render: () => null,
            }
          : null
      }
      upgradeNowLink={
        projectTeam && canUpgradeTeam(appCtx, projectTeam)
          ? {
              onClick: async () => {
                const { tiers } = await appCtx.api.listCurrentFeatureTiers();
                await promptBilling({
                  appCtx,
                  availableTiers: tiers,
                  title: "",
                  target: {},
                });
              },
            }
          : {
              render: () => null,
            }
      }
      faviconControlContainer={
        <div className="flex flex-vcenter gap-lg">
          {hostingSettings?.favicon && (
            <img
              src={hostingSettings.favicon.url}
              style={{ width: 32, height: 32 }}
            />
          )}
          <ImageUploader
            onUploaded={async (image, _file) => {
              await appCtx.app.withSpinner(
                (async () => {
                  const blob = imageDataUriToBlob(image.url);
                  const uploadedImage = await api.uploadImageFile({
                    imageFile: blob,
                  });
                  await api.updatePlasmicHostingSettings(projectId, {
                    favicon: {
                      url: uploadedImage.dataUri,
                      mimeType: uploadedImage.mimeType,
                    },
                  });
                  await mutateHostingSettings();
                })()
              );
            }}
            accept={".ico,.jpg,.jpeg,.png,.svg,.gif"}
            isDisabled={isOrgOnFreeTierOrTrial}
          >
            <div className="flex gap-sm dimfg p-sm">
              <FaUpload />
              <span>Upload</span>
            </div>
          </ImageUploader>
        </div>
      }
    />
  );
}

const PlasmicHostingSettings = React.forwardRef(PlasmicHostingSettings_);
export default PlasmicHostingSettings;
