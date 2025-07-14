import { APIRequestContext } from "playwright/test";

const BASE_URL = process.env.PLASMIC_BASE_URL || "http://localhost:3003";

export async function importProjectFromTemplate(
  request: APIRequestContext,
  bundle: any
) {
  const csrfRes = await request.get(`${BASE_URL}/api/v1/auth/csrf`);
  const csrf = (await csrfRes.json()).csrf;

  const res = await request.post(`${BASE_URL}/api/v1/projects/import`, {
    data: {
      data: JSON.stringify(bundle),
      keepProjectIdsAndNames: false,
      migrationsStrict: true,
    },
    headers: { "X-CSRF-Token": csrf },
  });
  const body = await res.json();
  return body.projectId;
}
