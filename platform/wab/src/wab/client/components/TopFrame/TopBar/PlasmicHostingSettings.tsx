import { apiKey } from "@/wab/client/api";
import {
  useGetDomainsForProject,
  usePlasmicHostingSettings,
} from "@/wab/client/api-hooks";
import DomainCard from "@/wab/client/components/TopFrame/TopBar/DomainCard";
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
import { ApiProject } from "@/wab/shared/ApiSchema";
import { spawn, spawnWrapper, strictIdentity } from "@/wab/shared/common";
import { imageDataUriToBlob } from "@/wab/shared/data-urls";
import { DomainValidator } from "@/wab/shared/hosting";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import { useEffect, useState } from "react";
import { FaUpload } from "react-icons/fa";
import { mutate } from "swr";
import * as tldts from "tldts";

strictIdentity(React);

// XXX
function useDebounce<T>(x: T, _n: number): [T] {
  return [x];
}

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

  const [debouncedSubdomain] = useDebounce(data.subdomain, 1500);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSubdomain() {
      try {
        const status = await api.checkDomain(
          `${debouncedSubdomain}.${appConfig.plasmicHostingSubdomainSuffix}`
        );

        setSubdomainError(
          status.status.isValid &&
            status.status.isPlasmicSubdomain &&
            status.status.isAvailable
            ? null
            : `${debouncedSubdomain}.${appConfig.plasmicHostingSubdomainSuffix}`
        );
      } catch (err) {
        console.error(err);
      }
    }

    if (debouncedSubdomain && debouncedSubdomain !== settings.subdomain) {
      spawn(checkSubdomain());
    }
  }, [debouncedSubdomain, settings.subdomain]);

  async function handleCustomDomain() {
    const fullCustomDomain = data.customDomain;
    const customDomain =
      tldts.parse(fullCustomDomain).subdomain === "www"
        ? fullCustomDomain.slice(4)
        : fullCustomDomain;

    setAdding(true);

    try {
      // It's OK for us to just set one domain for example.com instead of adding www.example.com as well because this the alias and redirect is handled by the backend - we only track the main domain.
      const response = await api.setCustomDomainForProject(
        customDomain || undefined,
        projectId
      );

      if (response.status[""] !== "DomainUpdated") {
        const [[errDomain, errMsg]] = Object.entries(response.status);
        setError({
          code: errMsg,
          domain: errDomain,
          message: errMsg,
        });
        setShowDomainCardFor(errDomain);
        spawn(mutate(apiKey("checkDomain", errDomain)));
        return;
      }
      setError(null);

      await mutate(apiKey("getDomainsForProject", projectId));
    } catch (err) {
      setError(err);
      setShowDomainCardFor(fullCustomDomain);
      spawn(mutate(apiKey("checkDomain", fullCustomDomain)));
    } finally {
      setAdding(false);
    }
  }

  return (
    <PlasmicPlasmicHostingSettings
      root={{ ref }}
      {...rest}
      subdomain={subdomainError ? "error" : saving ? "loading" : undefined}
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
        disabled: !subdomainError && settings.subdomain === data.subdomain,
      }}
      subdomainErrorFeedback={{
        children: (
          <>
            <strong>{subdomainError}</strong> is not available. Please choose
            another subdomain.
          </>
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
          const displayDomain =
            showDomainCardFor ||
            settings.customDomain ||
            (error && data.customDomain);
          const onRemoved = () => {
            setShowDomainCardFor(null);
            setError(null);
            setData((d) => ({ ...d, customDomain: "" }));
          };
          return displayDomain ? (
            <>
              <DomainCard
                project={project}
                domain={displayDomain}
                onRemoved={onRemoved}
              />
              {!tldts.parse(displayDomain).subdomain && (
                <DomainCard
                  project={project}
                  domain={"www." + displayDomain}
                  isSecondary
                  onRemoved={onRemoved}
                />
              )}
            </>
          ) : null;
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
