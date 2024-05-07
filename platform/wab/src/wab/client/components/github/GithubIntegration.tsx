import { AppCtx } from "@/wab/client/app-ctx";
import { GithubConnect } from "@/wab/client/components/auth/GithubConnect";
import styles from "@/wab/client/components/github/GithubIntegration.module.scss";
import {
  DefaultGithubIntegrationProps,
  PlasmicGithubIntegration,
} from "@/wab/client/components/github/plasmic/plasmic_kit_continuous_deployment/PlasmicGithubIntegration";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import {
  DefaultActionTooltip,
  ModeTooltip,
} from "@/wab/client/components/widgets/DetailedTooltips";
import Select from "@/wab/client/components/widgets/Select";
import {
  useAsyncFnStrict,
  useAsyncStrict,
} from "@/wab/client/hooks/useAsyncStrict";
import InfoIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Info";
import { assertNever, ensure, spawn } from "@/wab/common";
import GatsbyIcon from "@/wab/commons/images/gatsby.svg";
import NextjsIcon from "@/wab/commons/images/nextjs.svg";
import ReactIcon from "@/wab/commons/images/react.svg";
import {
  ApiProject,
  GithubOrganization,
  GitRepository,
  GitSyncAction,
  GitSyncLanguage,
  GitSyncPlatform,
  GitSyncScheme,
} from "@/wab/shared/ApiSchema";
import { isValidSubdomainPart } from "@/wab/strs";
import { Tooltip } from "antd";
import * as React from "react";
import { useRef, useState } from "react";

const defaultAction: GitSyncAction = "commit";
const defaultFramework: GitSyncPlatform = "nextjs";
const defaultMode: GitSyncScheme = "loader";
const defaultLanguage: GitSyncLanguage = "ts";

export function filterNonPlasmicBranches(allBranches: string[] = []): string[] {
  return allBranches.filter((name) => !name.startsWith("plasmic/"));
}

export function filterPlasmicPullRequests(
  allBranches: string[] = [],
  branch: string
) {
  return allBranches.filter(
    (name) => name.startsWith("plasmic/") && name.endsWith(`/${branch}`)
  );
}

interface GithubIntegrationProps extends DefaultGithubIntegrationProps {
  appCtx: AppCtx;
  project: ApiProject;
  onSave: () => any;
}

function GithubIntegration(props: GithubIntegrationProps) {
  const { appCtx, project, onSave, ...rest } = props;
  const projectId = project.id;

  const [existingRepo, setExistingRepo] = React.useState<boolean>(false);

  const hideGithubPages = true;

  const [org, setOrg] = React.useState<GithubOrganization | undefined>(
    undefined
  );
  const [name, setName] = React.useState("");
  const [privateRepo, setPrivateRepo] = React.useState(false);

  const [repository, setRepository] = React.useState<GitRepository | undefined>(
    undefined
  );
  const [directory, setDirectory] = React.useState("");
  const [branch, setBranch] = React.useState("");

  const [framework, setFramework] =
    React.useState<GitSyncPlatform>(defaultFramework);
  const [language, setLanguage] =
    React.useState<GitSyncLanguage>(defaultLanguage);
  const [mode, setMode] = React.useState<GitSyncScheme>(defaultMode);
  const [action, setAction] = React.useState<GitSyncAction>(defaultAction);

  const [publishSite, setPublishSite] = React.useState(!hideGithubPages);
  const [subdomain, setSubdomain] = React.useState("");
  const hasPublishSiteWarning =
    mode === "codegen" && framework === "react" && publishSite;

  const [domainTakenError, setDomainTakenError] = useState(false);
  const [invalidDomainError, setInvalidDomainError] = useState(false);
  const domainError = domainTakenError || invalidDomainError;

  const subdomainInputRef = useRef<HTMLInputElement>(null);

  const [githubData, fetchGithubData] = useAsyncFnStrict(async () => {
    const data = await appCtx.api.fetchGithubData();
    if (
      org &&
      data.organizations.filter((o) => o.login === org.login).length !== 1
    ) {
      setOrg(undefined);
    } else if (org === undefined) {
      setOrg(
        data.organizations.filter((o) => o.type === "User")[0] ||
          data.organizations[0]
      );
    }
    if (
      repository &&
      data.repositories.filter((r) => r.name === repository.name).length !== 1
    ) {
      setRepository(undefined);
    }
    return data;
  });
  useAsyncStrict(fetchGithubData, []);

  const [validExistingRepo, setValidExistingRepo] = React.useState(false);
  const [detectedOptions, detectOptions] = useAsyncFnStrict(async () => {
    if (!repository || !branch) {
      return;
    }

    return await appCtx.api.detectOptionsFromDirectory(
      repository,
      branch,
      directory
    );
  }, [repository, branch, directory]);

  useAsyncStrict(async () => {
    setValidExistingRepo(false);
    const opt = await detectOptions();
    if (!opt || !opt.platform || !opt.language) {
      return;
    }

    setFramework(opt.platform);
    setLanguage(opt.language);
    setValidExistingRepo(true);
  }, [repository, branch, directory]);

  const branches = useAsyncStrict(async () => {
    return repository
      ? await appCtx.api.fetchGitBranches(repository)
      : undefined;
  }, [repository]);

  const [nameError, setNameError] = React.useState(false);
  const [saveState, saveProjectRepository] = useAsyncFnStrict(async () => {
    let repo: GitRepository;
    let defaultBranch: string;

    // Default options used for new repositories.
    let dir = "";

    const domain =
      !existingRepo && !hideGithubPages && publishSite
        ? `${subdomain}.plasmic.site`
        : undefined;
    if (!existingRepo) {
      if (!org) {
        return;
      }

      const response = await appCtx.api.setupNewGithubRepo({
        org,
        name,
        privateRepo,
        projectId,
        domain,
      });

      if (response.type === "KnownError") {
        switch (response.knownError) {
          case "domain taken":
            setDomainTakenError(true);
            break;
          case "repo exists":
            setNameError(true);
            break;
          default:
            assertNever(response.knownError);
        }
        return;
      }

      repo = response.repo;
      defaultBranch = repo.defaultBranch;
    } else {
      if (!repository) {
        return;
      }

      await appCtx.api.setupExistingGithubRepo({
        repository,
      });

      repo = repository;
      dir = directory;
      defaultBranch = branch;
    }

    await appCtx.api.addProjectRepository({
      projectId,
      installationId: repo.installationId,
      repository: repo.name,
      directory: dir,
      defaultAction: action,
      defaultBranch,
      scheme: mode,
      platform: framework,
      language,
      cachedCname: domain,
      createdByPlasmic: !existingRepo,
      publish: !existingRepo && !hideGithubPages && publishSite,
    });

    onSave();
  }, [
    projectId,
    existingRepo,
    org,
    name,
    privateRepo,
    repository,
    directory,
    branch,
    framework,
    language,
    mode,
    action,
    subdomain,
    publishSite,
  ]);

  React.useEffect(() => {
    if (!existingRepo) {
      setMode(defaultMode);
      setFramework(defaultFramework);
    } else {
      setMode("codegen");
    }
  }, [existingRepo]);

  React.useEffect(() => {
    setBranch(repository?.defaultBranch || "");
    setDirectory("");
  }, [repository]);

  React.useEffect(() => {
    if (framework === "react") {
      // Loader requires Next.js or Gatsby.
      setMode("codegen");
    }
  }, [framework]);

  React.useEffect(() => {
    if (mode === "loader") {
      setAction("build");
    } else {
      setAction(defaultAction);
    }
  }, [mode]);

  const missing = {
    render: (props2) => (
      <GithubConnect
        api={appCtx.api}
        type="install"
        onSuccess={() => {
          spawn(fetchGithubData());
        }}
        render={({ onClick, isWaiting }) => (
          <Button {...props2} onClick={onClick} disabled={isWaiting}>
            <span className={styles.missingButton}>
              {isWaiting
                ? "Waiting for GitHub..."
                : "Adjust GitHub App permissions"}
            </span>
          </Button>
        )}
        refreshDeps={[existingRepo]}
      />
    ),
  };

  const hasPublishSiteError = publishSite && privateRepo;
  return (
    <PlasmicGithubIntegration
      {...rest}
      view={existingRepo ? "existingRepo" : undefined}
      isPublishingSite={publishSite}
      loading={{
        githubData: githubData.loading,
        branches: branches.loading,
        detectedOptions: detectedOptions.loading,
        saving: saveState.loading,
      }}
      errors={{
        name: nameError,
        directory:
          !!repository &&
          !!branch &&
          !detectedOptions.loading &&
          !detectedOptions.value,
        hasPublishSiteError: hasPublishSiteError,
        hasDomainError: !!domainError && subdomain !== "",
        invalidDomainError: invalidDomainError,
        publishSiteWarning: hasPublishSiteWarning,
      }}
      hide={{
        action: mode !== "codegen",
      }}
      newRepoButton={{
        disabled: saveState.loading,
        onClick: () => {
          setAction("commit");
          setExistingRepo(false);
        },
      }}
      existingRepoButton={{
        disabled: saveState.loading,
        onClick: () => {
          setAction("pr");
          setExistingRepo(true);
        },
      }}
      org={{
        "aria-label": "Organization",
        value: org?.login ?? null,
        onChange: (key) => {
          const o = githubData.value?.organizations.filter(
            (_o) => _o.login === key
          )[0];
          setOrg(o);
          setNameError(false);
        },
        children: githubData.value?.organizations.map((r) => (
          <Select.Option value={r.login} key={r.login}>
            {r.login}
          </Select.Option>
        )),
        isDisabled: (githubData.value?.organizations.length || 0) < 2,
        placeholder: githubData.loading
          ? "Loading organizations..."
          : "Select organization...",
      }}
      name={{
        disabled: saveState.loading,
        onChange: (e) => {
          setName(e.target.value);
          setNameError(false);
        },
        value: name,
        autoFocus: true,
      }}
      privateRepo={{
        props: {
          "aria-label": "Private repository?",
          isDisabled: saveState.loading,
          onChange: (v) => setPrivateRepo(v),
          isChecked: privateRepo,
        },
      }}
      repository={{
        "aria-label": "Repository",
        value: repository?.name ?? null,
        onChange: (key) => {
          const r = githubData.value?.repositories.filter(
            (_r) => _r.name === key
          )[0];
          setRepository(r);
        },
        children: githubData.value?.repositories.map((r) => (
          <Select.Option value={r.name} key={r.name}>
            {r.name}
          </Select.Option>
        )),
        placeholder: githubData.loading
          ? "Loading repositories..."
          : "Select repository...",
      }}
      missingOrg={missing}
      missingRepo={missing}
      directory={{
        disabled: saveState.loading,
        onChange: (e) => setDirectory(e.target.value),
        value: directory,
      }}
      branch={{
        "aria-label": "Branch",
        value: branch,
        onChange: (key) => {
          setBranch(key as string);
        },
        children: filterNonPlasmicBranches(branches.value?.branches).map(
          (b) => (
            <Select.Option value={b} key={b}>
              {b}
            </Select.Option>
          )
        ),
        placeholder: branches.loading
          ? "Loading branches..."
          : "Select branch...",
      }}
      framework={{
        "aria-label": "Framework",
        value: detectedOptions.loading ? undefined : framework,
        onChange: async (key) => {
          const sure =
            key !== "react" ||
            (await reactConfirm({
              message:
                "Are you sure you want to use plain React? If you are trying to directly publish the site, pages/routes will not work out of the box. You'll need to manually add your own routing system using something like react-router.",
              title: "Framework needed to support pages",
            }));
          if (sure) {
            setFramework(key as GitSyncPlatform);
          }
        },
        children: [
          <Select.Option
            value="nextjs"
            key="nextjs"
            textValue="Next.js (recommended)"
          >
            <img className={styles.icon} src={NextjsIcon} alt="" /> Next.js
          </Select.Option>,
          <Select.Option value="gatsby" key="gatsby" textValue="Gatsby">
            <img className={styles.icon} src={GatsbyIcon} alt="" /> Gatsby
          </Select.Option>,
          <Select.Option
            value="react"
            key="react"
            textValue="None (plain React—advanced)"
          >
            <img className={styles.icon} src={ReactIcon} alt="" /> None (plain
            React)
          </Select.Option>,
        ],
        isDisabled: existingRepo,
        placeholder: detectedOptions.loading
          ? "Detecting framework..."
          : "Select framework...",
      }}
      language={{
        "aria-label": "Language",
        value: detectedOptions.loading ? null : language,
        onChange: (key) => {
          setLanguage(key as GitSyncLanguage);
        },
        children: [
          <Select.Option value="js" key="js">
            JavaScript
          </Select.Option>,
          <Select.Option value="ts" key="ts">
            TypeScript
          </Select.Option>,
        ],
        isDisabled: existingRepo,
        placeholder: detectedOptions.loading
          ? "Detecting language..."
          : "Select language...",
      }}
      mode={{
        "aria-label": "Mode",
        value: mode,
        onChange: (key) => {
          setMode(key as GitSyncScheme);
        },
        children: [
          <Select.Option value="loader" key="loader">
            Loader (recommended)
          </Select.Option>,
          <Select.Option value="codegen" key="codegen">
            Codegen
          </Select.Option>,
        ],
        isDisabled: existingRepo || framework === "react",
      }}
      modeInfo={{
        render: () => (
          <Tooltip mouseEnterDelay={0.5} title={<ModeTooltip />}>
            <a
              href="https://www.plasmic.app/learn/loader-vs-codegen/"
              target="_blank"
            >
              <InfoIcon />
            </a>
          </Tooltip>
        ),
      }}
      action={{
        "aria-label": "Default action",
        value: action,
        onChange: (key) => {
          setAction(key as GitSyncAction);
        },
        children: [
          <Select.Option value="pr" key="pr">
            Make pull request
          </Select.Option>,
          <Select.Option value="commit" key="commit">
            Commit changes
          </Select.Option>,
        ],
      }}
      actionInfo={{
        render: () => (
          <Tooltip mouseEnterDelay={0.5} title={<DefaultActionTooltip />}>
            <InfoIcon />
          </Tooltip>
        ),
      }}
      publishSite={{
        isChecked: publishSite,
        onChange: (value) => setPublishSite(hideGithubPages ? false : value),
      }}
      apparentSubdomainInput={{
        onMouseDown: (e) => {
          if (e.target !== subdomainInputRef.current) {
            e.preventDefault();
            ensure(
              subdomainInputRef.current,
              () => `subdomainInputRef is Nil`
            ).focus();
          }
        },
      }}
      subdomainInput={{
        ref: subdomainInputRef,
        value: subdomain,
        onChange: (e) => {
          setInvalidDomainError(false);
          setDomainTakenError(false);
          setSubdomain(e.target.value);
        },
        onBlur: (e) => {
          setInvalidDomainError(!isValidSubdomainPart(subdomain));
        },
      }}
      moreProvidersLink={{
        target: "_blank",
      }}
      pushButton={{
        disabled:
          saveState.loading ||
          (!existingRepo &&
            ((!nameError && (!org || !name)) ||
              (publishSite &&
                (hasPublishSiteError || domainError || !subdomain)))) ||
          (existingRepo && !validExistingRepo),
        onClick: saveProjectRepository,
      }}
      hideGithubPages={hideGithubPages}
    />
  );
}

export default GithubIntegration;
