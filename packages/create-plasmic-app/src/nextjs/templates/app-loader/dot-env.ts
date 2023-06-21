export function makeDotEnv_app_loader(
  projectId: string,
  projectApiToken: string
): string {
  return `PLASMIC_PROJECT_ID=${projectId}
  PLASMIC_API_TOKEN=${projectApiToken}`
};