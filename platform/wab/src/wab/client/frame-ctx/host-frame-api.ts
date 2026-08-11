import type {
  MentionableResource,
  MentionableResourceKind,
} from "@/wab/client/components/copilot/resource-mention-utils";
import {
  PublishResult,
  StudioAppUser,
} from "@/wab/client/studio-ctx/StudioCtx";
import { ApiBranch, BranchId } from "@/wab/shared/ApiSchema";
import { PkgVersionInfoMeta } from "@/wab/shared/SharedApi";
import type { AiOutputFormat } from "@/wab/shared/copilot/copilot-tool-types";
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
  getProjectReleases(opts?: {
    mainBranchOnly: boolean;
  }): Promise<PkgVersionInfoMeta[]>;
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
  /** This helps execute an Copilot tool call in the HostFrame where StudioCtx is available */
  executeCopilotToolCall(
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<CopilotToolCallResult>;
  /** Store the AI agent's preferred copilot tool output format on StudioCtx. */
  setPreferredAiOutputFormat(format: AiOutputFormat): Promise<void>;
  /** Resolves once the studio and its active canvas are ready. */
  waitForStudioReady(): Promise<void>;
  listMentionableResources(): Promise<MentionableResource[]>;
  /** Rewrite `@<…>` mentions in the text to their resolved (uuid-carrying) form. */
  resolveMentions(text: string): Promise<string>;
  navigateToMentionedResource(
    kind: MentionableResourceKind,
    uuid: string
  ): Promise<void>;
};

/** Structured error for copilot tool calls — Comlink-serializable. */
export type CopilotToolCallError = {
  message: string;
  type: "TOOL_NOT_FOUND" | "EXECUTION_FAILED";
};

/** Serializable result of a tool call execution (crosses TopFrame and HostFrame boundary via Comlink) */
export type CopilotToolCallResult =
  | {
      success: true;
      output: string;
    }
  | {
      success: false;
      error: CopilotToolCallError;
    };
