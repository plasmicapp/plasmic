import {
  DbTestArgs,
  getTeamAndWorkspace,
  withDb,
} from "@/wab/server/__testonly__/backend-util";
import { seedTestFeatureTiers } from "@/wab/server/db/seed/feature-tier";
import { Permission, Team } from "@/wab/server/entities/Entities";
import {
  checkFreeTrialDuration,
  maybeTriggerPaywall,
} from "@/wab/server/routes/team-plans";
import { StripeSubscriptionId } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { pluralizeResourceId } from "@/wab/shared/perms";
import { Request } from "express-serve-static-core";
import { mock } from "vitest-mock-extended";

vi.mock("@/wab/server/app-backend-real", () => ({ runAppServer: vi.fn() }));
vi.mock("@/wab/server/secrets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/wab/server/secrets")>()),
  getStripeSecrets: () => undefined,
}));
vi.mock("@/wab/server/analytics/paywall", () => ({
  isUnderMonthlyViewsLimit: vi.fn(async () => ({ valid: true })),
}));

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-01T12:00:00Z").getTime();

function withTrial(
  run: (fixture: Awaited<ReturnType<typeof setupTrial>>) => Promise<void>,
) {
  return withDb(async (...args) => run(await setupTrial(...args)));
}

async function setupTrial(...[sudo, users, dbs, project, em]: DbTestArgs) {
  const { team, workspace } = await getTeamAndWorkspace(dbs[0]());
  const { teamFt } = await seedTestFeatureTiers(em);
  await sudo.sudoUpdateTeam({
    id: team.id,
    featureTierId: teamFt.id,
    seats: 10,
    trialStartDate: new Date(NOW - (DEVFLAGS.freeTrialDays + 1) * DAY),
  });
  await em.update(Team, team.id, { trialDays: null });
  const req = Object.assign(mock<Request>(), {
    txMgr: em,
    user: users[0],
    cookies: {},
    body: {},
    headers: {},
    timingStore: undefined,
    devflags: { ...DEVFLAGS },
    analytics: mock<Request["analytics"]>({ track: vi.fn() }),
  });
  const resources = [
    { type: "team" as const, id: team.id },
    { type: "workspace" as const, id: workspace.id },
    { type: "project" as const, id: project.id },
  ];
  return { sudo, users, dbs, em, team, teamFt, req, resources };
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

describe("downgrade on trial expiration", () => {
  it("persists designer/content as commenter at all scopes, including pending invitations, and clears tier/seats", () =>
    withTrial(async ({ sudo, users, em, team, req, resources }) => {
      for (const resource of resources) {
        for (const role of ["designer", "content"] as const) {
          for (const email of [
            users[role === "designer" ? 1 : 2].email,
            `${role}@pending.test`,
          ]) {
            await sudo.grantResourcesPermissionByEmail(
              pluralizeResourceId(resource),
              email,
              role,
            );
          }
        }
      }
      const before = await em.find(Permission);
      const paid = before.filter((p) =>
        ["designer", "content"].includes(p.accessLevel),
      );
      expect(paid).toHaveLength(12);
      expect(paid.filter((p) => !p.userId)).toHaveLength(6);
      await checkFreeTrialDuration(req, await sudo.getTeamById(team.id));
      const after = await em.find(Permission);
      for (const perm of paid) {
        expect(after.find((p) => p.id === perm.id)).toMatchObject({
          accessLevel: "commenter",
          userId: perm.userId,
          email: perm.email,
        });
      }
      expect(await sudo.getTeamById(team.id)).toMatchObject({
        featureTierId: null,
        seats: null,
      });
    }));

  it("preserves other roles and unrelated teams and remains unchanged on repeated expiration", () =>
    withTrial(async ({ sudo, users, dbs, em, team, req, resources }) => {
      const unrelated = await getTeamAndWorkspace(dbs[1]());
      const { project } = await dbs[1]().createProject({
        name: "Unrelated",
        workspaceId: unrelated.workspace.id,
      });
      const otherResources = [
        { type: "team" as const, id: unrelated.team.id },
        { type: "workspace" as const, id: unrelated.workspace.id },
        { type: "project" as const, id: project.id },
      ];
      for (const resource of [...resources, ...otherResources]) {
        for (const role of [
          "viewer",
          "commenter",
          "editor",
          "designer",
          "content",
        ] as const) {
          await sudo.grantResourcesPermissionByEmail(
            pluralizeResourceId(resource),
            `${role}@pending.test`,
            role,
          );
        }
      }
      const before = await em.find(Permission);
      await checkFreeTrialDuration(req, await sudo.getTeamById(team.id));
      const after = await em.find(Permission);
      for (const perm of before) {
        const isTarget =
          resources.some((r) => perm[`${r.type}Id`] === r.id) &&
          ["designer", "content"].includes(perm.accessLevel);
        expect(after.find((p) => p.id === perm.id)).toEqual(
          isTarget
            ? {
                ...perm,
                accessLevel: "commenter",
                updatedAt: expect.any(Date),
                updatedById: null,
              }
            : perm,
        );
      }
      expect(
        before.some(
          (p) => p.userId === users[0].id && p.accessLevel === "owner",
        ),
      ).toBe(true);
      await checkFreeTrialDuration(req, await sudo.getTeamById(team.id));
      const repeated = await em.find(Permission);
      expect(repeated).toHaveLength(after.length);
      expect(repeated).toEqual(expect.arrayContaining(after));
    }));

  it.each([
    {
      name: "unexpired default trial",
      age: 1,
      trialDays: null,
      subscribed: false,
    },
    {
      name: "exact default expiration boundary",
      age: DEVFLAGS.freeTrialDays,
      trialDays: null,
      subscribed: false,
    },
    {
      name: "unexpired custom duration",
      age: DEVFLAGS.freeTrialDays + 1,
      trialDays: 30,
      subscribed: false,
    },
    {
      name: "exact custom expiration boundary",
      age: 30,
      trialDays: 30,
      subscribed: false,
    },
    {
      name: "no trial start date",
      age: null,
      trialDays: null,
      subscribed: false,
    },
    {
      name: "Stripe subscription",
      age: 100,
      trialDays: null,
      subscribed: true,
    },
  ])(
    "retains permissions and tier for $name",
    ({ age, trialDays, subscribed }) =>
      withTrial(async ({ sudo, em, team, teamFt, req, resources }) => {
        await sudo.sudoUpdateTeam({
          id: team.id,
          trialStartDate: age === null ? null : new Date(NOW - age * DAY),
          stripeSubscriptionId: subscribed
            ? ("sub_local_test" as StripeSubscriptionId)
            : null,
        });
        for (const resource of resources) {
          for (const role of ["designer", "content"] as const) {
            await sudo.grantResourcesPermissionByEmail(
              pluralizeResourceId(resource),
              `${role}@pending.test`,
              role,
            );
          }
        }
        await em.update(Team, team.id, { trialDays });
        const before = await em.find(Permission);
        await checkFreeTrialDuration(req, await sudo.getTeamById(team.id));
        expect(await em.find(Permission)).toEqual(before);
        expect(await sudo.getTeamById(team.id)).toMatchObject({
          featureTierId: teamFt.id,
          seats: 10,
        });
      }),
  );

  it("expires a custom-duration trial just beyond its boundary", () =>
    withTrial(async ({ sudo, em, team, req }) => {
      await sudo.sudoUpdateTeam({
        id: team.id,
        trialStartDate: new Date(NOW - 2 * DAY - 1),
      });
      await em.update(Team, team.id, { trialDays: 2 });
      await sudo.grantTeamPermissionByEmail(
        team.id,
        "designer@pending.test",
        "designer",
      );
      await checkFreeTrialDuration(req, await sudo.getTeamById(team.id));
      expect(await sudo.getTeamById(team.id)).toMatchObject({
        featureTierId: null,
        seats: null,
      });
      expect(await sudo.getPermissionsForTeams([team.id])).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: "designer@pending.test",
            accessLevel: "commenter",
          }),
        ]),
      );
    }));

  it.each(["team", "workspace", "project"] as const)(
    "passes publishing paywall after downgrading roles at %s scope",
    (scope) =>
      withTrial(async ({ sudo, users, em, team, teamFt, req, resources }) => {
        const resource = ensure(
          resources.find((r) => r.type === scope),
          "Missing test resource",
        );
        for (const [index, role] of (
          ["designer", "content"] as const
        ).entries()) {
          await sudo.grantResourcesPermissionByEmail(
            pluralizeResourceId(resource),
            users[index + 1].email,
            role,
          );
        }
        // Bypass sudoUpdateTeam, which would downgrade the roles, to demonstrate
        // the free-tier role paywall with the original permissions.
        await em.update(Team, team.id, { featureTierId: null, seats: null });
        expect(
          await maybeTriggerPaywall(req, resources, {}, "publish", undefined, {
            verifyMonthlyViews: true,
          }),
        ).toMatchObject({ paywall: "requireTeam" });
        await sudo.sudoUpdateTeam({
          id: team.id,
          featureTierId: teamFt.id,
          seats: 10,
        });
        await checkFreeTrialDuration(req, await sudo.getTeamById(team.id));
        expect(
          await maybeTriggerPaywall(req, resources, {}, "publish", undefined, {
            verifyMonthlyViews: true,
          }),
        ).toEqual({ paywall: "pass", response: "publish" });
      }),
  );
});
