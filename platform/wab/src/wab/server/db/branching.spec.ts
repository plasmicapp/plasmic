import { ProjectDependency, Site } from "@/wab/classes";
import { assert, ensure, sortBy, tuple } from "@/wab/common";
import { TokenType } from "@/wab/commons/StyleToken";
import { withoutUids } from "@/wab/model/model-meta";
import {
  Branch,
  PkgVersion,
  ProjectRevision,
} from "@/wab/server/entities/Entities";
import { DbTestArgs, withDb } from "@/wab/server/test/backend-util";
import { BranchId, MainBranchId, ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { BranchSide } from "@/wab/shared/site-diffs/merge-core";
import { TplMgr } from "@/wab/shared/TplMgr";
import { createSite } from "@/wab/sites";
import L, { omit } from "lodash";
import { getLastBundleVersion } from "./BundleMigrator";
import { DbMgr } from "./DbMgr";

const bundler = new Bundler();

class Helpers {
  revisionNum = 2;
  constructor(
    public db: DbMgr,
    public projectId: ProjectId,
    public branchId?: BranchId
  ) {}
  async save(site: Site, db = this.db) {
    const commonArgs = {
      projectId: this.projectId,
      branchId: this.branchId,
      revisionNum: this.revisionNum,
    };
    const rev = await db.saveProjectRev({
      ...commonArgs,
      data: JSON.stringify(
        bundler.bundle(site, this.projectId, await getLastBundleVersion())
      ),
    });
    await db.savePartialRevision({
      ...commonArgs,
      data: JSON.stringify(commonArgs),
      deletedIids: "{}",
      projectRevisionId: rev.id,
      modifiedComponentIids: [],
    });
    this.revisionNum++;
  }
}

async function withBranch(
  f: (
    ...args: [
      branch: Branch,
      helpers: [mainHelpers: Helpers, branchHelpers: Helpers],
      ...rest: DbTestArgs
    ]
  ) => Promise<void>
) {
  return withDb(async (...args) => {
    const [sudo, [user1], [db1], project] = args;
    const mainHelpers = new Helpers(db1(), project.id);

    await mainHelpers.save(basicSite());
    const { pkgVersion } = await db1().publishProject(
      project.id,
      "0.0.1",
      [],
      "Initial commit"
    );

    const branch = await db1().createBranch(project.id, {
      name: "my-branch",
      pkgVersion,
    });
    const branchHelpers = new Helpers(db1(), project.id, branch.id);
    return f(branch, [mainHelpers, branchHelpers], ...args);
  });
}

function withTokens(baseSite: Site, tokens: Record<string, number>) {
  const site = L.cloneDeep(baseSite);
  for (const [k, v] of Object.entries(tokens)) {
    ensure(
      site.styleTokens.find((t) => t.name === k),
      ""
    ).value = "" + v;
  }
  return site;
}

async function setupMainAndBranch(
  [helpers1, helpers2]: Helpers[],
  {
    data1,
    data2,
    skipPublishMain = false,
  }: {
    data1?: Record<string, number>;
    data2?: Record<string, number>;
    skipPublishMain?: boolean;
  }
) {
  const rev = await helpers1.db.getLatestProjectRev(helpers1.projectId);
  const baseSite = readRev(rev);

  if (data1) {
    await helpers1.save(withTokens(baseSite, data1));
  }
  if (data2) {
    await helpers2.save(withTokens(baseSite, data2));
  }
  if (!skipPublishMain) {
    await helpers1.db.publishProject(
      helpers1.projectId,
      "1.0.0",
      [],
      "Main branch commit"
    );
  }
}

function basicSite(tokens: Record<string, number> = {}) {
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  for (const name of ["x", "y", "z"]) {
    tplMgr.addToken({
      name,
      tokenType: TokenType.LineHeight,
      value: (tokens[name] ?? 0) + "",
    });
  }
  return site;
}

function extractTokensPkgVersion(ver: PkgVersion, projectId: ProjectId) {
  const dep = bundler.unbundle(
    JSON.parse(ver.model),
    ver.id,
    false
  ) as ProjectDependency;
  return Object.fromEntries(
    dep.site.styleTokens.map((token) =>
      tuple(token.name, parseInt(token.value))
    )
  );
}

function readRev(rev: ProjectRevision): Site {
  return bundler.unbundle(JSON.parse(rev.data), rev.projectId, false) as Site;
}

function extractTokensRev(rev: ProjectRevision) {
  const site = readRev(rev);
  return Object.fromEntries(
    site.styleTokens.map((token) => tuple(token.name, parseInt(token.value)))
  );
}

describe("branching", () => {
  it("CRUD a branch works", () =>
    withBranch(
      async (
        branch,
        [mainHelpers, branchHelpers],
        sudo,
        [user1],
        [db1],
        project
      ) => {
        const branchId = branch.id;
        const projectId = project.id;

        // Update and read
        await db1().updateBranch(branchId, { name: "my-branch-renamed" });
        const branchUpdated = await db1().getBranchById(branchId);
        expect(branchUpdated.name).toEqual("my-branch-renamed");

        // Save and read data
        await branchHelpers.save(basicSite({ x: 1 }));
        const branchWritten = await db1().getLatestProjectRev(projectId, {
          branchId,
        });
        expect(extractTokensRev(branchWritten)).toMatchObject({
          x: 1,
        });

        // Check that partials work
        const partials = await db1().getPartialRevsFromRevisionNumber(
          projectId,
          branchHelpers.revisionNum - 2,
          branchId
        );
        expect(partials.length).toBe(1);
        expect(JSON.parse(partials[0].data)).toMatchObject({
          revisionNum: branchHelpers.revisionNum - 1,
          branchId,
        });
        await db1().clearPartialRevisionsCacheForProject(projectId, branchId);
        expect(
          await db1().getPartialRevsFromRevisionNumber(
            projectId,
            branchHelpers.revisionNum - 2,
            branchId
          )
        ).toBeEmpty();

        // Clone branch
        await db1().cloneBranch(branchId, { name: "my-branch-cloned" });

        // List branches
        await db1().createBranchFromLatestPkgVersion(projectId, {
          name: "another-branch",
        });
        const allBranches = await db1().listBranchesForProject(projectId);
        expect(sortBy(allBranches, (b) => b.name)).toMatchObject([
          {
            name: "another-branch",
          },
          {
            name: "my-branch-cloned",
          },
          {
            name: "my-branch-renamed",
          },
        ]);

        // Delete - everything after should fail
        await db1().deleteBranch(branchId);
        await expect(
          db1().updateBranch(branchId, { name: "my-branch-renamed-again" })
        ).toReject();
        await expect(db1().getBranchById(branchId)).toReject();
        await expect(branchHelpers.save(basicSite({ x: 2 }))).toReject();
        await expect(
          db1().getLatestProjectRev(projectId, {
            branchId,
          })
        ).toReject();
        await expect(db1().deleteBranch(branchId)).toReject();
      }
    ));

  it("enforces naming rules", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      // Disallowed names
      for (const name of ["main", "master", "hi ho", "", "-"]) {
        await expect(
          db1().createBranchFromLatestPkgVersion(project.id, {
            name,
          })
        ).toReject();
      }

      // Allowed names
      for (const name of ["feat-1", "a", "Feat-1", "feats/alpha"]) {
        await expect(
          db1().createBranchFromLatestPkgVersion(project.id, {
            name,
          })
        ).toResolve();
      }

      // Disallow duplicate names
      await expect(
        db1().createBranchFromLatestPkgVersion(project.id, {
          name: "feat-1",
        })
      ).toReject();
      await expect(
        db1().updateBranch(branch.id, {
          name: "feat-1",
        })
      ).toReject();
    }));

  it("latest revision of new unchanged branch is identical to original pkgversion", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      const branchId = branch.id;

      const latestBranchRev = await db1().getLatestProjectRev(project.id, {
        branchId,
      });
      const [basePkgVersion] = await db1().listPkgVersions(
        ensure(await db1().getPkgByProjectId(project.id), "").id,
        {
          includeData: true,
        }
      );
      expect(
        withoutUids(
          bundler.unbundle(JSON.parse(latestBranchRev.data), project.id)
        ) as Site
      ).toEqual(
        withoutUids(
          (
            bundler.unbundle(
              JSON.parse(basePkgVersion.model),
              basePkgVersion.id
            ) as ProjectDependency
          ).site
        )
      );
    }));

  it("can create and list commits on any branch", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      const branchId = branch.id;

      await setupMainAndBranch(helpers, {
        data1: { x: 1 },
        data2: { x: 2 },
      });

      // Make commits on the branch
      await db1().publishProject(
        project.id,
        "1.0.0",
        [],
        "First branch commit",
        undefined,
        undefined,
        branchId
      );
      await helpers[1].save(basicSite({ x: 3 }));
      await db1().publishProject(
        project.id,
        "1.1.0",
        [],
        "Second branch commit",
        undefined,
        undefined,
        branchId
      );

      // Can still list all the original main branch commits
      const pkg = ensure(await db1().getPkgByProjectId(project.id), "");
      const mainCommits = await db1().listPkgVersions(pkg.id, {
        includeData: true,
      });
      expect(mainCommits).toMatchObject([
        {
          version: "1.0.0",
          description: "Main branch commit",
        },
        {
          version: "0.0.1",
          description: "Initial commit",
        },
      ]);

      // List branch commits - contains just the branch commits since fork, not the main ones
      const branchCommits = await db1().listPkgVersions(pkg.id, {
        includeData: true,
        branchId,
      });
      expect(branchCommits).toMatchObject([
        {
          version: "1.1.0",
          description: "Second branch commit",
        },
        {
          version: "1.0.0",
          description: "First branch commit",
        },
      ]);

      // Latest main commit and latest branch commit are correct
      const latestBranchCommit = await db1().getPkgVersion(
        pkg.id,
        undefined,
        undefined,
        {
          branchId,
        }
      );
      expect(latestBranchCommit).toMatchObject({
        version: "1.1.0",
      });
      const latestMainCommit = await db1().getPkgVersion(pkg.id);
      expect(latestMainCommit).toMatchObject({
        version: "1.0.0",
      });
    }));

  it("shares the same permissions as the main branch", () =>
    withBranch(
      async (branch, helpers, sudo, [user1, user2], [db1, db2], project) => {
        const projectId = project.id;
        const branchId = branch.id;

        await db1().updateProject({
          id: projectId,
          inviteOnly: true,
        });

        // Read access to branch requires read access to project
        await expect(
          db2().getLatestProjectRev(projectId, { branchId })
        ).toReject();
        await expect(db2().listPkgVersions(projectId, { branchId })).toReject();
        await db1().grantProjectPermissionByEmail(
          projectId,
          user2.email,
          "commenter"
        );
        await db2().getLatestProjectRev(projectId, { branchId });
        // await db2().listPkgVersions(projectId, { branchId });

        // Write access to branch requires write access to project
        await expect(helpers[1].save(basicSite({ x: 1 }), db2())).toReject();
        await db1().grantProjectPermissionByEmail(
          projectId,
          user2.email,
          "editor"
        );
        await helpers[1].save(basicSite({ x: 1 }), db2());
      }
    ));

  it("e2e test sketch", () => {
    // cannot edit protected main branch
    // create a branch
    // save revision
    // can codegen branch
    // try merging
    // conflict
    // resolve conflicts
    // merge!
    // pull up branch again
  });
});

describe("merging", () => {
  it("merging fails if destination has outstanding changes", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      const projectId = project.id;
      const branchId = branch.id;

      await setupMainAndBranch(helpers, {
        data1: { x: 1 },
        data2: { x: 1 },
        skipPublishMain: true,
      });

      // Cannot merge with uncommitted changes on destination
      expect(
        await db1().previewMergeBranch({
          fromBranchId: branchId,
          toBranchId: MainBranchId,
        })
      ).toMatchObject({
        status: "uncommitted changes on destination branch",
      });
      expect(
        await db1().tryMergeBranch({
          toBranchId: MainBranchId,
          fromBranchId: branchId,
        })
      ).toMatchObject({
        status: "uncommitted changes on destination branch",
      });

      // Commit main
      await db1().publishProject(projectId, "1.1.0", [], "Another main commit");

      // Merge works now
      expect(
        await db1().tryMergeBranch({
          toBranchId: MainBranchId,
          fromBranchId: branchId,
        })
      ).toMatchObject({
        status: "can be merged",
      });
    }));

  // TODO re-enable this one once tryMerge starts returning a good mergedSite again
  it("merging auto-commits on source branch before merge and creates post-merge commit on dest branch", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      await setupMainAndBranch(helpers, {
        data1: { x: 1, y: 1 },
        data2: { x: 1, z: 1 },
      });
      expect(
        await db1().tryMergeBranch({
          toBranchId: MainBranchId,
          fromBranchId: branch.id,
        })
      ).toMatchObject({
        status: "can be merged",
      });

      const pkg = ensure(await db1().getPkgByProjectId(project.id), "");

      const [postMerge, commitOnMain, init] = await db1().listPkgVersions(
        pkg.id,
        {
          includeData: true,
        }
      );
      const [preMergeOnBranch] = await db1().listPkgVersions(pkg.id, {
        includeData: true,
        branchId: branch.id,
      });

      expect(extractTokensPkgVersion(postMerge, project.id)).toEqual({
        x: 1,
        y: 1,
        z: 1,
      });
      expect(extractTokensPkgVersion(preMergeOnBranch, project.id)).toEqual({
        x: 1,
        y: 0,
        z: 1,
      });
      expect(extractTokensPkgVersion(commitOnMain, project.id)).toEqual({
        x: 1,
        y: 1,
        z: 0,
      });
      expect(extractTokensPkgVersion(init, project.id)).toEqual({
        x: 0,
        y: 0,
        z: 0,
      });

      expect(
        extractTokensRev(await db1().getLatestProjectRev(project.id))
      ).toEqual({ x: 1, y: 1, z: 1 });
      expect(
        extractTokensRev(
          await db1().getLatestProjectRev(project.id, { branchId: branch.id })
        )
      ).toEqual({ x: 1, y: 0, z: 1 });
    }));

  it("merging auto-commits on destination branch if so chosen", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      await setupMainAndBranch(helpers, {
        data1: { x: 1, y: 1 },
        data2: { x: 1, z: 1 },
        skipPublishMain: true,
      });

      expect(
        await db1().tryMergeBranch({
          toBranchId: MainBranchId,
          fromBranchId: branch.id,
          autoCommitOnToBranch: true,
        })
      ).toMatchObject({
        status: "can be merged",
      });

      const pkg = ensure(await db1().getPkgByProjectId(project.id), "");

      const [postMerge, commitOnMain, init] = await db1().listPkgVersions(
        pkg.id,
        {
          includeData: true,
        }
      );
      const [preMergeOnBranch] = await db1().listPkgVersions(pkg.id, {
        includeData: true,
        branchId: branch.id,
      });

      expect(extractTokensPkgVersion(postMerge, project.id)).toEqual({
        x: 1,
        y: 1,
        z: 1,
      });
      expect(extractTokensPkgVersion(preMergeOnBranch, project.id)).toEqual({
        x: 1,
        y: 0,
        z: 1,
      });
      expect(extractTokensPkgVersion(commitOnMain, project.id)).toEqual({
        x: 1,
        y: 1,
        z: 0,
      });
      expect(extractTokensPkgVersion(init, project.id)).toEqual({
        x: 0,
        y: 0,
        z: 0,
      });
    }));

  it("merging fails if there are conflicts", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      const projectId = project.id;
      const branchId = branch.id;

      await setupMainAndBranch(helpers, {
        data1: { x: 1 },
        data2: { x: 2 },
      });

      // Hit merge conflicts
      const previewResult = await db1().previewMergeBranch({
        fromBranchId: branchId,
        toBranchId: MainBranchId,
      });
      expect(previewResult).toMatchObject({
        status: "has conflicts",
      });
      const mergeResult = await db1().tryMergeBranch({
        fromBranchId: branchId,
        toBranchId: MainBranchId,
      });
      expect(mergeResult).toMatchObject({
        status: "has conflicts",
      });
      assert(mergeResult.status === "has conflicts", "");

      // Merge works now
      const mergeStep = ensure(
        mergeResult.mergeStep,
        "mergeStep expected to be present"
      );
      expect(
        await db1().tryMergeBranch({
          fromBranchId: branchId,
          toBranchId: MainBranchId,
          resolution: {
            picks: Object.fromEntries(
              mergeStep.status === "needs-resolution"
                ? mergeStep.genericDirectConflicts.flatMap((cf) =>
                    cf.conflictType === "generic"
                      ? cf.conflictDetails.map((dt) =>
                          tuple(dt.pathStr, "left" as BranchSide)
                        )
                      : []
                  )
                : []
            ),
            expectedToRevisionNum: mergeResult.toRevisionNum,
            expectedFromRevisionNum: mergeResult.fromRevisionNum,
          },
        })
      ).toMatchObject({
        status: "resolution accepted",
      });

      const pkg = ensure(await db1().getPkgByProjectId(projectId), "");
      const [postMerge] = await db1().listPkgVersions(pkg.id, {
        includeData: true,
      });

      expect(extractTokensPkgVersion(postMerge, projectId)).toEqual({
        x: 2,
        y: 0,
        z: 0,
      });
    }));

  it("merging fails if there were concurrent changes or commits made while resolving conflicts", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      const projectId = project.id;
      const branchId = branch.id;

      const rev = await helpers[0].db.getLatestProjectRev(helpers[0].projectId);
      const baseSite = readRev(rev);
      await setupMainAndBranch(helpers, {
        data1: { x: 1 },
        data2: { x: 2 },
      });

      // Hit merge conflicts
      const mergeResult = await db1().tryMergeBranch({
        fromBranchId: branchId,
        toBranchId: MainBranchId,
      });
      assert(mergeResult.status === "has conflicts", "");
      // TODO Resolve conflicts
      const resolvedSite = basicSite({ x: 2 });

      // But another tab swoops in and makes changes on the branch!
      await helpers[1].save(withTokens(baseSite, { x: 3 }));
      expect(
        await db1().tryMergeBranch({
          fromBranchId: branchId,
          toBranchId: MainBranchId,
          resolution: {
            resolvedSite,
            expectedToRevisionNum: mergeResult.toRevisionNum,
            expectedFromRevisionNum: mergeResult.fromRevisionNum,
          },
        })
      ).toMatchObject({
        status: "concurrent source branch changes during merge",
      });

      // TODO Resolve again
      const mergeResult2 = await db1().tryMergeBranch({
        fromBranchId: branchId,
        toBranchId: MainBranchId,
      });
      assert(mergeResult2.status === "has conflicts", "");
      const resolvedSite2 = basicSite({ x: 2 });

      // But another commit got made to the main branch!
      await helpers[0].save(withTokens(baseSite, { x: 4 }));
      await db1().publishProject(projectId, "1.1.0", [], "Swoop");
      expect(
        await db1().tryMergeBranch({
          fromBranchId: branchId,
          toBranchId: MainBranchId,
          resolution: {
            resolvedSite: resolvedSite2,
            expectedToRevisionNum: mergeResult2.toRevisionNum,
            expectedFromRevisionNum: mergeResult2.fromRevisionNum,
          },
        })
      ).toMatchObject({
        status: "concurrent destination branch changes during merge",
      });

      // TODO Resolve again
      const mergeResult3 = await db1().tryMergeBranch({
        fromBranchId: branchId,
        toBranchId: MainBranchId,
      });
      assert(mergeResult3.status === "has conflicts", "");
      const resolvedSite3 = basicSite({ x: 4 });

      // This time we did it!
      expect(
        await db1().tryMergeBranch({
          fromBranchId: branchId,
          toBranchId: MainBranchId,
          resolution: {
            resolvedSite: resolvedSite3,
            expectedToRevisionNum: mergeResult3.toRevisionNum,
            expectedFromRevisionNum: mergeResult3.fromRevisionNum,
          },
        })
      ).toMatchObject({
        status: "resolution accepted",
      });
    }));

  it("merging uses new ancestor after pulling into local branch", () =>
    withBranch(async (branch, helpers, sudo, [user1], [db1], project) => {
      await setupMainAndBranch(helpers, {
        data1: { x: 1, y: 1 },
        data2: { x: 1, z: 1 },
      });

      // Before pull
      const pkg = ensure(await db1().getPkgByProjectId(project.id), "");
      const [commitOnMain, init] = await db1().listPkgVersions(pkg.id);
      expect(
        await db1().listPkgVersions(pkg.id, {
          branchId: branch.id,
        })
      ).toBeEmpty();

      // Pull latest from main - ancestor should be initial commit on main
      expect(
        await db1().tryMergeBranch({
          fromBranchId: MainBranchId,
          toBranchId: branch.id,
          autoCommitOnToBranch: true,
        })
      ).toMatchObject({
        status: "can be merged",
        ancestorPkgVersionId: init.id,
      });

      // After pull
      const [postMerge, preMergeOnBranch] = await db1().listPkgVersions(
        pkg.id,
        {
          branchId: branch.id,
        }
      );

      // Now push to main - ancestor should be merge commit on branch
      expect(
        await db1().tryMergeBranch({
          toBranchId: MainBranchId,
          fromBranchId: branch.id,
        })
      ).toMatchObject({
        status: "can be merged",
        ancestorPkgVersionId: commitOnMain.id,
        fromPkgVersionId: postMerge.id,
        toPkgVersionId: commitOnMain.id,
      });

      // Branch should not have changed
      expect(
        (
          await db1().listPkgVersions(pkg.id, {
            branchId: branch.id,
          })
        ).map((pkgVersion) => omit(pkgVersion, "branch"))
      ).toEqual(
        [postMerge, preMergeOnBranch].map((pkgVersion) =>
          omit(pkgVersion, "branch")
        )
      );
    }));
});
