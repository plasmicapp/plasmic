import { APIRequestContext } from "playwright/test";

export async function login(
  request: APIRequestContext,
  baseUrl: string,
  email: string,
  password: string
) {
  const csrfRes = await request.get(`${baseUrl}/api/v1/auth/csrf`);
  const csrf = (await csrfRes.json()).csrf;

  await request.post(`${baseUrl}/api/v1/auth/login`, {
    data: { email, password },
    headers: { "X-CSRF-Token": csrf },
  });
}
