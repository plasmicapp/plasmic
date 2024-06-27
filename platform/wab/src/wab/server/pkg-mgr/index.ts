import { assert } from "@/wab/shared/common";
import { InsertableTemplatesGroup } from "@/wab/shared/devflags";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { unbundleWithDeps } from "@/wab/server/db/DbBundleLoader";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { Pkg, PkgVersion, User } from "@/wab/server/entities/Entities";
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { ProjectDependency } from "@/wab/shared/model/classes";
import fs from "fs";
import path from "path";
/**
 * PkgMgr is responsible for generating Plasmic projects from data/*-master-pkg.json files.
 * This helps seed our localhost dev setup with a set of important Plasmic projects (like Plume, Plexus, etc.)
 *
 * Feel free to add more projects to data/*-master-pkg.json and then running `yarn db:reset` should create those projects locally
 *
 * To download a project's data/*-master-pkg.json file from prod, use studio.plasmic.app/admin/dev -> Download Pkg as JSON for Pkg-mgr
 */
export class PkgMgr {
  constructor(private db: DbMgr, private sysname: string) {
    console.log("created with sysname", sysname);
  }

  async unbundleAndSave(
    bundle: Bundle,
    user: User,
    depPkgVersionId: string,
    sysname?: string
  ) {
    const name = bundle.map[bundle.root].name;
    const projectId = bundle.map[bundle.root].projectId;
    const pkgId = bundle.map[bundle.root].pkgId;
    const { project } = await this.db.createProject({
      name,
      ownerId: user.id,
      projectId,
    });
    console.log(
      `Created ${this.sysname} ${name} project ${project.id} for user ${user.email}`
    );

    // Create the pkg linked to that project, so that the developer
    // can continue updating the project and publishing new changes locally
    const pkg = await this.db.createSysPkg(sysname ?? name, project.id, pkgId);

    await this.upsertLatest(pkg, bundle, depPkgVersionId);
  }

  /**
   * Seeds a fresh database with an initial pkg
   */
  async seedPkg() {
    assert(
      !(await this.tryGetPkg(this.sysname)),
      `Not expecting a ${this.sysname} pkg to already exist`
    );

    // Create a new project, owned by the "oldest" user
    const user = await this.db
      .getEntMgr()
      .getRepository(User)
      .createQueryBuilder()
      .orderBy({
        '"createdAt"': "ASC",
      })
      .limit(1)
      .getOneOrFail();

    const {
      master: [masterPkgVersionId, masterBundle],
      deps,
    } = parseMasterPkg(this.sysname);
    await Promise.all(
      deps.map(async ([depPkgVersionId, bundle]) => {
        await this.unbundleAndSave(bundle, user, depPkgVersionId);
      })
    );

    await this.unbundleAndSave(
      masterBundle,
      user,
      masterPkgVersionId,
      this.sysname
    );
  }

  /**
   * Updates the existing pkg to be the content of master-pkg.json
   */
  async upgradePkg() {
    console.log(`Upgrading ${this.sysname}...`);
    const pkg = await this.tryGetPkg(this.sysname);
    if (!pkg) {
      console.log(`Creating ${this.sysname} pkg for the first time...`);
      await this.seedPkg();
      return;
    }

    const {
      master: [masterPkgVersionId, masterBundle],
      deps,
    } = parseMasterPkg(this.sysname);
    await Promise.all(
      deps.map(async ([depPkgVersionId, bundle]) => {
        const depName = bundle.map[bundle.root].name;
        const depPkg = await this.tryGetPkg(depName);
        if (!depPkg) {
          throw new Error(
            `Could not find dependency ${depName} of existing ${this.sysname} pkg`
          );
        }
        await this.upsertLatest(depPkg, bundle, depPkgVersionId);
      })
    );
    await this.upsertLatest(pkg, masterBundle, masterPkgVersionId);
  }

  private async upsertLatest(
    pkg: Pkg,
    pkgBundle: Bundle,
    pkgVersionId: string
  ) {
    const rev = await this.db.getLatestProjectRev(pkg.projectId);

    const bundler = new Bundler();
    const dep = (await unbundleWithDeps(
      this.db,
      bundler,
      pkg.projectId,
      pkgBundle
    )) as ProjectDependency;

    const deleteRes = await this.db
      .getEntMgr()
      .getRepository(PkgVersion)
      .delete({
        pkgId: pkg.id,
      });
    console.log(`Deleting existing versions (there are ${deleteRes.affected})`);

    console.log(`Updating to ${this.sysname} package version`, dep.version);
    const newRev = await this.db.saveProjectRev({
      projectId: rev.projectId,
      data: JSON.stringify(
        bundler.bundle(dep.site, rev.projectId, await getLastBundleVersion())
      ),
      revisionNum: rev.revision + 1,
    });
    console.log("created a new revision", newRev.revision);
    // create the new pkg version with the same pkgId as in the master-pkg.json, because it will be used in the deps array
    const pkgVersion = await this.db.insertPkgVersion(
      pkg.id,
      dep.version,
      JSON.stringify(pkgBundle),
      [],
      "",
      newRev.revision,
      undefined,
      pkgVersionId
    );
    console.log(`inserted a pkg version ${pkgVersion.id}`);
  }

  private async tryGetPkg(sysname: string) {
    return await this.db.getEntMgr().getRepository(Pkg).findOne({
      where: {
        sysname,
      },
    });
  }
}

export function getBundleInfo(sysname: string) {
  const {
    master: [_, bundle],
  } = parseMasterPkg(sysname);
  const root = bundle.map[bundle.root];
  const { projectId, site } = root;
  return { bundle, projectId, site };
}

export function getDevflagForInsertableTemplateItem(
  sysname: string
): InsertableTemplatesGroup {
  /**
   *  {
        "type": "insertable-templates-component",
        "projectId": "mSQqkNd8CL5vNdDTXJPXfU",
        "componentName": "Plexus Button",
        "templateName": "plexus/button",
        "imageUrl": "https://static1.plasmic.app/antd_button.svg"
      }
   */
  const { bundle, projectId, site } = getBundleInfo(sysname);
  const defaultComponents = bundle.map[site.__ref].defaultComponents;
  const items = Object.keys(defaultComponents).map(
    (defaultKind): InsertableTemplatesGroup["items"][0] => {
      /**
       * NOTE: Currently, we require that the default components in the insertable template project are set. E.g. Plexus Button set as the default button component in the Plexus project
       * That helps us to fetch the default component and create a template name for it that fits the required pattern (e.g. plexus/button)
       */
      const ref = defaultComponents[defaultKind].__ref;
      const defaultComp = bundle.map[ref];
      return {
        type: "insertable-templates-component",
        projectId,
        componentName: defaultComp.name,
        templateName: `${sysname}/${defaultKind}`,
        imageUrl: `https://static1.plasmic.app/insertables/${defaultKind}.svg`,
        tokenResolution: "reuse-by-name",
      };
    }
  );
  return {
    type: "insertable-templates-group",
    name: "Components",
    items,
  };
}

export function parseMasterPkg(sysname: string) {
  const projectData = JSON.parse(
    fs
      .readFileSync(path.join(__dirname, "data", `${sysname}-master-pkg.json`))
      .toString()
  ) as [string, Bundle][];

  const deps = projectData.slice(0, -1);
  const master = projectData.slice(-1)[0];

  return { master, deps };
}

export async function getAllSysnames(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(path.join(__dirname, "data"), (err, files) => {
      if (err) {
        console.error("Unable to scan directory: " + err);
        reject(err);
      }

      // Filter out only files
      files = files.filter((file) => {
        const filePath = path.join(__dirname, "data", file);
        return fs.lstatSync(filePath).isFile();
      });

      const sysnames = files.map((file) =>
        file.replace("-master-pkg.json", "")
      );
      return resolve(sysnames);
    });
  });
}
