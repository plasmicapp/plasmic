import React from "react";

import { NonAuthCtx, loadAppCtx, useNonAuthCtx } from "@/wab/client/app-ctx";
import {
  ApiBranch,
  ApiUser,
  CommitGraph,
  MainBranchId,
} from "@/wab/shared/ApiSchema";
import { PkgVersionInfoMeta } from "@/wab/shared/SharedApi";
import { assert, ensure } from "@/wab/shared/common";
import "@xyflow/react/dist/style.css";
import { Button, Descriptions, Input, notification } from "antd";
import { keyBy, maxBy, uniq } from "lodash";
import moment from "moment";

const ReactFlowPromise = import("@xyflow/react");
const lazyReactFlowComponent = (
  component: "ReactFlow" | "Controls" | "MiniMap" | "Background"
) =>
  React.lazy(() =>
    ReactFlowPromise.then((module) => ({
      default: module[component],
    }))
  );

const LazyReactFlow = lazyReactFlowComponent("ReactFlow");
const LazyControls = lazyReactFlowComponent("Controls");
const LazyBackground = lazyReactFlowComponent("Background");

const X_AXIS_SCALE = 150;
const Y_AXIS_SCALE = 180;

function timeFromDate(time: string | Date) {
  return new Date(time).getTime();
}

interface ProjectMetadata {
  projectId: string;
  branches: ApiBranch[];
  pkgVersions: PkgVersionInfoMeta[];
  commitGraph: CommitGraph;
  users: ApiUser[];
}

function PkgVersionNodeInfo(props: {
  pkgVersion: PkgVersionInfoMeta;
  branchName: string;
}) {
  const { branchName, pkgVersion } = props;

  const createdAt = moment(pkgVersion.createdAt);

  return (
    <div>
      <p>{branchName}</p>
      <p>{pkgVersion.version}</p>
      <p>{createdAt.format("YYYY-MM-DD HH:mm:ss")}</p>
      <p>{createdAt.fromNow()}</p>
    </div>
  );
}

function PkgVersionDetails(props: {
  nonAuthCtx: NonAuthCtx;
  metadata: ProjectMetadata;
  pkgVersionId: string;
}) {
  const { nonAuthCtx, metadata, pkgVersionId } = props;
  const currentPkgVersion = ensure(
    metadata.pkgVersions.find((pkgVersion) => pkgVersion.id === pkgVersionId),
    `pkgVersion ${pkgVersionId} not found`
  );

  const createdAt = moment(currentPkgVersion.createdAt);
  const author = metadata.users.find(
    (user) => user.id === currentPkgVersion.createdById
  );

  const parents = metadata.commitGraph.parents[pkgVersionId];

  async function downloadDataBasedOnPkgVersions(
    pkgVersionsToDownload: PkgVersionInfoMeta[]
  ) {
    assert(pkgVersionsToDownload.length > 0, "expected at least one parent");

    const hasMainVersion = pkgVersionsToDownload.some(
      (pkgVersion) => !pkgVersion.branchId
    );

    if (!hasMainVersion) {
      assert(pkgVersionsToDownload.length === 1, "expected only one parent");
      const oldestMainVersionBeforeParent = ensure(
        maxBy(
          metadata.pkgVersions.filter(
            (pkgVersion) =>
              timeFromDate(pkgVersion.createdAt) <
              timeFromDate(pkgVersionsToDownload[0].createdAt)
          ),
          (pkgVersion) => timeFromDate(pkgVersion.createdAt)
        ),
        "No main version found"
      );

      pkgVersionsToDownload.push(oldestMainVersionBeforeParent);
    }

    try {
      const appCtx = await loadAppCtx(nonAuthCtx);
      await appCtx.ops?.downloadFullProjectData(
        metadata.projectId,
        pkgVersionsToDownload.map(
          (pkgVersion) =>
            `${pkgVersion.branchId ?? MainBranchId}@${pkgVersion.id}`
        )
      );
    } catch (e) {
      notification.error({ message: `${e}` });
    }
  }

  async function downloadDataPriorToMerge() {
    const parentPkgVersions = parents.map((parent) =>
      metadata.pkgVersions.find((pkgVersion) => pkgVersion.id === parent)
    );
    await downloadDataBasedOnPkgVersions(parentPkgVersions);
  }

  async function downloadCurrentPkgVersionData() {
    await downloadDataBasedOnPkgVersions([currentPkgVersion]);
  }

  return (
    <div>
      <Descriptions title="Package Version Info" layout="vertical">
        <Descriptions.Item label="Package Version ID">
          {pkgVersionId}
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          {`${createdAt.format(
            "YYYY-MM-DD HH:mm:ss"
          )} (${createdAt.fromNow()})`}
        </Descriptions.Item>
        <Descriptions.Item label="Created By">
          {author?.email}
        </Descriptions.Item>
        <Descriptions.Item label="Parents">
          <div>
            {parents.map((parent) => (
              <p key={parent}>{parent}</p>
            ))}
          </div>
        </Descriptions.Item>
        <Descriptions.Item label="Description">
          {currentPkgVersion.description}
        </Descriptions.Item>
      </Descriptions>
      <Button onClick={() => downloadCurrentPkgVersionData()}>
        Download current state
      </Button>
      <Button onClick={() => downloadDataPriorToMerge()}>
        Download state prior to this version/merge
      </Button>
    </div>
  );
}

export function AdminBranchingInspector() {
  const nonAuthCtx = useNonAuthCtx();
  const [projectId, setProjectId] = React.useState<string>("");
  const [projectMetadata, setProjectMetadata] =
    React.useState<ProjectMetadata | null>(null);
  const [selectedPkgVersionId, setSelectedPkgVersionId] = React.useState<
    string | null
  >(null);

  // To compute nodes and edges for the commit graph we will consider all the
  // package versions in the project. We can consider each package version as a
  // node. The relation between the package versions are identified by the commitGraph.
  //
  // The commitGraph.parents maps a package version id to its parent package versions.
  // If there is a single parent, then this node was the result of a single publish operation.
  // If there are two parents, then this node was the result of a merge operation.
  //
  // When positioning the nodes, we will put the most recent package version at the top and
  // the oldest package version at the bottom. We will also consider the branches in the project
  // and position the nodes from the same branch in the same vertical line (lane). This way
  // we can visually see the history of each branch. We will also consider the main branch
  // as a special case and position it at the 0th lane. The other branches will positioned closer to the main
  // based on how recent there were changes to it. Branches that don't have any package versions
  // will not be shown in the UI.
  const computeNodesAndEdges = () => {
    if (!projectMetadata) {
      return {
        nodes: [],
        edges: [],
      };
    }

    const { branches, pkgVersions, commitGraph } = projectMetadata;

    const latestBranchUpdate = (branch: ApiBranch) => {
      const branchPkgVersions = pkgVersions.filter(
        (pkgVersion) => pkgVersion.branchId === branch.id
      );
      return branchPkgVersions.reduce((acc, pkgVersion) => {
        const createdAtTime = timeFromDate(pkgVersion.createdAt);
        return Math.max(acc, createdAtTime);
      }, timeFromDate(branch.createdAt));
    };

    const branchesById = keyBy(branches, "id");
    const branchLanes = {
      // Main branch is always at the 0th lane
      main: 0,
      ...branches
        // Only include branches that have some package version
        .filter((a) => latestBranchUpdate(a) > timeFromDate(a.createdAt))
        // More recent branches will appear closer to the 0th lane
        .sort((a, b) => latestBranchUpdate(b) - latestBranchUpdate(a))
        .reduce((acc, branch, idx) => {
          // We can improve this by considering the interval of time in which the branch was updated
          // and position multiple branches in the same lane if their updates are far apart.
          acc[branch.id] = idx + 1;
          return acc;
        }, {} as Record<string, number>),
    };

    const allCreatedTimesDecrescent = uniq(
      pkgVersions.map((pkgVersion) => timeFromDate(pkgVersion.createdAt))
    ).sort((a, b) => b - a);

    const nodes = pkgVersions.map((pkgVersion) => {
      const branchId = pkgVersion.branchId || MainBranchId;
      const createdAtTime = timeFromDate(pkgVersion.createdAt);
      const branchName =
        branchId === MainBranchId ? "main" : branchesById[branchId].name;

      const x = branchLanes[branchId] * X_AXIS_SCALE;
      const y = allCreatedTimesDecrescent.indexOf(createdAtTime) * Y_AXIS_SCALE;

      return {
        id: pkgVersion.id,
        position: {
          x,
          y,
        },
        data: {
          label: (
            <PkgVersionNodeInfo
              pkgVersion={pkgVersion}
              branchName={branchName}
            />
          ),
        },
      };
    });

    const edges = Object.entries(commitGraph.parents)
      .map(([destId, ancestors]) => {
        return ancestors.map((ancestor) => {
          // The direction is reversed for a better UI experience since we will
          // be showing the relations from the top to the bottom
          return {
            id: `${ancestor}-${destId}`,
            source: destId,
            target: ancestor,
          };
        });
      })
      .flat();

    return {
      nodes,
      edges,
    };
  };

  const { nodes, edges } = computeNodesAndEdges();

  return (
    <div>
      <h2>Branching Inspector</h2>
      <Input
        placeholder="Project ID"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      />
      <Button
        onClick={async () => {
          const metadata = await nonAuthCtx.api.getProjectBranchesMetadata(
            projectId
          );
          setSelectedPkgVersionId(null);
          setProjectMetadata({
            projectId,
            ...metadata,
          });
        }}
      >
        Load
      </Button>
      {selectedPkgVersionId && projectMetadata && (
        <div style={{ marginTop: 32 }}>
          <PkgVersionDetails
            nonAuthCtx={nonAuthCtx}
            metadata={projectMetadata}
            pkgVersionId={selectedPkgVersionId}
          />
        </div>
      )}
      <div style={{ marginTop: 32 }}>
        <React.Suspense>
          <div
            style={{
              width: "100%",
              height: "60vh",
            }}
          >
            <LazyReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={(e, node) => {
                setSelectedPkgVersionId(node.id);
              }}
              panOnScroll
              selectionOnDrag
            >
              <LazyControls />
              <LazyBackground gap={12} size={1} />
            </LazyReactFlow>
          </div>
        </React.Suspense>
      </div>
    </div>
  );
}
