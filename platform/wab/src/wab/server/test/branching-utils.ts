import { TokenType } from "@/wab/commons/StyleToken";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  Branch,
  PkgVersion,
  ProjectRevision,
} from "@/wab/server/entities/Entities";
import { DbTestArgs, withDb } from "@/wab/server/test/backend-util";
import { BranchId, ProjectId } from "@/wab/shared/ApiSchema";
import { TplMgr } from "@/wab/shared/TplMgr";
import { Bundler } from "@/wab/shared/bundler";
import { ensure, tuple } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";
import { ProjectDependency, Site } from "@/wab/shared/model/classes";
import L from "lodash";

export const bundler = new Bundler();

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

export async function withBranch(
  f: (
    ...args: [
      branch: Branch,
      helpers: [mainHelpers: Helpers, branchHelpers: Helpers],
      ...rest: DbTestArgs
    ]
  ) => Promise<void>,
  opts?: { numUsers?: number }
) {
  return withDb(async (...args) => {
    const [_sudo, _users, [db1], project] = args;
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
  }, opts);
}

export function withTokens(baseSite: Site, tokens: Record<string, number>) {
  const site = L.cloneDeep(baseSite);
  for (const [k, v] of Object.entries(tokens)) {
    ensure(
      site.styleTokens.find((t) => t.name === k),
      ""
    ).value = "" + v;
  }
  return site;
}

export async function setupMainAndBranch(
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

export function basicSite(tokens: Record<string, number> = {}) {
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

export function extractTokensPkgVersion(ver: PkgVersion, projectId: ProjectId) {
  const dep = bundler.unbundle(
    JSON.parse(ver.model),
    ver.id
  ) as ProjectDependency;
  return Object.fromEntries(
    dep.site.styleTokens.map((token) =>
      tuple(token.name, parseInt(token.value))
    )
  );
}

export function readRev(rev: ProjectRevision): Site {
  return bundler.unbundle(JSON.parse(rev.data), rev.projectId) as Site;
}

export function extractTokensRev(rev: ProjectRevision) {
  const site = readRev(rev);
  return Object.fromEntries(
    site.styleTokens.map((token) => tuple(token.name, parseInt(token.value)))
  );
}
