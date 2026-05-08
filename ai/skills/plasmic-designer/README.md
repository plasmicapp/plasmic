# Getting Started with Plasmic AI

This guide walks you through everything you need to control your Plasmic project from an AI assistant (Claude Code, Claude Desktop, Codex, Cursor, etc.). Once set up, you can say things like _"add a hero section to the Homepage"_ and watch the AI read your project, design a section, and insert it into the canvas.

The skill works by connecting your AI assistant to Chrome via the official [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) MCP server. See the [Chrome DevTools MCP blog post](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session) for background on what that is.

**What you'll do in this guide:**

1. Check prerequisites
2. Install the `chrome-devtools-mcp` server into your AI tool
3. Install the `plasmic-designer` skill into your AI tool
4. Run your first command end-to-end

Each section ends with a **Verify** callout — a quick test you can run to confirm the step worked before moving on.

---

## 1. Prerequisites

Before you start, confirm you have the following:

- **Node.js 20.19 LTS or newer.** Check with:

  ```sh
  node --version
  ```

  If the version is older than `v20.19`, install the latest LTS from [nodejs.org](https://nodejs.org/) or via [nvm](https://github.com/nvm-sh/nvm).

- **Google Chrome** (current stable, or Chrome for Testing).

- **A Plasmic account** and a project open at [studio.plasmic.app](https://studio.plasmic.app). You'll need your **Project ID** — it's the string after `/projects/` in your Plasmic URL. For example, in `https://studio.plasmic.app/projects/j2Bm3mrbGNKsXVW3Wf5KpP` the project ID is `j2Bm3mrbGNKsXVW3Wf5KpP`.

- **An AI assistant that supports MCP.** This guide covers:
  - **CLIs**: Claude Code, Codex, Cursor, Opencode
  - **GUI**: Claude Desktop

---

## 2. Install `chrome-devtools-mcp`

Pick **one** of the two tracks below, matching the tool you use.

### 2A. For Agentic CLIs (Claude Code, Codex, Cursor, Opencode)

If you're already comfortable with MCP configuration, this is a one-liner.

**Claude Code**:

```sh
claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest --no-usage-statistics
```

Alternatively, add the following to your project's `.claude/.mcp.json` or your user-global `~/.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest", "--no-usage-statistics"]
    }
  }
}
```

**Cursor**: uses the same `mcpServers` JSON shape. Paste the snippet above into your Cursor MCP config (see [Cursor's MCP docs](https://cursor.com/docs/mcp)).

**Codex**: uses TOML, not JSON. Add the following to `~/.codex/config.toml` (see [Codex MCP docs](https://developers.openai.com/codex/mcp)):

```toml
[mcp_servers.chrome-devtools]
command = "npx"
args = ["chrome-devtools-mcp@latest", "--no-usage-statistics"]
```

**OpenCode**: uses a top-level `mcp` block in `opencode.json` (see [OpenCode MCP docs](https://opencode.ai/docs/mcp-servers/)):

```json
{
  "mcp": {
    "chrome-devtools": {
      "type": "local",
      "command": ["npx", "chrome-devtools-mcp@latest", "--no-usage-statistics"],
      "enabled": true
    }
  }
}
```

> **Verify.** In your CLI, run `/mcp` (Claude Code) or ask _"list the MCP tools that are available"_. You should see tools beginning with `mcp__chrome-devtools__*` (e.g. `mcp__chrome-devtools__navigate_page`, `mcp__chrome-devtools__evaluate_script`).

Skip ahead to [Section 3](#3-install-the-plasmic-designer-skill).

### 2B. For Claude Desktop

Claude Desktop requires a bit more care because it runs MCP servers as subprocesses that don't inherit your shell's `PATH`. Follow these steps in order.

#### Step 1 — Locate the config file

On macOS, the config lives at `~/Library/Application Support/Claude/claude_desktop_config.json`. The fastest way to open it:

```sh
open -a TextEdit "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
```

If the file doesn't exist yet, create it with an empty object `{}` inside.

#### Step 2 — Find your absolute `npx` path

Claude Desktop can't use a bare `"npx"` in the config — it needs the full path to the binary because MCP subprocesses don't inherit your shell's `PATH`. In Terminal:

```sh
which npx
```

Example outputs, depending on how you installed Node:

```
/Users/you/.asdf/installs/nodejs/22.18.0/bin/npx
/Users/you/.nvm/versions/node/v22.11.0/bin/npx
/opt/homebrew/bin/npx
```

Keep that path handy — you'll paste it into the config in Step 3, and use the directory it's in for `env.PATH`.

#### Step 3 — Paste the MCP configuration

Open `claude_desktop_config.json` and replace its contents with (using _your_ `npx` path from Step 2):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "/Users/you/.asdf/installs/nodejs/22.18.0/bin/npx",
      "args": ["chrome-devtools-mcp@latest", "--no-usage-statistics"],
      "env": {
        "PATH": "/Users/you/.asdf/installs/nodejs/22.18.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

What each part does:

- `command` — absolute path to the `npx` binary. Required because Claude Desktop doesn't search your shell `$PATH`.
- `args[0]` — the package to run (`chrome-devtools-mcp@latest`).
- `--no-usage-statistics` — opts out of anonymous usage reporting.
- `env.PATH` — prepended with the node/npx directory, followed by typical system paths, so the MCP subprocess can find Chrome, git, and other system binaries it may need. Adjust the leading directory to match _your_ `npx` install path.

Save the file.

#### Step 4 — Fully restart Claude Desktop

Quit Claude Desktop from the menu bar (**Claude → Quit Claude**). Closing the window isn't enough. Then open it again.

> **Verify.** In Claude Desktop, open **Settings → Developer → Local MCP servers**. You should see a `chrome-devtools` entry with a blue **running** badge next to its name. The panel also shows the resolved `Command` and `Arguments` — confirm they match what you pasted. If the badge shows an error instead of **running**, click **View Logs** (or see the troubleshooting notes below).

#### Claude Desktop troubleshooting

| Symptom                                    | Fix                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `spawn npx ENOENT`                         | The `command` path is wrong. Re-run `which npx` and paste the exact output into `command`.                        |
| `Cannot find module 'chrome-devtools-mcp'` | Run `npx chrome-devtools-mcp@latest --help` in Terminal once to prime the npm cache, then restart Claude Desktop. |
| MCP server keeps dying                     | Check `~/Library/Logs/Claude/mcp*.log` (macOS). The log usually pinpoints the error.                              |
| Node version error                         | You're on Node < 20.19. Upgrade via [nvm](https://github.com/nvm-sh/nvm) or [brew](https://brew.sh).              |

If you're stuck, paste your config and the MCP log into Claude itself and ask for help — it can usually diagnose the issue.

---

## 3. Install the Plasmic Designer Skill

### 3A. For Agentic CLIs

Skills live in a conventional directory your CLI already looks at:

- **Claude Code** (per-project): `<your-project>/.claude/skills/plasmic-designer/`
- **Claude Code** (user-global, available everywhere): `~/.claude/skills/plasmic-designer/`
- **Codex / Opencode / Cursor**: see each tool's skills documentation.

Copy the skill folder:

```sh
# User-global install (available from any project)
mkdir -p ~/.claude/skills
cp -r path/to/plasmic-designer ~/.claude/skills/
```

The destination folder should contain:

```
plasmic-designer/
├── SKILL.md
├── README.md
└── references/
    ├── design-guidelines.md
    └── html-constraints.md
```

No other setup is needed — the CLI discovers skills automatically on start.

> **Verify.** In your CLI, type `/plasmic-designer` (Claude Code) or ask _"what skills are available?"_. The `plasmic-designer` skill should appear in the list.

### 3B. For Claude Desktop

Claude Desktop supports custom skills via a ZIP upload. Your skill must be a ZIP file containing a folder with `SKILL.md` directly inside it. **The folder name must match the skill name** (`plasmic-designer`).

1. Zip the `plasmic-designer` directory. From `ai/skills/` (the parent of `plasmic-designer/`), run:

   ```sh
   zip -r plasmic-designer.zip plasmic-designer
   ```

2. In the desktop app, go to **Customize → Skills**.
3. Click the **+** button, then choose **+ Create skill**.
4. Select **Upload a skill**.
5. Choose your `plasmic-designer.zip` file and upload it.
6. The skill appears in your list — toggle it on to activate it.

> **Verify.** In Claude Desktop, start a new chat and ask _"what skills are available?"_. The `plasmic-designer` skill should appear in the list.

---

## 4. First Use — End-to-End Walkthrough

Let's design something.

1. In your AI assistant, type:

   ```
   /plasmic-designer <YOUR_PROJECT_ID> Add a hero section to the Homepage page
   ```

   Replace `<YOUR_PROJECT_ID>` with your real project ID. In Claude Desktop, drop the `/plasmic-designer` prefix — start a new chat with the uploaded `plasmic-designer` skill toggled on and describe the task, including the project ID.

2. The first tool call triggers an MCP permission prompt — _"Allow chrome-devtools to navigate_page?"_. Click **Allow**, and optionally **Always allow** so it doesn't ask again for this session.

3. `chrome-devtools-mcp` launches a fresh Chrome window using its own dedicated profile. **The first time you run the skill, sign into Plasmic in that Chrome window** — the profile persists across runs, so you only need to do this once.

4. Once you're signed in, ask the assistant to retry. It will navigate to your project, wait for the studio to load, read the component tree, and insert a new hero section. The Plasmic canvas updates live.

5. Changes are normal Plasmic operations — hit **⌘Z** / **Ctrl+Z** inside Plasmic Studio to undo anything you don't like.

---

## 5. Troubleshooting

| Symptom                             | Likely cause                                                            | Fix                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PLASMIC_AI_TOOLS is undefined`     | Studio hasn't finished loading, or the page isn't a Plasmic project URL | Wait a few seconds and retry. Confirm the URL is `studio.plasmic.app/projects/<id>/`.                              |
| Assistant lands on the login page   | Plasmic session expired or you haven't signed in yet in the MCP Chrome  | Sign into Plasmic in the Chrome window that `chrome-devtools-mcp` opened, then ask the assistant to retry.         |
| `spawn npx ENOENT` (Claude Desktop) | `PATH` is missing from the MCP subprocess                               | Use absolute paths for `command`, add `env.PATH` (see [Section 2B, Step 3](#step-3--paste-the-mcp-configuration)). |
| Node version error                  | Node < 20.19                                                            | Upgrade Node.                                                                                                      |
| Skill not listed in CLI             | Wrong directory, or folder doesn't contain `SKILL.md`                   | Confirm `~/.claude/skills/plasmic-designer/SKILL.md` exists.                                                       |

---

Feedback, bug reports, and feature requests: reach out in the [Plasmic community Slack](https://plasmic.app/slack) or on the [Plasmic forum](https://forum.plasmic.app/).
