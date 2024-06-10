const gitignoreToDockerignore = require("gitignore-to-dockerignore");
const { allAncestorDirectories } = require("ancestor-directories");
const fs = require("fs");

const ADDITIONAL_CONTENT = `
!**/.gitkeep

# Auto-generated
**/.git/

# wab/create-react-app:
create-react-app/
create-react-app-new/

**/.delivery/

# Static assets from Jenkins:
static-*.tgz
`;

// Need plasmic-deployed.json, as it needs to be generated
// outside of docker (needs access to git).
// Also need loader-hydrate.*, as it was generated from yarn build
const REMOVED_CONTENT = `
src/wab/client/plasmic-deployed.json
public/static/js/loader-hydrate.*
`;

function toLines(str) {
  return str
    .trim()
    .split("\n")
    .map((x) => x.trim());
}

/**
 * Quick and sloppy combining of gitignore from parent dirs.
 * If parent has an absolute path like /foo, this will just grab that as-is, so it could be ignoring things that should
 * not be ignored. But should be rare....
 */
function main() {
  const generated = gitignoreToDockerignore(
    [...allAncestorDirectories(process.cwd())]
      .map((dir) => {
        const path = `${dir}/.gitignore`;
        return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
      })
      .join("\n")
  );

  const removedLines = toLines(REMOVED_CONTENT);
  const final = [
    ...toLines(ADDITIONAL_CONTENT),
    "\n# Generated",
    ...toLines(generated).filter((x) => !removedLines.includes(x)),
  ].join("\n");

  process.stdout.write(final);
}

main();
