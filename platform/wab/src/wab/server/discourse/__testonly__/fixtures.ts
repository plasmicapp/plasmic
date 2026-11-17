import {
  DbTestArgs,
  getTeamAndWorkspace,
} from "@/wab/server/__testonly__/backend-util";
import { seedTestFeatureTiers } from "@/wab/server/db/seed/feature-tier";
import {
  BASE_URL,
  PRIVATE_SUPPORT_CATEGORY_ID,
  SYSTEM_USERNAME,
} from "@/wab/shared/discourse/config";

// Ordered expectations also verify that parent permissions precede child creation.
export function mockDiscourse() {
  const requests: {
    method: string;
    path: string;
    response: unknown;
    body?: unknown;
    username?: string;
    status?: number;
  }[] = [];
  const unexpected: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const next = requests.shift();
      if (!next) {
        unexpected.push(`${init.method} ${url}`);
        throw new Error(`Unexpected Discourse request: ${init.method} ${url}`);
      }
      try {
        expect(url).toBe(`${BASE_URL}${next.path}`);
        expect(init.method).toBe(next.method);
        expect(init.headers).toEqual({
          "Api-Key": "test-api-key",
          "Api-Username": next.username ?? SYSTEM_USERNAME,
          "Content-Type": "application/json",
        });
        expect(
          init.body === undefined ? undefined : JSON.parse(String(init.body)),
        ).toEqual(next.body);
      } catch (error) {
        unexpected.push(String(error));
        throw error;
      }
      return new Response(JSON.stringify(next.response), {
        status: next.status ?? 200,
      });
    }),
  );
  return {
    expect: (...expected: typeof requests) => requests.push(...expected),
    done: () => {
      expect(unexpected).toEqual([]);
      expect(requests).toEqual([]);
    },
  };
}

export async function setupForum(...[sudo, users, dbs, , em]: DbTestArgs) {
  const { team } = await getTeamAndWorkspace(dbs[0]());
  const { teamFt } = await seedTestFeatureTiers(em);
  await sudo.sudoUpdateTeam({ id: team.id, featureTierId: teamFt.id });
  await sudo.grantTeamPermissionByEmail(team.id, users[1].email, "content");
  await sudo.grantTeamPermissionByEmail(team.id, users[2].email, "viewer");
  const fields = {
    teamId: team.id,
    slug: "acme",
    name: "Acme",
    groupId: 101,
    categoryId: 102,
  };
  return { team, fields, teamFt };
}

// Only assert meaningful fields in large payloads; avoid copying the welcome text/template.
export function expectProvisioning(
  http: ReturnType<typeof mockDiscourse>,
  color: string,
  existing = false,
  missingPost = false,
) {
  const parent = {
    slug: "support",
    group_permissions: [{ group_name: "other-org", permission_type: 3 }],
  };
  const category = { id: 102, topic_url: "/t/welcome/201" };
  http.expect(
    {
      method: existing ? "put" : "post",
      path: existing ? "/groups/101.json" : "/admin/groups.json",
      body: {
        group: expect.objectContaining({
          name: "acme",
          full_name: "Acme",
          visibility_level: 2,
          members_visibility_level: 2,
        }),
      },
      response: { basic_group: { id: 101 } },
    },
    {
      method: "get",
      path: `/c/${PRIVATE_SUPPORT_CATEGORY_ID}/show.json`,
      response: { category: parent },
    },
    {
      method: "put",
      path: `/categories/${PRIVATE_SUPPORT_CATEGORY_ID}.json`,
      body: { permissions: { "other-org": 3, support: 1, acme: 3 } },
      response: { category: parent },
    },
    {
      method: existing ? "put" : "post",
      path: existing ? "/categories/102.json" : "/categories.json",
      body: expect.objectContaining({
        slug: "acme",
        name: "Acme",
        color,
        parent_category_id: PRIVATE_SUPPORT_CATEGORY_ID,
        permissions: { support: 1, acme: 1 },
      }),
      response: { category },
    },
    {
      method: "get",
      path: "/t/-/201.json",
      response: {
        post_stream: {
          posts: missingPost ? [] : [{ id: 301, post_number: 1 }],
        },
      },
    },
  );
  if (missingPost) {
    return;
  }
  http.expect(
    {
      method: "put",
      path: "/t/-/201.json",
      body: { title: expect.stringContaining("Welcome") },
      response: {},
    },
    {
      method: "put",
      path: "/posts/301.json",
      body: { post: { raw: expect.stringContaining("/g/acme") } },
      response: { post: { id: 301, version: 4 } },
    },
    { method: "put", path: "/posts/301/revisions/4/hide", response: {} },
    {
      method: "get",
      path: "/groups/support.json",
      response: {
        group: { id: 401, watching_category_ids: existing ? [99, 102] : [99] },
      },
    },
  );
  if (!existing) {
    http.expect({
      method: "put",
      path: "/groups/401.json",
      body: {
        group: { watching_category_ids: [102, 99] },
        update_existing_users: "true",
      },
      response: {},
    });
  }
}
