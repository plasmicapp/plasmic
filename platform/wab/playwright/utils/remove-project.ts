import { APIRequestContext } from "playwright/test";
import { login } from "./login";

export async function removeProject(
  request: APIRequestContext,
  baseUrl: string,
  projectId: string,
  email: string,
  password: string
) {
  const csrfRes = await request.get(`${baseUrl}/api/v1/auth/csrf`);
  const csrf = (await csrfRes.json()).csrf;

  await login(request, baseUrl, email, password);

  await request.delete(`${baseUrl}/api/v1/projects/${projectId}`, {
    headers: { "X-CSRF-Token": csrf },
  });
}
