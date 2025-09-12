// This script is used to remove CSS imports from the email templates for 2 reasons:
//
// 1. Emails do not need external CSS files, so we remove them using the script below
// 2. The esbuild-register plugin used to bootstrap our server complains when it encounters any .css files
//
// This script is run automatically when we run `npm run email:sync`
import { logger } from "@/wab/server/observability";

logger().info("Removing all CSS imports from email templates...");

import { promises as fs } from "fs";
import * as path from "path";

// This is the path to the folder containing the email templates
const folderPath = path.join(__dirname, "../templates");

async function processFile(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, "utf-8");

  // This regex filters out any lines that import a CSS file
  const updatedContent = content
    .split("\n")
    .filter((line) => !/import\s+['"].+\.css['"];?/.test(line))
    .join("\n");

  if (updatedContent !== content) {
    await fs.writeFile(filePath, updatedContent, "utf-8");
    logger().info(`Updated: ${filePath}`);
  }
}

async function processFolder(folder: string): Promise<void> {
  const entries = await fs.readdir(folder, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      await processFolder(fullPath);
    } else if (entry.isFile() && fullPath.endsWith(".tsx")) {
      await processFile(fullPath);
    }
  }
}

processFolder(folderPath)
  .then(() => logger().info("Done removing CSS imports from email templates!"))
  .catch((e) => logger().error("Error while processing folder", e));
