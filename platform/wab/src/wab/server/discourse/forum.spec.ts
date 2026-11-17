import { withDb } from "@/wab/server/__testonly__/backend-util";
import { ForbiddenError } from "@/wab/server/db/DbMgr";
import {
  expectProvisioning,
  mockDiscourse,
  setupForum,
} from "@/wab/server/discourse/__testonly__/fixtures";
import { prepareTeamSupportUrls } from "@/wab/server/discourse/prepareTeamSupportUrls";
import { sendTeamSupportWelcomeEmail } from "@/wab/server/discourse/sendTeamSupportWelcomeEmail";
import { syncTeamDiscourseInfo } from "@/wab/server/discourse/syncTeamDiscourseInfo";
import { setupEmailTest } from "@/wab/server/emails/__testonly__/email-test-util";
import { FeatureTier, TeamDiscourseInfo } from "@/wab/server/entities/Entities";
import { BASE_URL, FEATURE_TIERS } from "@/wab/shared/discourse/config";

vi.mock("@/wab/server/app-backend-real", () => ({ runAppServer: vi.fn() }));
vi.mock("@/wab/server/secrets", async (original) => ({
  ...(await original<typeof import("@/wab/server/secrets")>()),
  getDiscourseApiKey: () => "test-api-key",
}));

let http: ReturnType<typeof mockDiscourse>;
beforeEach(() => {
  http = mockDiscourse();
});
afterEach(() => {
  try {
    http.done();
  } finally {
    vi.unstubAllGlobals();
  }
});

const publicSupportUrl = `${BASE_URL}/c/5`;
const urls = {
  publicSupportUrl,
  privateSupportUrl: `${BASE_URL}/session/sso?return_path=/c/102`,
};

describe("forum provisioning", () => {
  it.each(Object.entries(FEATURE_TIERS))(
    "creates and updates %s without duplicating configuration or subscriptions",
    async (name, config) => {
      await withDb(async (...args) => {
        const [sudo, , , , em] = args;
        const { fields, teamFt } = await setupForum(...args);
        await em.update(FeatureTier, teamFt.id, { name });
        expectProvisioning(http, config.categoryBackgroundColor);
        const first = await syncTeamDiscourseInfo(
          sudo,
          fields.teamId,
          fields.slug,
          fields.name,
        );
        expect(first).toMatchObject(fields);
        expectProvisioning(http, config.categoryBackgroundColor, true);
        const second = await syncTeamDiscourseInfo(
          sudo,
          fields.teamId,
          fields.slug,
          fields.name,
        );
        expect(second.id).toBe(first.id);
        expect(await em.find(TeamDiscourseInfo)).toHaveLength(1);
        expect(
          await sudo.getDiscourseInfoByTeamId(fields.teamId),
        ).toMatchObject(fields);
      });
    },
  );

  it.each([null, "Free"])(
    "rejects tier %s before external work",
    async (name) => {
      await withDb(async (...args) => {
        const [sudo, , , , em] = args;
        const { fields, teamFt } = await setupForum(...args);
        if (name) {
          await em.update(FeatureTier, teamFt.id, { name });
        } else {
          await sudo.sudoUpdateTeam({ id: fields.teamId, featureTierId: null });
        }
        await expect(
          syncTeamDiscourseInfo(sudo, fields.teamId, "acme", "Acme"),
        ).rejects.toThrow("invalid feature tier");
        expect(
          await sudo.getDiscourseInfoByTeamId(fields.teamId),
        ).toBeUndefined();
      });
    },
  );

  it.each([false, true])(
    "does not save partial provisioning (existing=%s)",
    async (existing) => {
      await withDb(async (...args) => {
        const [sudo] = args;
        const { fields } = await setupForum(...args);
        const before = existing
          ? await sudo.upsertDiscourseInfo({ ...fields, name: "Old name" })
          : undefined;
        expectProvisioning(
          http,
          FEATURE_TIERS.Team.categoryBackgroundColor,
          existing,
          true,
        );
        await expect(
          syncTeamDiscourseInfo(sudo, fields.teamId, "acme", "Acme"),
        ).rejects.toThrow("Couldn't find welcome post");
        expect(await sudo.getDiscourseInfoByTeamId(fields.teamId)).toEqual(
          before,
        );
        http.expect({
          method: existing ? "put" : "post",
          path: existing ? "/groups/101.json" : "/admin/groups.json",
          body: expect.anything(),
          response: { error: "unavailable" },
          status: 503,
        });
        await expect(
          syncTeamDiscourseInfo(sudo, fields.teamId, "acme", "Acme"),
        ).rejects.toMatchObject({ status: 503 });
        expect(await sudo.getDiscourseInfoByTeamId(fields.teamId)).toEqual(
          before,
        );
      });
    },
  );
});

describe("forum access", () => {
  it("returns public support without configuration and denies viewers and outsiders", async () => {
    await withDb(
      async (...args) => {
        const [, users, dbs] = args;
        const { fields } = await setupForum(...args);
        expect(
          await prepareTeamSupportUrls(dbs[1](), users[1], fields.teamId),
        ).toEqual({ publicSupportUrl });
        for (const i of [2, 3]) {
          await expect(
            prepareTeamSupportUrls(dbs[i](), users[i], fields.teamId),
          ).rejects.toBeInstanceOf(ForbiddenError);
        }
      },
      { numUsers: 4 },
    );
  });

  it.each([404, 503])(
    "keeps private URLs on user lookup error %s, even after downgrade",
    async (status) => {
      await withDb(async (...args) => {
        const [sudo, users, dbs] = args;
        const { fields } = await setupForum(...args);
        await sudo.upsertDiscourseInfo(fields);
        await sudo.sudoUpdateTeam({ id: fields.teamId, featureTierId: null });
        http.expect({
          method: "get",
          path: `/u/by-external/${users[0].id}.json`,
          status,
          response: {},
        });
        expect(
          await prepareTeamSupportUrls(dbs[0](), users[0], fields.teamId),
        ).toEqual(urls);
      });
    },
  );

  it.each([
    {
      creator: true,
      member: false,
      owner: false,
      fallback: true,
      write: "owners",
    },
    {
      creator: false,
      member: false,
      owner: false,
      fallback: false,
      write: "members",
    },
    {
      creator: false,
      member: true,
      owner: false,
      fallback: false,
      write: undefined,
    },
    {
      creator: true,
      member: true,
      owner: true,
      fallback: false,
      write: undefined,
    },
  ])(
    "grants only missing access: %j",
    async ({ creator, member, owner, fallback, write }) => {
      await withDb(async (...args) => {
        const [sudo, users, dbs] = args;
        const { fields } = await setupForum(...args);
        await sudo.upsertDiscourseInfo(fields);
        const i = creator ? 0 : 1;
        http.expect(
          {
            method: "get",
            path: `/u/by-external/${users[i].id}.json`,
            response: { user: { username: "forum-user" } },
          },
          {
            method: "get",
            path: "/groups/acme.json",
            username: "forum-user",
            status: fallback ? 404 : 200,
            response: {
              group: { id: 101, is_group_user: member, is_group_owner: owner },
            },
          },
        );
        if (fallback) {
          http.expect({
            method: "get",
            path: "/groups/acme.json",
            response: { group: { id: 101 } },
          });
        }
        if (write) {
          http.expect({
            method: "put",
            path: `/groups/101/${write}.json`,
            body: { usernames: "forum-user" },
            response: {},
          });
        }
        expect(
          await prepareTeamSupportUrls(dbs[i](), users[i], fields.teamId),
        ).toEqual(urls);
      });
    },
  );

  it("propagates non-404 group failures", async () => {
    await withDb(async (...args) => {
      const [sudo, users, dbs] = args;
      const { fields } = await setupForum(...args);
      await sudo.upsertDiscourseInfo(fields);
      http.expect(
        {
          method: "get",
          path: `/u/by-external/${users[1].id}.json`,
          response: { user: { username: "forum-user" } },
        },
        {
          method: "get",
          path: "/groups/acme.json",
          username: "forum-user",
          status: 503,
          response: {},
        },
      );
      await expect(
        prepareTeamSupportUrls(dbs[1](), users[1], fields.teamId),
      ).rejects.toMatchObject({ status: 503 });
    });
  });
});

it("emails eligible users, skips viewers and invitations, and continues after a delivery failure", async () => {
  await withDb(async (...args) => {
    const [sudo, users, , , em] = args;
    const { fields } = await setupForum(...args);
    await sudo.grantTeamPermissionByEmail(
      fields.teamId,
      "pending@example.com",
      "content",
    );
    const { req, mailer } = setupEmailTest();
    req.txMgr = em;
    mailer.sendMail
      .mockRejectedValueOnce(new Error("Delivery failed"))
      .mockResolvedValue(undefined);
    const result = await sendTeamSupportWelcomeEmail(req, fields.teamId);
    const recipients = mailer.sendMail.mock.calls.map(([mail]) => mail.to);
    expect(result).toEqual({
      failed: recipients.slice(0, 1),
      sent: recipients.slice(1),
    });
    expect(mailer.sendMail.mock.calls.map(([mail]) => mail.to).sort()).toEqual(
      [users[0].email, users[1].email].sort(),
    );
  });
});
