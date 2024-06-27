import { VisibleEnableBlock } from "@/wab/client/components/TopFrame/TopBar/PublishFlowDialog";
import { PublishState } from "@/wab/client/components/TopFrame/TopBar/PublishFlowDialogWrapper";
import GitJobStep from "@/wab/client/components/widgets/GitJobStep";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import {
  DefaultSubsectionSaveVersionProps,
  PlasmicSubsectionSaveVersion,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicSubsectionSaveVersion";
import type { PublishResult } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ApiProject } from "@/wab/shared/ApiSchema";
import {
  INITIAL_VERSION_NUMBER,
  SemVerReleaseType,
} from "@/wab/shared/site-diffs";
import { Select } from "antd";
import * as React from "react";

const { Option } = Select;

export type SetupSaveVersion = {
  tags: string[];
  setTags: (tags: string[]) => void;
  description: string;
  setDescription: (description: string) => void;
};

export type StatusSaveVersion = {
  enabled: boolean;
  result?: keyof typeof PublishResult;
};

export function mkSaveVersionPublishState(
  status: StatusSaveVersion | undefined
): PublishState {
  if (!status?.enabled) {
    return undefined;
  }

  switch (status.result) {
    case undefined:
    case "PreFilling":
      return "publishing";
    case "Success":
      return "success";
    default:
      return "failure";
  }
}

interface SubsectionSaveVersionProps
  extends DefaultSubsectionSaveVersionProps,
    VisibleEnableBlock {
  project: ApiProject;
  closeDialog: () => void;
  gotoReviewChanges: () => void;
  loading: boolean;
  version?: string;
  releaseType?: SemVerReleaseType;
  setup: SetupSaveVersion;
  status?: StatusSaveVersion;
}

function SubsectionSaveVersion(props: SubsectionSaveVersionProps) {
  const {
    project,
    visible,
    enable,
    block,
    setVisibleEnableBlock,
    closeDialog,
    gotoReviewChanges,
    loading,
    version,
    releaseType,
    setup,
    status,
    ...rest
  } = props;
  const { hostFrameApi } = useTopFrameCtx();
  const [previousTags, setPreviousTags] = React.useState([] as string[]);
  const { setTags, description, setDescription } = setup;
  const { enabled, result } = status ?? {};

  React.useEffect(() => {
    spawn(
      (async () => {
        const projectReleases = await hostFrameApi.getProjectReleases();
        setPreviousTags([
          ...new Set(projectReleases?.map((release) => release.tags).flat()),
        ] as string[]);
      })()
    );
  }, []);

  if (props.view === "status" && !enabled) {
    return null;
  }

  return (
    <PlasmicSubsectionSaveVersion
      {...rest}
      collapse={props.view !== "status" && !visible}
      checkbox={{
        props: {
          "aria-label": "Enable save",
          isDisabled: block,
          isChecked: enable,
          onChange: (checked: boolean) =>
            setVisibleEnableBlock(checked, checked, block),
        },
      }}
      learnMoreLink={{
        target: "_blank",
      }}
      changesState={
        loading
          ? "loading"
          : version === INITIAL_VERSION_NUMBER
          ? "first"
          : !releaseType
          ? "none"
          : releaseType
      }
      // Hide if loading or no changes
      nextVersion={loading || !version ? "" : version}
      reviewChangesButton={{
        wrap: (node) => (loading || !version ? null : node),
        props: {
          onClick: () => gotoReviewChanges(),
        },
      }}
      viewHistoryButton={{
        onClick: () => {
          closeDialog();
          spawn(hostFrameApi.switchLeftTab("versions", { highlight: true }));
        },
      }}
      tagsSelector={{
        render: () => {
          const previousTagsOptions = previousTags.map((tag) => {
            return <Option key={tag}>{tag}</Option>;
          });
          return DEVFLAGS.publishWithTags ? (
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="Enter the tags here (optional) ..."
              onChange={(tags2) => setTags(tags2)}
              tokenSeparators={[","]}
            >
              {previousTagsOptions}
            </Select>
          ) : null;
        },
      }}
      description={{
        value: description,
        onChange: (e) => setDescription(e.target.value),
        autoFocus: true,
      }}
      failed={result && result !== "Success"}
      feedback={
        result === "SaveFailed" ? (
          "Error: Could not save project."
        ) : result === "OutOfDate" ? (
          "Error: This Plasmic studio instance is out of date."
        ) : result === "SkipAlreadyPublished" ? (
          "Error: No new changes to publish."
        ) : result === "UnknownError" ? (
          "Error: Unknown error."
        ) : result === "PaywallError" ? (
          "Error: Paywall error."
        ) : (
          <>
            <GitJobStep
              status={!result ? "started" : "finished"}
              description={
                !result ? (
                  "Saving a new version..."
                ) : (
                  <>
                    Successfully saved{" "}
                    <strong>
                      {project.name} v{version}
                    </strong>
                    !
                  </>
                )
              }
            />
            <GitJobStep
              status={
                result === "Success"
                  ? "finished"
                  : result === "PreFilling"
                  ? "started"
                  : "unstarted"
              }
              description={
                result === "Success"
                  ? "Pushed updates to CDN cache!"
                  : result === "PreFilling"
                  ? "Pushing updates to CDN cache..."
                  : "Push updates to CDN cache"
              }
            />
          </>
        )
      }
    />
  );
}

export default SubsectionSaveVersion;
