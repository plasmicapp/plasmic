import {
  PublishResult,
  StudioAppUser,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ApiBranch, BranchId } from "@/wab/shared/ApiSchema";
import { PkgVersionInfoMeta } from "@/wab/shared/SharedApi";
import { ChangeLogEntry, SemVerReleaseType } from "@/wab/shared/site-diffs";
import { LeftTabKey } from "@/wab/shared/ui-config-utils";
import { ExtendedKeyboardEvent } from "mousetrap";

export type HostFrameApi = {
  switchLeftTab(
    tabKey: LeftTabKey | undefined,
    opts?: { highlight?: boolean }
  ): Promise<void>;
  refreshSiteInfo(): Promise<void>;
  publishVersion(
    versionTags: string[],
    versionDesc: string,
    branchId: BranchId | undefined
  ): Promise<PublishResult>;
  getLatestPublishedVersionId(): Promise<string | undefined>;
  getProjectReleases(): Promise<PkgVersionInfoMeta[]>;
  calculateNextPublishVersion(): Promise<
    | {
        version: string;
        releaseType?: SemVerReleaseType;
        changeLog: ChangeLogEntry[];
      }
    | undefined
  >;
  focusOnWindow(): Promise<void>;
  forwardShortcut(
    e: Pick<
      ExtendedKeyboardEvent,
      "key" | "shiftKey" | "ctrlKey" | "metaKey" | "code" | "keyCode"
    >
  ): Promise<void>;
  updateLocalizationProjectFlags(
    localization: boolean,
    keyScheme?: string,
    tagPrefix?: string
  ): Promise<void>;
  switchToBranch(branch: ApiBranch | undefined): Promise<void>;
  mutateSWRKeys(keys: string[]): Promise<void>;
  getUsedRolesInProject(): Promise<{ component: string; roleId: string }[]>;
  setDefaultPageRoleId(roleId: string | null | undefined): Promise<void>;
  logAsAppUser(appUser: StudioAppUser): Promise<void>;
  handleBranchMerged(): Promise<void>;
};
