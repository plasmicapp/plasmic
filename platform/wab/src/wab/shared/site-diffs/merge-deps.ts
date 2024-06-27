import { ensure, removeWhere } from "@/wab/shared/common";
import { lt, sortAsc } from "@/wab/commons/semver";
import { upgradeProjectDeps } from "@/wab/shared/core/project-deps";
import { Bundler } from "@/wab/shared/bundler";
import { ProjectDependency, Site } from "@/wab/shared/model/classes";

export function fixProjectDependencies(
  ancestor: Site,
  left: Site,
  right: Site,
  merged: Site,
  bundler: Bundler
) {
  const [ancestorDeps, leftDeps, rightDeps] = [ancestor, left, right].map(
    (site) => new Map(site.projectDependencies.map((dep) => [dep.pkgId, dep]))
  );
  const allDeps = [
    ...new Set(
      [ancestorDeps, leftDeps, rightDeps].flatMap((deps) => [...deps.keys()])
    ),
  ];

  // Each entry contains a list of updates to run sequentially
  const updates: [ProjectDependency, ProjectDependency | undefined][][] = [];

  allDeps.forEach((pkgId) => {
    const ancestorDep = ancestorDeps.get(pkgId);
    if (ancestorDep) {
      // The dependency pre-existed, check for changes
      if (!leftDeps.has(pkgId) || !rightDeps.has(pkgId)) {
        // Dep has been deleted! We need to delete it in the merged site
        const maybeOtherVersion = leftDeps.get(pkgId) || rightDeps.get(pkgId);
        if (maybeOtherVersion) {
          // Update before deleting!
          updates.push([
            [ancestorDep, maybeOtherVersion],
            [maybeOtherVersion, undefined],
          ]);
        } else {
          // No update, simply delete it
          updates.push([[ancestorDep, undefined]]);
        }
      } else {
        // Not deleted, but might have upgraded (maybe more than once!)
        const leftDep = ensure(
          leftDeps.get(pkgId),
          `Already checked for deletion`
        );
        const rightDep = ensure(
          rightDeps.get(pkgId),
          `Already checked for deletion`
        );
        // Get the ordered list of versions and upgrade sequentially
        const versionList = sortAsc([
          ...new Set([
            ancestorDep.version,
            leftDep.version,
            rightDep.version,
          ]).keys(),
        ]);
        const updatesList = versionList
          .slice(1)
          .map((nextVersion, index): [ProjectDependency, ProjectDependency] => {
            const previousVersion = versionList[index];
            const previousDep = ensure(
              [ancestorDep, leftDep, rightDep].find(
                (dep) => dep.version === previousVersion
              ),
              `Unexpected previous version ${previousVersion}`
            );
            const nextDep = ensure(
              [ancestorDep, leftDep, rightDep].find(
                (dep) => dep.version === nextVersion
              ),
              `Unexpected previous version ${previousVersion}`
            );
            return [previousDep, nextDep];
          });
        if (updatesList.length !== 0) {
          updates.push(updatesList);
        }
      }
    } else {
      // New dep! Check for conflicting versions
      const maybeLeft = leftDeps.get(pkgId);
      const maybeRight = rightDeps.get(pkgId);
      if (maybeLeft && maybeRight && maybeLeft.version !== maybeRight.version) {
        updates.push([
          lt(maybeLeft.version, maybeRight.version)
            ? [maybeLeft, maybeRight]
            : [maybeRight, maybeLeft],
        ]);
      } else {
        const newDep = maybeLeft || maybeRight;
        if (newDep) {
          merged.projectDependencies.push(newDep);
        }
      }
    }
  });

  while (updates.length > 0) {
    // Get the next list of updates
    const nextUpdateRound = updates.map((list) => list[0]);
    updates.forEach((list) => list.splice(0, 1));
    removeWhere(updates, (list) => list.length === 0);

    // Fix merged.projectDependencies so it contains only the `oldVersion`
    removeWhere(
      merged.projectDependencies,
      (dep) =>
        !!nextUpdateRound.find(
          ([oldDep]) =>
            oldDep.pkgId === dep.pkgId && oldDep.version !== dep.version
        )
    );
    nextUpdateRound.forEach(([oldDep]) => {
      if (
        !merged.projectDependencies.find(
          (dep) => oldDep.pkgId === dep.pkgId && oldDep.version === dep.version
        )
      ) {
        merged.projectDependencies.push(oldDep);
      }
    });

    // Upgrade `oldVersion` to `newVersion`
    upgradeProjectDeps(
      merged,
      nextUpdateRound.map(([oldDep, newDep]) => ({ oldDep, newDep }))
    );
  }

  // `upgradeProjectDeps` might create several new instances; bundle the site to
  // make sure they all have `iid`s
  bundler.bundle(merged, bundler.addrOf(merged).uuid, "");
}
