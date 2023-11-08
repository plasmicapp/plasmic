const fs = require("fs");
const path = require("path");
const exec = require("child_process").execSync;

const plasmicLock = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "plasmic.lock")).toString()
);
const plasmicJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "plasmic.json")).toString()
);

const projectVersions = {};
for (const proj of plasmicLock.projects) {
  if (proj.projectId in projectVersions) {
    console.warn(`Duplicate lock entries for project ${proj.projectId}`);
  }
  projectVersions[proj.projectId] = proj.version;
}

const git =
  process.env["COMMIT_HASH"] ?? exec("git rev-parse HEAD").toString().trim();
const meta = {
  git,
  projects: plasmicJson.projects.map((proj) => ({
    id: proj.projectId,
    version: projectVersions[proj.projectId],
    name: proj.projectName,
  })),
};

console.log(JSON.stringify(meta));
