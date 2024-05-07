import { getGithubApp } from "@/wab/server/github/app";
import { GitSyncOptions } from "@/wab/shared/ApiSchema";

export async function detectSyncOptions(
  installationId: number,
  owner: string,
  repo: string,
  branch: string,
  dir: string
): Promise<Partial<GitSyncOptions>> {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);

  const getFileContent = async (path: string) =>
    await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      ref: branch,
      path: `${dir}/${path}`,
    });

  // This will make the function throws an exception if no package.json,
  // it's not a file or it can't be parsed.
  const { data: packageJson } = await getFileContent("package.json");
  const encodedContent = packageJson["content"] as string;
  const packageJsonContent = JSON.parse(
    Buffer.from(encodedContent, "base64").toString("ascii")
  );

  const fileExists = async (path: string) => {
    try {
      await getFileContent(path);
      return true;
    } catch (err) {
      if (err.status === 404) {
        return false;
      }
      throw err;
    }
  };

  const detectTypeScript = async () => {
    return await fileExists("tsconfig.json");
  };

  const detectGatsby = async () => {
    return await fileExists("gatsby-config.js");
  };

  const detectNextJs = async () => {
    return (
      packageJsonContent.scripts?.build === "next build" ||
      (typeof packageJsonContent.dependencies === "object" &&
        "next" in packageJsonContent.dependencies)
    );
  };

  return {
    language: (await detectTypeScript()) ? "ts" : "js",
    platform: (await detectGatsby())
      ? "gatsby"
      : (await detectNextJs())
      ? "nextjs"
      : "react",
  };
}
