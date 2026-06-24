import { getCustomFunctionDisplayName } from "@/wab/client/components/modals/customFunctionModals";
import { SiteDiffs } from "@/wab/client/components/modals/SiteDiffs";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { Textbox } from "@/wab/client/components/widgets/Textbox";
import CodeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Code";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import ImageBlockIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ImageBlock";
import MixinIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Mixin";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  componentToReferenced,
  customFunctionsUsedBySite,
} from "@/wab/shared/cached-selectors";
import {
  extractUsedIconAssetsForComponents,
  extractUsedPictureAssetsForComponents,
  extractUsedPictureAssetsFromMixins,
} from "@/wab/shared/codegen/image-assets";
import { extractUsedMixinsForComponents } from "@/wab/shared/codegen/mixins";
import {
  extractUsedTokensForComponents,
  extractUsedTokensForMixins,
  extractUsedTokensForTokenOverrides,
  extractUsedTokensForTokens,
} from "@/wab/shared/codegen/style-tokens";
import {
  ensure,
  intersectSets,
  mergeSets,
  spawn,
  withoutNils,
} from "@/wab/shared/common";
import { getComponentDisplayName } from "@/wab/shared/core/components";
import {
  buildObjToDepMap,
  extractTransitiveDepsFromComponents,
  extractTransitiveDepsFromMixins,
  extractTransitiveDepsFromTokens,
  getTransitiveDepsFromObjs,
} from "@/wab/shared/core/project-deps";
import { customFunctionId } from "@/wab/shared/core/query-ids";
import { createSite, isHostLessPackage } from "@/wab/shared/core/sites";
import {
  Component,
  ImageAsset,
  Mixin,
  ProjectDependency,
  StyleToken,
} from "@/wab/shared/model/classes";
import {
  ChangeLogEntry,
  compareSites,
  SemVerReleaseType,
} from "@/wab/shared/site-diffs";
import { filterUsefulDiffs } from "@/wab/shared/site-diffs/filter-useful-diffs";
import { Alert, Form, Select } from "antd";
import { observer } from "mobx-react";
import React from "react";

const { Option } = Select;

type UpgradeDepResponse = boolean;
type DeleteDepResponse = boolean;
type PublishProjResponse = {
  confirm: boolean;
  tags: string[];
  title: string;
};

export async function promptUpgradeDeps(props: {
  studioCtx: StudioCtx;
  targetDeps: ProjectDependency[];
}) {
  const { studioCtx, targetDeps } = props;
  return showTemporaryPrompt<UpgradeDepResponse>((onSubmit, onCancel) => (
    <Modal
      title={`Upgrade imported projects`}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      <WarnChangeDepForm onSubmit={onSubmit} onCancel={onCancel}>
        {targetDeps.map((targetDep) => {
          const curDep = ensure(
            studioCtx.site.projectDependencies.find(
              (dep) => dep.pkgId === targetDep.pkgId
            ),
            "Target dependency must be one of the existing project dependencies"
          );
          return (
            <WarnChangeDep
              studioCtx={studioCtx}
              curDep={curDep}
              targetDep={targetDep}
              heading={
                <p>
                  You are upgrading {targetDep.name} from{" "}
                  <strong>v{curDep.version}</strong> to{" "}
                  <strong>v{targetDep.version}</strong>.
                </p>
              }
            />
          );
        })}
      </WarnChangeDepForm>
    </Modal>
  ));
}

export async function promptUpgradeDep(props: {
  studioCtx: StudioCtx;
  targetDep: ProjectDependency;
}) {
  const { studioCtx, targetDep } = props;
  const curDep = ensure(
    studioCtx.site.projectDependencies.find(
      (dep) => dep.pkgId === targetDep.pkgId
    ),
    "Target dependency must be one of the existing project dependencies"
  );
  return showTemporaryPrompt<UpgradeDepResponse>((onSubmit, onCancel) => (
    <Modal
      title={`Upgrade imported project "${targetDep.name}"`}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      <WarnChangeDepForm onSubmit={onSubmit} onCancel={onCancel}>
        <WarnChangeDep
          studioCtx={studioCtx}
          curDep={curDep}
          targetDep={targetDep}
          heading={
            <p>
              You are upgrading {targetDep.name} from{" "}
              <strong>v{curDep.version}</strong> to{" "}
              <strong>v{targetDep.version}</strong>.
            </p>
          }
        />
      </WarnChangeDepForm>
    </Modal>
  ));
}

export async function promptDeleteDep(props: {
  studioCtx: StudioCtx;
  curDep: ProjectDependency;
}) {
  const { studioCtx, curDep } = props;
  const depName = isHostLessPackage(curDep.site) ? (
    `package "${curDep.name}"`
  ) : (
    <>
      "{curDep.name}" <strong>v{curDep.version}</strong>
    </>
  );
  return showTemporaryPrompt<DeleteDepResponse>((onSubmit, onCancel) => (
    <Modal
      title={`Remove imported project "${curDep.name}"?`}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      <WarnChangeDepForm onSubmit={onSubmit} onCancel={onCancel}>
        <WarnChangeDep
          studioCtx={studioCtx}
          curDep={curDep}
          targetDep={undefined}
          heading={
            <p>
              You will no longer be able to use components, styles, and other
              assets from {depName}.
            </p>
          }
        />
      </WarnChangeDepForm>
    </Modal>
  ));
}

function PublishContent(props: {
  studioCtx: StudioCtx;
  onSubmit: (response: PublishProjResponse) => void;
  onCancel: () => void;
}) {
  const { studioCtx, onSubmit, onCancel } = props;
  const [nextVersion, setNextVersion] = React.useState<{
    version: string;
    changeLog: ChangeLogEntry[];
    releaseType?: SemVerReleaseType;
  }>();
  const [previousTags, setPreviousTags] = React.useState([] as string[]);
  const [tags, setTags] = React.useState([] as string[]);
  const [title, setTitle] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    spawn(
      (async () => {
        if (loading) {
          const next = await studioCtx.calculateNextPublishVersion();
          setNextVersion(next);

          const projectReleases = await studioCtx.getProjectReleases();
          setPreviousTags([
            ...new Set(projectReleases.map((release) => release.tags).flat()),
          ] as string[]);

          setLoading(false);
        }
      })()
    );
  }, [studioCtx, loading]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!nextVersion) {
    return (
      <p>There have been no new changes since your last published version</p>
    );
  }

  const { changeLog, version, releaseType } = nextVersion;
  const diffs = filterUsefulDiffs(changeLog);
  const previousTagsOptions = previousTags.map((tag) => {
    return <Option key={tag}>{tag}</Option>;
  });

  return (
    <Form>
      <p>
        When you publish a new version, you let other developers and designers
        know that your updates are ready for use.
      </p>
      {releaseType === "major" && (
        <p>
          <Alert
            type="warning"
            showIcon
            message="The new version you're publishing contains potentially breaking changes, as some things have been removed or renamed."
          />
        </p>
      )}
      <p>
        <strong>Version: </strong> {version}
      </p>
      <p>
        <Textbox
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Description (optional)..."
          aria-label="Description"
          autoFocus
          styleType={"bordered"}
        />
      </p>
      <p>
        <Select
          mode="tags"
          style={{ width: "100%" }}
          placeholder="Tags (optional) ..."
          aria-label="Tags selector"
          onChange={(newTags) => setTags(newTags)}
          tokenSeparators={[","]}
        >
          {previousTagsOptions}
        </Select>
      </p>
      {diffs && (
        <p>
          <SiteDiffs diffs={diffs} />
        </p>
      )}
      <div className="mt-xlg">
        <Button
          className="mr-sm"
          type="primary"
          htmlType="submit"
          onClick={() => onSubmit({ confirm: true, tags, title })}
        >
          Confirm
        </Button>
        <Button onClick={() => onCancel()}>Cancel</Button>
      </div>
    </Form>
  );
}

export async function promptPublishProj(props: { studioCtx: StudioCtx }) {
  return showTemporaryPrompt<PublishProjResponse>((onSubmit, onCancel) => (
    <Modal
      title="Publish a new version"
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
    >
      <PublishContent
        studioCtx={props.studioCtx}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Modal>
  ));
}

const WarnChangeDep = observer(function WarnChangeDep_(props: {
  studioCtx: StudioCtx;
  curDep: ProjectDependency;
  targetDep?: ProjectDependency;
  heading: React.ReactElement;
}) {
  const { studioCtx, curDep, targetDep, heading } = props;
  const site = studioCtx.site;
  const diffs = targetDep
    ? filterUsefulDiffs(compareSites(curDep.site, targetDep.site))
    : filterUsefulDiffs(compareSites(curDep.site, createSite()));

  const removedComponentUuids = new Set(
    withoutNils(
      diffs.map((diff) =>
        diff.description === "removed" && diff.oldValue?.type === "Component"
          ? diff.oldValue.uuid
          : undefined
      )
    )
  );
  const removedComponents = curDep.site.components.filter((component) =>
    removedComponentUuids.has(component.uuid)
  );

  // Build a set of components that are directly used by local components
  const referencedComponents = mergeSets(
    ...site.components.map((comp) => new Set(componentToReferenced(comp)))
  );
  const removedReferencedComponents = intersectSets(
    referencedComponents,
    new Set<Component>(removedComponents)
  );

  const removedTokenUuids = new Set(
    withoutNils(
      diffs.map((diff) =>
        diff.description === "removed" && diff.oldValue?.type === "Style token"
          ? diff.oldValue.uuid
          : undefined
      )
    )
  );
  const removedTokens = curDep.site.styleTokens.filter((token) =>
    removedTokenUuids.has(token.uuid)
  );

  // Build a set of tokens that are directly used by local tokens, overrides,
  // mixins, and components
  const referencedTokens = new Set(
    // token references can come from this site's tokens, mixins, or
    // components
    [
      ...extractUsedTokensForTokens(site.styleTokens, site, {
        derefTokens: false,
      }),
      ...extractUsedTokensForTokenOverrides(site.styleTokenOverrides, site, {
        derefTokens: false,
      }),
      ...extractUsedTokensForMixins(site.mixins, site, {
        derefTokens: false,
      }),
      ...extractUsedTokensForMixins(
        site.themes.flatMap((t) => [
          t.defaultStyle,
          ...t.styles.map((s) => s.style),
        ]),
        site,
        {
          derefTokens: false,
        }
      ),
      ...extractUsedTokensForComponents(site, site.components, {
        // We don't need to expand mixins, as we're checking local
        // mixins referencing tokens separately, and we don't care about
        // imported mixins referencing tokens
        expandMixins: false,

        // We also don't need to deref, as we only care about the tokens
        // that are directly used
        derefTokens: false,
      }),
    ]
  );
  const removedReferencedTokens = intersectSets(
    referencedTokens,
    new Set<StyleToken>(removedTokens)
  );

  const removedMixinUuids = new Set(
    withoutNils(
      diffs.map((diff) =>
        diff.description === "removed" && diff.oldValue?.type === "Mixin"
          ? diff.oldValue.uuid
          : undefined
      )
    )
  );
  const removedMixins = curDep.site.mixins.filter((mixin) =>
    removedMixinUuids.has(mixin.uuid)
  );

  // Build a set of Mixins that are directly used by local components
  const referencedMixins = new Set(
    extractUsedMixinsForComponents(site.components).keys()
  );
  const removedReferencedMixins = intersectSets(
    referencedMixins,
    new Set<Mixin>(removedMixins)
  );

  const removedImageAssetUuids = new Set(
    withoutNils(
      diffs.map((diff) =>
        diff.description === "removed" &&
        (diff.oldValue?.type === "Image" || diff.oldValue?.type === "Icon")
          ? diff.oldValue.uuid
          : undefined
      )
    )
  );
  const removedImageAssets = curDep.site.imageAssets.filter((asset) =>
    removedImageAssetUuids.has(asset.uuid)
  );

  // Build a set of ImageAssets that are directly used by local components
  // and local mixins
  const referencedImageAssets = new Set([
    ...extractUsedIconAssetsForComponents(site, site.components),
    ...extractUsedPictureAssetsForComponents(site, site.components, {
      includeRuleSets: true,
      expandMixins: false,
    }),
    ...extractUsedPictureAssetsFromMixins(site, site.mixins),
  ]);
  const removedReferencedImageAssets = intersectSets(
    referencedImageAssets,
    new Set<ImageAsset>(removedImageAssets)
  );

  const removedFunctionDiffIds = new Set(
    withoutNils(
      diffs.map((diff) =>
        diff.description === "removed" && diff.oldValue?.type === "Function"
          ? diff.oldValue.functionId
          : undefined
      )
    )
  );
  const removedFunctions = curDep.site.customFunctions.filter((fn) =>
    removedFunctionDiffIds.has(customFunctionId(fn))
  );
  const removedFunctionsById = new Set(removedFunctions.map(customFunctionId));
  const removedReferencedFunctions = new Set(
    [...customFunctionsUsedBySite(site)].filter((fn) =>
      removedFunctionsById.has(customFunctionId(fn))
    )
  );

  // out of those directly referenced objects that will now be removed,
  // let's see what transitive dependencies we'll need to pull in to
  // clone them
  const objDepMap = buildObjToDepMap(site);
  const transitiveDeps = new Set([
    ...extractTransitiveDepsFromComponents(
      site,
      [...removedReferencedComponents],
      objDepMap
    ),
    ...extractTransitiveDepsFromTokens(
      site,
      [...removedReferencedTokens],
      objDepMap
    ),
    ...extractTransitiveDepsFromMixins(
      site,
      [...removedReferencedMixins],
      objDepMap
    ),
    ...getTransitiveDepsFromObjs(
      site,
      [...removedReferencedImageAssets],
      objDepMap
    ),
  ]);
  const functionsList =
    removedReferencedFunctions.size > 0 ? (
      <div>
        <Icon className="function-fg mr-sm" icon={CodeIcon} /> Functions{" "}
        {[...removedReferencedFunctions]
          .map((fn) => getCustomFunctionDisplayName(fn))
          .join(", ")}
      </div>
    ) : null;
  const functionsNote = removedReferencedFunctions.size > 0 && (
    <div className="mt-m">
      These functions will no longer be available:{" "}
      {[...removedReferencedFunctions]
        .map((fn) => getCustomFunctionDisplayName(fn))
        .join(", ")}
    </div>
  );
  const removedHostlessArtifactTypes = withoutNils([
    removedReferencedComponents.size > 0 ? "components" : undefined,
    removedReferencedFunctions.size > 0 ? "functions" : undefined,
  ]);
  const removedHostlessArtifactLabel =
    removedHostlessArtifactTypes.length === 0
      ? "items"
      : removedHostlessArtifactTypes.length === 1
      ? removedHostlessArtifactTypes[0]
      : removedHostlessArtifactTypes.join(" and ");

  return (
    <>
      {heading}
      {diffs.length > 0 && (
        <div className="mb-m">
          The changes are:
          <SiteDiffs diffs={diffs} />
        </div>
      )}
      {(removedReferencedTokens.size > 0 ||
        removedReferencedMixins.size > 0 ||
        removedReferencedComponents.size > 0 ||
        removedReferencedImageAssets.size > 0 ||
        removedReferencedFunctions.size > 0) && (
        <Alert
          type="warning"
          showIcon
          message={"Some things you are using have been removed!"}
          className="mv-m"
          description={
            isHostLessPackage(curDep.site) ? (
              <div>
                <div>
                  These external {removedHostlessArtifactLabel} will be removed
                  from this project:
                </div>
                {removedReferencedComponents.size > 0 && (
                  <div>
                    <Icon className="component-fg mr-sm" icon={ComponentIcon} />{" "}
                    Components{" "}
                    {[...removedReferencedComponents]
                      .map((t) => getComponentDisplayName(t))
                      .join(", ")}
                  </div>
                )}
                {functionsList}
              </div>
            ) : (
              <div>
                <div>We will make a copy of them for you in this project:</div>
                {removedReferencedComponents.size > 0 && (
                  <div>
                    <Icon className="component-fg mr-sm" icon={ComponentIcon} />{" "}
                    Components{" "}
                    {[...removedReferencedComponents]
                      .map((t) => getComponentDisplayName(t))
                      .join(", ")}
                  </div>
                )}
                {removedReferencedTokens.size > 0 && (
                  <div>
                    <Icon className="token-fg mr-sm" icon={TokenIcon} /> Style
                    tokens{" "}
                    {[...removedReferencedTokens].map((t) => t.name).join(", ")}
                  </div>
                )}
                {removedReferencedMixins.size > 0 && (
                  <div>
                    <Icon className="mixin-fg mr-sm" icon={MixinIcon} /> Mixins{" "}
                    {[...removedReferencedMixins].map((t) => t.name).join(", ")}
                  </div>
                )}
                {removedReferencedImageAssets.size > 0 && (
                  <div>
                    <Icon className="mixin-fg mr-sm" icon={ImageBlockIcon} />{" "}
                    Images and icons{" "}
                    {[...removedReferencedImageAssets]
                      .map((t) => t.name)
                      .join(", ")}
                  </div>
                )}
                {transitiveDeps.size > 0 && (
                  <div className="mt-m">
                    To copy these objects, we will also need to import these
                    projects:{" "}
                    {[...transitiveDeps].map((dep) => dep.name).join(", ")}
                  </div>
                )}
                {functionsNote}
              </div>
            )
          }
        />
      )}
    </>
  );
});

const WarnChangeDepForm = observer(function WarnChangeDepForm_(props: {
  children?: React.ReactNode;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const { onSubmit, onCancel, children } = props;
  return (
    <Form onFinish={() => onSubmit(true)}>
      <div
        className="mb-xlg"
        style={{ maxHeight: "calc(80vh - 50px)", overflowY: "auto" }}
      >
        {children}
      </div>
      <Form.Item className="m0">
        <Button
          className="mr-sm"
          type="primary"
          htmlType="submit"
          onClick={() => onSubmit(true)}
        >
          Confirm
        </Button>
        <Button onClick={() => onCancel()}>Cancel</Button>
      </Form.Item>
    </Form>
  );
});
