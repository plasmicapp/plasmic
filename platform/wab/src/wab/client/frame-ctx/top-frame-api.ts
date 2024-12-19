import { Api } from "@/wab/client/api";
import { TopBarPromptBillingArgs } from "@/wab/client/components/modals/PricingModal";
import { MergeModalContext } from "@/wab/client/components/TopFrame/TopFrameChrome";
import { HostFrameApi } from "@/wab/client/frame-ctx/host-frame-api";
import { TopFrameTourState } from "@/wab/client/tours/tutorials/TutorialTours";
import { ApiBranch, ApiTeam } from "@/wab/shared/ApiSchema";
import { DataSourceType } from "@/wab/shared/data-sources-meta/data-source-registry";
import { LocalizationConfig } from "@/wab/shared/localization";
import { LocationListener, UnregisterCallback } from "history";

/**
 * API the TopFrame exposes to HostFrame.
 *
 * The TopFrameFullApi type only be used by HostFrameCtx to call exposeHostFrameApi.
 * For normal app use cases, use Api or TopFrameApi types.
 */
export type TopFrameFullApi = {
  exposeHostFrameApi(hostFrameApi: HostFrameApi): void;
  toJSON(): string;
} & Api &
  TopFrameApi;

export interface TopFrameApi {
  pushLocation(path?: string, query?: string, hash?: string): void;
  replaceLocation(path?: string, query?: string, hash?: string): void;
  registerLocationListener(listener: LocationListener): UnregisterCallback;

  setPrimitiveValues(vals: {
    noComponents: boolean;
    revisionNum: number;
    isLocalizationEnabled: boolean;
    defaultPageRoleId: string | null | undefined;
    localizationScheme: LocalizationConfig | undefined;
  }): Promise<void>;

  // The object states we send separately because, whenever setting them, the
  // component will re-render (because it will be a new object instance) even if
  // the value hasn't changed.
  setLatestPublishedVersionData(
    data: { revisionId: string; version: string } | undefined
  ): Promise<void>;
  setSubjectComponentInfo(
    info:
      | {
          pathOrComponent: string;
          componentName: string;
        }
      | undefined
  ): Promise<void>;
  setActivatedBranch(branch: ApiBranch | undefined): Promise<void>;

  pickDataSource(opts: {
    sourceType?: DataSourceType;
    existingSourceId: string | undefined;
    readOpsOnly?: boolean;
  }): Promise<{ sourceId: string } | undefined | "CANCELED">;

  getCurrentTeam(): Promise<ApiTeam | undefined>;
  canEditProjectUiConfig(): Promise<boolean>;

  promptBilling(): Promise<void>;

  setDocumentTitle(val: string): Promise<void>;
  setShowPublishModal(val: boolean): Promise<void>;
  setKeepPublishModalOpen(val: boolean): Promise<void>;
  setMergeModalContext(val: MergeModalContext | undefined): Promise<void>;
  setShowShareModal(val: boolean): Promise<void>;
  setShowCodeModal(val: boolean): Promise<void>;
  setShowProjectNameModal(val: boolean): Promise<void>;
  setShowCloneProjectModal(val: boolean): Promise<void>;
  setShowHostModal(val: boolean): Promise<void>;
  setShowLocalizationModal(val: boolean): Promise<void>;
  setShowUiConfigModal(val: boolean): Promise<void>;
  showRegenerateSecretTokenModal(): Promise<void>;
  setShowUpsellForm(val: TopBarPromptBillingArgs | undefined): Promise<void>;
  setShowAppAuthModal(val: boolean): Promise<void>;
  setOnboardingTour(val: TopFrameTourState): Promise<void>;
  toggleAdminMode(val: boolean): Promise<void>;
}

export type TopFrameApiArgs<Method extends keyof TopFrameApi> = Parameters<
  TopFrameApi[Method]
>[0];
export type TopFrameApiReturnType<Method extends keyof TopFrameApi> =
  ReturnType<TopFrameApi[Method]>;
export type TopFrameApiResolveType<Method extends keyof TopFrameApi> = (
  result: Awaited<ReturnType<TopFrameApi[Method]>>
) => void;
