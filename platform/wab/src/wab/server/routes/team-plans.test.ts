import {
  DbTestArgs,
  getTeamAndWorkspace,
  withDb,
} from "@/wab/server/__testonly__/backend-util";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { InternalDbMgr } from "@/wab/server/db/internal/InternalDbMgr";
import { seedTestFeatureTiers } from "@/wab/server/db/seed/feature-tier";
import { SubscriptionStatusRecord } from "@/wab/server/entities/CustomEntities";
import { Permission, Team } from "@/wab/server/entities/Entities";
import {
  cancelSubscription,
  updatePaymentMethod,
} from "@/wab/server/routes/internal/payment";
import {
  checkFreeTrialDuration,
  maybeTriggerPaywall,
  stripe,
  syncTeamSubscription,
} from "@/wab/server/routes/team-plans";
import { mkApiTeams } from "@/wab/server/routes/teams";
import { isPaidTeam } from "@/wab/server/subscription-status";
import {
  StripeCustomerId,
  StripeSubscriptionId,
  TeamId,
} from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { pluralizeResourceId } from "@/wab/shared/perms";
import { Request, Response } from "express-serve-static-core";
import Stripe from "stripe";
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
                // eslint-disable-next-line @typescript-eslint/no-misused-spread -- toEqual ignores the prototype
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

function stripeSub(
  status: Stripe.Subscription.Status,
  {
    id = "sub_test",
    paymentMethod = "pm_test" as string | null,
    created = (NOW - DAY) / 1000,
  } = {},
) {
  return {
    id,
    status,
    default_payment_method: paymentMethod,
    created,
  } as Stripe.Subscription;
}

describe("syncTeamSubscription", () => {
  async function subscribe(fixture: Awaited<ReturnType<typeof setupTrial>>) {
    const { sudo, team, teamFt } = fixture;
    await sudo.sudoUpdateTeam({
      id: team.id,
      featureTierId: teamFt.id,
      seats: 10,
      stripeSubscriptionId: "sub_test" as StripeSubscriptionId,
      stripeCustomerId: "cus_test" as StripeCustomerId,
      trialStartDate: null,
    });
    return { superMgr: sudo, devflags: DEVFLAGS };
  }

  async function latestRecord(sudo: DbMgr, teamId: TeamId) {
    return (
      await InternalDbMgr.fromDbMgr(sudo).getLatestSubscriptionStatuses([
        teamId,
      ])
    ).get(teamId);
  }

  it("loads latest statuses for more than 65,535 team IDs", () =>
    withTrial(async ({ sudo, team, dbs }) => {
      const mgr = InternalDbMgr.fromDbMgr(sudo);
      const { team: otherTeam } = await getTeamAndWorkspace(dbs[1]());
      await mgr.lockSubscriptionTeam(team.id);
      await mgr.recordSubscriptionStatus(team.id, null, "trial");
      await mgr.recordSubscriptionStatus(team.id, null, "free");
      await mgr.lockSubscriptionTeam(otherTeam.id);
      await mgr.recordSubscriptionStatus(otherTeam.id, null, "manual");

      const teamIds = Array.from(
        { length: 70_000 },
        (_, i) => `missing-team-${i}` as TeamId,
      );
      teamIds[0] = team.id;
      teamIds[teamIds.length - 1] = otherTeam.id;
      const statuses = await mgr.getLatestSubscriptionStatuses(teamIds);
      expect(statuses.size).toBe(2);
      expect(statuses.get(team.id)?.status).toBe("free");
      expect(statuses.get(otherTeam.id)?.status).toBe("manual");
      expect(await mgr.getLatestSubscriptionStatuses([])).toEqual(new Map());
    }));

  it("keeps valid subscriptions and resets invalid ones", () =>
    withTrial(async (fixture) => {
      const { team, sudo, em } = fixture;
      const list = vi
        .spyOn(stripe.subscriptions, "list")
        .mockResolvedValue({ data: [], has_more: false } as any);
      vi.spyOn(stripe.paymentMethods, "list").mockResolvedValue({
        data: [],
        has_more: false,
      } as any);
      for (const [status, expected] of [
        ["active", "paid"],
        ["past_due", "past_due"],
        ["canceled", "free"],
      ]) {
        const ctx = await subscribe(fixture);
        expect(
          await syncTeamSubscription(ctx, team.id, stripeSub(status)),
        ).toBe(expected);
        expect((await latestRecord(sudo, team.id))?.status).toBe(expected);
        expect((await sudo.getTeamById(team.id)).featureTierId !== null).toBe(
          expected !== "free",
        );
      }
      expect(list).toHaveBeenCalled();
      expect(await em.count(SubscriptionStatusRecord)).toBeGreaterThan(1);
    }));

  it.each(["incomplete", "trialing"] as const)(
    "keeps %s checkout pending without granting paid access",
    (status) =>
      withTrial(async (fixture) => {
        const ctx = await subscribe(fixture);
        const cancel = vi.spyOn(stripe.subscriptions, "cancel");
        expect(
          await syncTeamSubscription(
            ctx,
            fixture.team.id,
            stripeSub(status, { paymentMethod: null, created: NOW / 1000 }),
          ),
        ).toBe("free");
        expect(
          (await fixture.sudo.getTeamById(fixture.team.id))
            .stripeSubscriptionId,
        ).toBe("sub_test");
        expect(cancel).not.toHaveBeenCalled();
        const mgr = fixture.dbs[0]();
        const { workspace } = await getTeamAndWorkspace(mgr);
        const { project } = await mgr.createProject({
          name: "Draft to transfer",
        });
        const transfer = () =>
          mgr.updateProject({ id: project.id, workspaceId: workspace.id });
        await expect(mgr.checkCanCreateTeam()).rejects.toThrow("one unpaid");
        await expect(transfer()).rejects.toThrow(
          "only be transferred to a paid",
        );
        const child = Object.assign(new Team(), {
          featureTierId: null,
          parentTeam: await mgr.getTeamById(fixture.team.id),
        });
        expect(await isPaidTeam(child, mgr)).toBe(false);
        const publish = () =>
          maybeTriggerPaywall(fixture.req, fixture.resources, {}, "publish", {
            fn: (f) => f.id === fixture.teamFt.id,
            description: "splitContentAccess",
          });
        expect(await publish()).toMatchObject({ paywall: "upsell" });
        expect(
          await syncTeamSubscription(ctx, fixture.team.id, stripeSub("active")),
        ).toBe("paid");
        expect(await publish()).toEqual({
          paywall: "pass",
          response: "publish",
        });
        await expect(mgr.checkCanCreateTeam()).resolves.toBeUndefined();
        await expect(transfer()).resolves.toBeDefined();
        expect(await isPaidTeam(child, mgr)).toBe(true);
      }),
  );

  it("applies the free seat limit during pending checkout", () =>
    withTrial(async (fixture) => {
      const ctx = await subscribe(fixture);
      const { sudo, team, req } = fixture;
      for (const i of [1, 2, 3, 4]) {
        await sudo.grantResourcesPermissionByEmail(
          pluralizeResourceId({ type: "team", id: team.id }),
          `editor${i}@seats.test`,
          "editor",
        );
      }
      const invite = () =>
        maybeTriggerPaywall(req, [{ type: "team", id: team.id }], {}, "invite");
      await syncTeamSubscription(
        ctx,
        team.id,
        stripeSub("incomplete", { paymentMethod: null, created: NOW / 1000 }),
      );
      expect(await invite()).toMatchObject({
        paywall: "upsell",
        description: "moreSeats",
      });
      await syncTeamSubscription(ctx, team.id, stripeSub("active"));
      expect(await invite()).toEqual({ paywall: "pass", response: "invite" });
    }));

  it("records confirmed checkout and sets the subscription payment method", () =>
    withTrial(async (fixture) => {
      const ctx = await subscribe(fixture);
      await syncTeamSubscription(
        ctx,
        fixture.team.id,
        stripeSub("trialing", { paymentMethod: null, created: NOW / 1000 }),
      );
      fixture.req.params = { teamId: fixture.team.id };
      fixture.req.body = { paymentMethodId: "pm_confirmed" };
      vi.spyOn(stripe.customers, "update").mockResolvedValue({} as any);
      vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
        stripeSub("trialing", {
          paymentMethod: null,
          created: NOW / 1000,
        }) as any,
      );
      const update = vi
        .spyOn(stripe.subscriptions, "update")
        .mockResolvedValue(
          stripeSub("trialing", { paymentMethod: "pm_confirmed" }) as any,
        );
      await updatePaymentMethod(fixture.req, mock<Response>());
      expect(update).toHaveBeenCalledWith("sub_test", {
        default_payment_method: "pm_confirmed",
      });
      const [apiTeam] = await mkApiTeams(fixture.sudo, [
        await fixture.sudo.getTeamById(fixture.team.id),
      ]);
      expect(apiTeam).toMatchObject({
        subscriptionStatus: "paid",
        onTrial: false,
      });
    }));

  it("resets an ended subscription instead of updating its card", () =>
    withTrial(async (fixture) => {
      await subscribe(fixture);
      fixture.req.params = { teamId: fixture.team.id };
      fixture.req.body = { paymentMethodId: "pm_new" };
      vi.spyOn(stripe.customers, "update").mockResolvedValue({} as any);
      vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
        stripeSub("canceled") as any,
      );
      for (const list of [stripe.subscriptions, stripe.paymentMethods]) {
        vi.spyOn(list, "list").mockResolvedValue({
          data: [],
          has_more: false,
        } as any);
      }
      const update = vi.spyOn(stripe.subscriptions, "update");
      await updatePaymentMethod(fixture.req, mock<Response>());
      expect(update).not.toHaveBeenCalled();
      expect((await latestRecord(fixture.sudo, fixture.team.id))?.status).toBe(
        "free",
      );
    }));

  it("keeps a manual plan when its team cancels", () =>
    withTrial(async (fixture) => {
      const { sudo, team, teamFt, req } = fixture;
      await sudo.sudoUpdateTeam({ id: team.id, trialStartDate: null });
      req.params = { teamId: team.id };
      req.query = {};
      req.mailer = mock<Request["mailer"]>();
      req.config = mock<Request["config"]>();
      const cancel = vi.spyOn(stripe.subscriptions, "cancel");
      await cancelSubscription(req, mock<Response>());
      expect(cancel).not.toHaveBeenCalled();
      expect(await sudo.getTeamById(team.id)).toMatchObject({
        featureTierId: teamFt.id,
        seats: 10,
      });
      expect((await latestRecord(sudo, team.id))?.status).toBe("manual");
      const [apiTeam] = await mkApiTeams(sudo, [
        await sudo.getTeamById(team.id),
      ]);
      expect(apiTeam).toMatchObject({
        subscriptionStatus: "manual",
        onTrial: false,
      });
    }));

  it.each([
    ["active", "paid"],
    ["past_due", "past_due"],
  ])(
    "switches to a valid %s replacement subscription and records its ID",
    (status, expected) =>
      withTrial(async (fixture) => {
        const ctx = await subscribe(fixture);
        vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
          stripeSub("canceled") as any,
        );
        vi.spyOn(stripe.subscriptions, "list").mockResolvedValue({
          data: [
            stripeSub("trialing", { id: "sub_no_card", paymentMethod: null }),
            stripeSub(status, { id: "sub_replacement" }),
          ],
        } as any);
        expect(await syncTeamSubscription(ctx, fixture.team.id, null)).toBe(
          expected,
        );
        expect(
          (await latestRecord(fixture.sudo, fixture.team.id))
            ?.stripeSubscriptionId,
        ).toBe("sub_replacement");
      }),
  );

  it("fetches the team's subscription when the known one is no longer the team's", () =>
    withTrial(async (fixture) => {
      const ctx = await subscribe(fixture);
      const retrieve = vi
        .spyOn(stripe.subscriptions, "retrieve")
        .mockResolvedValue(stripeSub("past_due") as any);
      expect(
        await syncTeamSubscription(
          ctx,
          fixture.team.id,
          stripeSub("active", { id: "sub_old" }),
        ),
      ).toBe("past_due");
      expect(retrieve).toHaveBeenCalledWith("sub_test");
    }));

  it("records own-trial expiry and returns the updated team to paywall callers", () =>
    withTrial(async ({ sudo, req, team }) => {
      const loaded = await sudo.getTeamById(team.id);
      await checkFreeTrialDuration(req, loaded);
      expect(loaded.featureTierId).toBeNull();
      expect((await latestRecord(sudo, team.id))?.status).toBe("free");
      const [apiTeam] = await mkApiTeams(sudo, [loaded]);
      expect(apiTeam).toMatchObject({
        subscriptionStatus: "free",
        onTrial: false,
        featureTier: null,
      });
    }));

  it("does not write while the trial tier is current", () =>
    withTrial(async ({ sudo, req, team, em }) => {
      await sudo.sudoUpdateTeam({ id: team.id, trialStartDate: new Date(NOW) });
      await checkFreeTrialDuration(req, await sudo.getTeamById(team.id));
      expect(await em.count(SubscriptionStatusRecord)).toBe(0);
    }));

  it("appends only on status/subscription changes and batch-loads parent status", () =>
    withTrial(async (fixture) => {
      const ctx = await subscribe(fixture);
      const { team, sudo, em } = fixture;
      await syncTeamSubscription(ctx, team.id, stripeSub("active"));
      const first = await latestRecord(sudo, team.id);
      await syncTeamSubscription(ctx, team.id, stripeSub("active"));
      const second = await latestRecord(sudo, team.id);
      expect(second?.id).toBe(first?.id);
      expect(second?.updatedAt.getTime()).toBeGreaterThan(
        first?.updatedAt.getTime() ?? 0,
      );
      await syncTeamSubscription(ctx, team.id, stripeSub("past_due"));
      await sudo.sudoUpdateTeam({
        id: team.id,
        stripeSubscriptionId: "sub_new" as StripeSubscriptionId,
      });
      // A record for the previous subscription is stale until the new one syncs.
      const [unsynced] = await mkApiTeams(sudo, [
        await sudo.getTeamById(team.id),
      ]);
      expect(unsynced.subscriptionStatus).toBe("paid");
      await syncTeamSubscription(
        ctx,
        team.id,
        stripeSub("past_due", { id: "sub_new" }),
      );
      expect(await em.count(SubscriptionStatusRecord)).toBe(3);
      const parent = await sudo.getTeamById(team.id);
      const child = Object.assign(new Team(), {
        id: "child",
        featureTierId: null,
        parentTeam: parent,
      });
      const [childApi, parentApi] = await mkApiTeams(sudo, [child, parent]);
      expect(childApi.subscriptionStatus).toBe("past_due");
      expect(parentApi.subscriptionStatus).toBe("past_due");
      expect(childApi.featureTier).toEqual(parentApi.featureTier);
    }));
});
