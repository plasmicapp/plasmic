import { AppCtx } from "@/wab/client/app-ctx";
import { GithubConnect } from "@/wab/client/components/auth/GithubConnect";
import GithubIntegration, {
  filterPlasmicPullRequests,
} from "@/wab/client/components/github/GithubIntegration";
import { confirm, reactConfirm } from "@/wab/client/components/quick-modals";
import { VisibleEnableBlock } from "@/wab/client/components/TopFrame/TopBar/PublishFlowDialog";
import { PublishState } from "@/wab/client/components/TopFrame/TopBar/PublishFlowDialogWrapper";
import { TopBarModal } from "@/wab/client/components/TopFrame/TopBar/TopBarModal";
import Button from "@/wab/client/components/widgets/Button";
import GitJobStep from "@/wab/client/components/widgets/GitJobStep";
import Select from "@/wab/client/components/widgets/Select";
import { AsyncFnReturn } from "@/wab/client/hooks/useAsyncStrict";
import {
  DefaultSubsectionPushDeployProps,
  PlasmicSubsectionPushDeploy,
} from "@/wab/client/plasmic/plasmic_kit_continuous_deployment/PlasmicSubsectionPushDeploy";
import { ensure, spawn } from "@/wab/common";
import {
  ApiProject,
  ApiProjectRepository,
  GitActionParams,
  GitWorkflowJobStep,
} from "@/wab/shared/ApiSchema";
import * as React from "react";

export type SetupPushDeploy = {
  gitActionParams: GitActionParams;
  setGitActionParams: (params: GitActionParams) => void;
  projectRepository: AsyncFnReturn<
    () => Promise<ApiProjectRepository | null>
  >[0];
  updateProjectRepository: () => Promise<ApiProjectRepository | null>;
  connectedToGithub: boolean;
  setConnectedToGithub: (connected: boolean) => void;
};

export type StatusPushDeploy = {
  enabled: boolean;
  projectRepositoryId?: string;
  workflowRunId?: number;
  workflowJobUrl?: string;
  setWorkflowJobUrl: (url: string | undefined) => void;
  setWorkflowRunId: (id: number) => void;
  steps: GitWorkflowJobStep[];
  setSteps: (steps: GitWorkflowJobStep[]) => void;
};

export function mkPushDeployPublishState(
  status: StatusPushDeploy | undefined
): PublishState {
  if (!status?.enabled) {
    return undefined;
  }

  if (
    !status.steps.length ||
    status.steps.filter((s) => !s.conclusion).length > 0
  ) {
    return "publishing";
  }

  if (status.steps.filter((s) => s.conclusion === "failure").length > 0) {
    return "failure";
  }

  return "success";
}

interface SubsectionPushDeployProps
  extends DefaultSubsectionPushDeployProps,
    VisibleEnableBlock {
  appCtx: AppCtx;
  project: ApiProject;
  setup: SetupPushDeploy;
  status?: StatusPushDeploy;
}

function SubsectionPushDeploy(props: SubsectionPushDeployProps) {
  const {
    appCtx,
    project,
    visible,
    enable,
    block,
    setVisibleEnableBlock,
    setup,
    status,
    ...rest
  } = props;
  const {
    gitActionParams,
    setGitActionParams,
    projectRepository,
    updateProjectRepository,
    connectedToGithub,
    setConnectedToGithub,
  } = setup;

  React.useEffect(() => {
    if (projectRepository.loading || projectRepository.error) {
      return;
    }
    if (projectRepository.value) {
      setVisibleEnableBlock(true, true, false);
      setPushAs(projectRepository.value.defaultAction);
      setBranch(projectRepository.value.defaultBranch);
    } else {
      setVisibleEnableBlock(visible, false, true);
    }
  }, [projectRepository]);

  const removeProjectRepository = async () => {
    const confirmed = await confirm({
      message: `Are you sure you want to remove this GitHub connection?`,
    });
    if (confirmed) {
      await appCtx.api.deleteProjectRepository(
        ensure(
          projectRepository.value?.id,
          "Project repository id should exist to delete it"
        ),
        project.id
      );
      await updateProjectRepository();
    }
  };

  const [collapseOptions, setCollapseOptions] = React.useState<boolean>(true);
  const [pushAs, setPushAs] = React.useState<string>("");
  const [branch, setBranch] = React.useState<string>("");

  if (props.view === "status" && !status?.enabled) {
    return null;
  }

  return (
    <>
      <PlasmicSubsectionPushDeploy
        {...rest}
        checkbox={{
          props: {
            "aria-label": "Enable push",
            isDisabled: block,
            isChecked: enable,
            onChange: (checked: boolean) =>
              setVisibleEnableBlock(visible, checked, block),
          },
        }}
        collapse={props.view !== "status" && !visible}
        removeButton={{
          wrap: (node) => block && node,
          props: {
            onClick: async () =>
              (await reactConfirm({
                title: "Remove GitHub configuration?",
                message:
                  "This will stop triggering updates to the GitHub repo.",
                confirmLabel: "Remove",
              })) && setVisibleEnableBlock(false, false, block),
          },
        }}
        connection={
          projectRepository.loading
            ? "loading"
            : projectRepository.error
            ? "error"
            : projectRepository.value
            ? "connected"
            : undefined
        }
        retryButton={{
          onClick: () => {
            spawn(updateProjectRepository());
          },
        }}
        repoName={
          projectRepository.value?.repository
            ? {
                children: projectRepository.value.repository,
                href: `https://github.com/${projectRepository.value.repository}`,
                target: "_blank",
              }
            : {
                as: "div",
              }
        }
        learnMoreLink={{
          target: "_blank",
        }}
        connectGithubButton={{
          render: () => (
            <GithubConnect
              api={appCtx.api}
              type="oauth"
              onSuccess={() => setConnectedToGithub(true)}
              render={(_props: { onClick: () => void; isWaiting: boolean }) => (
                <Button
                  disabled={_props.isWaiting}
                  onClick={_props.onClick}
                  type="primary"
                  size="small"
                >
                  {_props.isWaiting
                    ? "Waiting for GitHub..."
                    : "Connect to GitHub"}
                </Button>
              )}
              refreshDeps={[connectedToGithub]}
            />
          ),
        }}
        removeGithubButton={{
          onClick: () => spawn(removeProjectRepository()),
        }}
        collapseOptions={collapseOptions}
        showOptionsButton={{
          onClick: () => setCollapseOptions(!collapseOptions),
        }}
        showOptionsIconButton={{
          onClick: () => setCollapseOptions(!collapseOptions),
        }}
        repoState={
          (projectRepository.value?.branches || []).length === 0
            ? "newRepo"
            : projectRepository.value?.scheme === "loader"
            ? "existingLoader"
            : undefined
        }
        pushAs={{
          "aria-label": "Push as",
          value: pushAs,
          onChange: (key) => {
            const newPushAs = key as string;
            setPushAs(newPushAs);
            if (["pr", "commit"].includes(newPushAs)) {
              setGitActionParams({
                ...gitActionParams,
                action: newPushAs as "commit" | "pr",
              });
            } else {
              setGitActionParams({
                ...gitActionParams,
                branch: newPushAs,
                action: "commit",
              });
            }
          },
          children: [
            <Select.Option value="commit" key="commit" textValue="commit">
              a commit to <strong>{branch}</strong>
            </Select.Option>,
            <Select.Option value="pr" key="pr" textValue="pr">
              a new pull request to <strong>{branch}</strong>
            </Select.Option>,
          ].concat(
            filterPlasmicPullRequests(
              projectRepository.value?.branches,
              branch
            ).map((name) => (
              <Select.Option
                value={`${name}`}
                key={`${name}`}
                textValue={`update to ${name}`}
              >
                an update to <strong>{name}</strong>
              </Select.Option>
            ))
          ),
        }}
        title={{
          value: gitActionParams.title,
          onChange: (e) =>
            setGitActionParams({ ...gitActionParams, title: e.target.value }),
        }}
        description={{
          value: gitActionParams.description,
          onChange: (e) =>
            setGitActionParams({
              ...gitActionParams,
              description: e.target.value,
            }),
        }}
        viewGithubButton={
          status?.workflowJobUrl
            ? {
                onClick: () => window.open(status.workflowJobUrl, "_blank"),
              }
            : {
                disabled: true,
              }
        }
        steps={{
          children: status?.steps.length ? (
            status.steps
              .filter((step) => step.conclusion !== "skipped")
              .map((step) => (
                <GitJobStep
                  key={step.number}
                  status={
                    step.conclusion === "failure"
                      ? "failed"
                      : step.conclusion === "success"
                      ? "finished"
                      : step.status === "in_progress"
                      ? "started"
                      : "unstarted"
                  }
                  description={step.name}
                />
              ))
          ) : (
            <GitJobStep status="started" description="Set up job" />
          ),
        }}
        githubPagesDelayNotice={{
          wrap: (node) => {
            return status?.steps.some((step) =>
              step.name.includes("GitHub Pages")
            )
              ? node
              : null;
          },
        }}
        result={mkPushDeployPublishState(status)}
      />

      {connectedToGithub && (
        <TopBarModal onClose={() => setConnectedToGithub(false)}>
          <GithubIntegration
            appCtx={appCtx}
            project={project}
            onSave={() => {
              setConnectedToGithub(false);
              spawn(updateProjectRepository());
            }}
          />
        </TopBarModal>
      )}
    </>
  );
}

export default SubsectionPushDeploy;
