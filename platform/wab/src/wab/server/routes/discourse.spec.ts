import { ApiTester } from "@/wab/server/__testonly__/api-tester";
import {
  createBackend,
  createDatabase,
} from "@/wab/server/__testonly__/backend-util";
import {
  DEFAULT_DEV_PASSWORD,
  DbMgr,
  SUPER_USER,
  normalActor,
} from "@/wab/server/db/DbMgr";
import { seedTestFeatureTiers } from "@/wab/server/db/seed/feature-tier";
import {
  expectProvisioning,
  mockDiscourse,
} from "@/wab/server/discourse/__testonly__/fixtures";
import { Team, TeamDiscourseInfo, User } from "@/wab/server/entities/Entities";
import { FEATURE_TIERS } from "@/wab/shared/discourse/config";
import crypto from "crypto";

vi.mock("@/wab/server/secrets", async (original) => ({
  ...(await original<typeof import("@/wab/server/secrets")>()),
  getDiscourseApiKey: () => "test-api-key",
  getDiscourseConnectSecret: () => "test-sso-secret",
}));
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("@/wab/server/emails/Mailer", () => ({
  createMailer: () => ({ sendMail }),
}));

let database: Awaited<ReturnType<typeof createDatabase>>;
let backend: Awaited<ReturnType<typeof createBackend>>;
let api: ApiTester;
let users: User[];
let team: Team;
let http: ReturnType<typeof mockDiscourse>;
const fields = { slug: "acme", name: "Acme", groupId: 101, categoryId: 102 };

beforeAll(async () => {
  database = await createDatabase("discourse_routes");
  await database.con.transaction(async (em) => {
    const sudo = new DbMgr(em, SUPER_USER);
    users = await Promise.all(
      ["admin", "member", "outsider"].map(async (name) => {
        const user = await sudo.createUser({
          email: `${name}@example.com`,
          password: DEFAULT_DEV_PASSWORD,
          firstName: name,
          lastName: "User",
          needsIntroSplash: false,
          needsSurvey: false,
          needsTeamCreationPrompt: false,
        });
        await sudo.markEmailAsVerified(user);
        return user;
      }),
    );
    const owner = new DbMgr(em, normalActor(users[0].id));
    const { teamFt } = await seedTestFeatureTiers(em);
    team = await owner.createTeam("Acme");
    await sudo.sudoUpdateTeam({ id: team.id, featureTierId: teamFt.id });
    await sudo.grantTeamPermissionByEmail(team.id, users[1].email, "content");
    for (const [slug, access] of [
      ["viewer", "viewer"],
      ["unconfigured", "editor"],
      ["unrelated", undefined],
    ] as const) {
      const other = await owner.createTeam(slug);
      await sudo.sudoUpdateTeam({ id: other.id, featureTierId: teamFt.id });
      if (access) {
        await sudo.grantTeamPermissionByEmail(other.id, users[1].email, access);
      }
      if (slug !== "unconfigured") {
        await sudo.upsertDiscourseInfo({
          ...fields,
          teamId: other.id,
          slug,
          name: slug,
        });
      }
    }
    await sudo.upsertDiscourseInfo({ ...fields, teamId: team.id });
  });
  backend = await createBackend(database.dburi, {
    adminEmails: [users[0].email],
  });
  api = new ApiTester(backend.host);
  const { csrf } = await api.req("get", "/api/v1/auth/csrf");
  api.setBaseHeader("X-CSRF-Token", csrf);
});
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
afterAll(async () => {
  await api?.dispose();
  await backend?.cleanup();
  await database?.cleanup();
});

function asUser(index: number) {
  return {
    headers: {
      "x-plasmic-api-user": users[index].email,
      "x-plasmic-api-password": DEFAULT_DEV_PASSWORD,
    },
  };
}
function sign(payload: string) {
  return crypto
    .createHmac("sha256", "test-sso-secret")
    .update(payload)
    .digest("hex");
}
function ssoQuery(payload = "nonce=one-time-value") {
  const sso = Buffer.from(payload).toString("base64");
  return new URLSearchParams({ sso, sig: sign(sso) });
}

it.each([1, 2])(
  "signs identity and only eligible groups for user %s",
  async (index) => {
    const result = await api.req(
      "get",
      `/api/v1/auth/discourse-connect?${ssoQuery()}`,
      undefined,
      asUser(index),
    );
    expect(result.sig).toBe(sign(result.sso));
    const payload = Object.fromEntries(
      new URLSearchParams(Buffer.from(result.sso, "base64").toString()),
    );
    expect(payload).toMatchObject({
      nonce: "one-time-value",
      email: users[index].email,
      external_id: users[index].id,
      name: `${users[index].firstName} User`,
      add_groups: index === 1 ? "acme" : "",
    });
  },
);

it.each(["signature", "nonce", "missing", "array", "anonymous"])(
  "rejects invalid SSO: %s",
  async (kind) => {
    const query = ssoQuery(kind === "nonce" ? "other=value" : undefined);
    if (kind === "signature") {
      query.set("sig", "invalid");
    }
    if (kind === "missing") {
      query.delete("sso");
    }
    if (kind === "array") {
      query.append("sso", "other");
    }
    const response = await api.rawReq(
      "get",
      `/api/v1/auth/discourse-connect?${query}`,
      undefined,
      kind === "anonymous" ? undefined : asUser(1),
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
  },
);

it("allows support access to a member and denies an outsider", async () => {
  http.expect({
    method: "get",
    path: `/u/by-external/${users[1].id}.json`,
    status: 404,
    response: {},
  });
  expect(
    await api.req(
      "post",
      `/api/v1/teams/${team.id}/prepare-support-urls`,
      {},
      asUser(1),
    ),
  ).toMatchObject({ privateSupportUrl: expect.stringContaining("/c/102") });
  expect(
    (
      await api.rawReq(
        "post",
        `/api/v1/teams/${team.id}/prepare-support-urls`,
        {},
        asUser(2),
      )
    ).status(),
  ).toBe(403);
});

it("guards all forum admin endpoints and permits admin reads and email delivery", async () => {
  const base = `/api/v1/admin/teams/${team.id}`;
  for (const [method, path] of [
    ["get", "discourse-info"],
    ["put", "sync-discourse-info"],
    ["post", "send-support-welcome-email"],
  ] as const) {
    expect(
      (
        await api.rawReq(method, `${base}/${path}`, undefined, asUser(1))
      ).status(),
    ).toBe(403);
  }
  expect(sendMail).not.toHaveBeenCalled();
  expect(
    await api.req("get", `${base}/discourse-info`, undefined, asUser(0)),
  ).toMatchObject(fields);
  const result = await api.req(
    "post",
    `${base}/send-support-welcome-email`,
    {},
    asUser(0),
  );
  expect(result.sent.sort()).toEqual([users[0].email, users[1].email].sort());
  expect(result.failed).toEqual([]);
  expect(sendMail).toHaveBeenCalledTimes(2);
});

it("commits successful setup and leaves no configuration after failed setup", async () => {
  await database.con.manager.delete(TeamDiscourseInfo, { teamId: team.id });
  const path = `/api/v1/admin/teams/${team.id}/sync-discourse-info`;
  http.expect({
    method: "post",
    path: "/admin/groups.json",
    body: expect.anything(),
    response: {},
    status: 503,
  });
  expect(
    (await api.rawReq("put", path, fields, asUser(0))).status(),
  ).toBeGreaterThanOrEqual(400);
  const read = () =>
    new DbMgr(database.con.manager, SUPER_USER).getDiscourseInfoByTeamId(
      team.id,
    );
  expect(await read()).toBeUndefined();
  expectProvisioning(http, FEATURE_TIERS.Team.categoryBackgroundColor);
  const result = await api.req("put", path, fields, asUser(0));
  expect(await read()).toMatchObject({
    ...fields,
    id: result.id,
    teamId: team.id,
  });
});
