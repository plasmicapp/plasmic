---
name: plasmic-designer
description: Build and modify Plasmic Studio designs using copilot tools via Chrome DevTools MCP. First argument should be a project ID, followed by the design request. Use this skill whenever the user mentions Plasmic, Plasmic Studio, visual web builder, or asks to design, build, edit, or modify UI components, pages, sections, or layouts inside a Plasmic project. Also trigger when the user references a Plasmic project ID, wants to add/remove/restyle elements in a visual editor, or asks about Plasmic component props, variants, slots, or tokens — even if they don't say "Plasmic" explicitly but describe visual design work that implies it.
allowed-tools: mcp__chrome-devtools__evaluate_script mcp__chrome-devtools__navigate_page mcp__chrome-devtools__take_screenshot mcp__chrome-devtools__list_pages
metadata:
  version: "1.1.0"
---

# Plasmic Designer

Skill Version: 1.1.0

Control Plasmic Studio through Chrome DevTools MCP to build and modify production-ready interfaces.

## Arguments

`$ARGUMENTS` should contain a **project ID** as the first word, followed by the design request.

Example: `/plasmic-designer j2Bm3mrbGNKsXVW3Wf5KpP Add a hero section to the Homepage`

If no project ID is provided, or if the conversation references multiple projects and it's unclear which one to use, ask the user to confirm the project ID before proceeding.

## Setup

The studio base URL is `https://studio.plasmic.app` by default. Only use `http://localhost:3003` if the user explicitly mentions localhost, a local dev server, or a local environment.

1. **Navigate to the project** using `navigate_page` to open `{baseUrl}/projects/{projectId}/`

2. **Wait for studio to load** — the studio takes a few seconds to initialize. Poll until the API is available:

   ```javascript
   async () => {
     for (let i = 0; i < 15; i++) {
       if (window.PLASMIC_AI_TOOLS) return { ready: true };
       await new Promise((r) => setTimeout(r, 2000));
     }
     return {
       ready: false,
       error: "Studio did not load. Check the project ID and dev server.",
     };
   };
   ```

   If `ready` is false, inform the user and stop.

3. **Identify the session** — call `window.PLASMIC_AI_TOOLS.identify()` once before any other tool. All fields are required.

   ```javascript
   () => {
     return window.PLASMIC_AI_TOOLS.identify({
       model: "<model>",
       client: "<client>",
       skill: "<skill>",
     });
   };
   ```

   Fields (all required):

   - `model` — Model name as known to the agent (e.g. `claude-opus-4-7`, `anthropic/claude-sonnet-4-6`, `gpt-5.3-codex`).
   - `client` — AI client/CLI invoking the tool (e.g. `claude-code`, `claude-code@1.x`, `opencode`, `cursor`, `cline`).
   - `skill` — Skill name and version being used (e.g. `plasmic-designer@1.1.0`, `unknown`).

   Pass `"unknown"` for any field you cannot reliably identify.

## Workflow

Follow an explore-first pattern for every request:

1. **Understand** — `read` the current state before changing anything; prefer reusing existing components over new HTML.
2. **Plan** — For complex requests, break the work into steps before acting.
3. **Execute** — Make changes with the appropriate tools.
4. **Verify** — `read` to confirm structural changes; Optionally, `take_screenshot` to confirm the result visually

## Using the tools

The toolset is exposed at runtime and is the source of truth — **introspect it, don't rely on a hardcoded list.** `_meta` is a `Record<string, CopilotToolMeta>` keyed by tool name:

```ts
interface CopilotToolMeta {
  toolName: string;
  title: string;
  description: string;
  inputSchema: JSONSchema7; // JSON Schema (draft-07)
}
```

Read it once with `evaluate_script` (return the object directly; `evaluate_script` serializes it for you), and treat each tool's `inputSchema` as authoritative for field names, required fields, enums, and nesting:

```javascript
() => window.PLASMIC_AI_TOOLS._meta;
```

Call a tool with an async arrow function (tools return Promises), passing one input object that conforms to its schema:

```javascript
async () => await window.PLASMIC_AI_TOOLS.<toolName>({
  /* fields per window.PLASMIC_AI_TOOLS._meta.<toolName>.inputSchema */
});
```

Every call resolves to a `CopilotToolCallResult`:

```ts
type CopilotToolCallResult =
  | { success: true; output: string }
  | {
      success: false;
      error: { message: string; type: "TOOL_NOT_FOUND" | "EXECUTION_FAILED" };
    };
```

Check `success` each time; on a UUID error, re-read for fresh UUIDs and retry.

Call `read` before any mutation to get project structure and the UUIDs every other tool needs. Its output is usually XML: parse it for UUIDs, props, variants, and slots, and read selectively (specific components/elements) on large projects. After a successful mutation the canvas updates automatically.

## Components & Variants

### Targeting

Mutation tools require a `componentUuid` (from `read` results). They accept an optional `variantUuids` array — when omitted, changes apply to the base variant.

### Reusing Existing Components

When you read a component, the output includes **props** (text, boolean, enum, number, href with defaults), **variants** (boolean toggles or enum option groups), **slots** (named content areas), **base-variant-tpl-tree** (element tree with styles), and **VariantSettings** (style overrides per variant). Review these to understand the component before using it.

To use a component in insertHtml:

```html
<plasmic-component
  data-plasmic-component="ComponentName"
  data-plasmic-project="importedProjectId"
  data-plasmic-name="primaryCta"
  data-props='{"propName":"value","variantGroup":"optionName"}'
  style="margin: 16px;"
>
  <div slot="slotName">Slot content here</div>
</plasmic-component>
```

- `data-plasmic-component` must exactly match the component name from `read()` (case-sensitive).
- `data-plasmic-project` (optional) is the id of the imported project the component comes from. Omit it for components in the current project; set it to use a component from an imported project.
- `data-plasmic-name` (optional) names this component instance in the tree. It's a semantic name picked up by Plasmic codegen to override the element in the generated code.
- `data-props` is a JSON object for both props and variant activations. Boolean variants: `"group": true`. Enum variants: `"group": "optionName"`.
- `slot="slotName"` on direct children fills a named slot.
- **Only layout/position styles work on instances**: width, height, min/max sizing, margin, position, top/left/bottom/right, z-index, order, align-self, flex-grow/shrink, opacity, display (only `none`), transform, and transition properties. Background, padding, color, font, border, etc. are ignored on instances — use `changeElement` on the component's root element instead. This is a Plasmic platform constraint, not a preference.

## HTML Code Guidelines

Before generating HTML, read `references/html-constraints.md` for the full set of rules. The key points:

- Use `<style>` blocks with BEM-style class names instead of inline styles.
- Use flex layout exclusively (Plasmic does not support CSS Grid).
- Include `@media` queries for responsive breakpoints — `read` the project's breakpoints (with `screenBreakpoints`) first.
- Use Google Fonts (single name, no fallback lists).
- Use inline SVG for icons, `https://placehold.co` for placeholder images.
- No JavaScript, no vendor prefixes, no `data:image/svg+xml`, no `currentColor`, no `:root`.

## Design Quality

Before generating designs, read `references/design-guidelines.md` for aesthetic principles and design thinking guidance.

## Design Tokens

Read the project's tokens before generating designs, then:

- Prefer existing tokens over hardcoded values for consistency. Reference them as `var(--token-<uuid>)`.
- If a token's value doesn't match the design intent, use a hardcoded value instead — design accuracy matters more than token reuse.
- Not every value needs a token. Use them for deliberate design decisions (brand colors, type scale), not incidental one-off values.

## Modifying Existing Components

- **Small changes** (color, spacing) — apply directly with `changeElement` or `insertHtml`.
- **Significant changes** to widely-used components — describe the proposed changes and ask the user before proceeding, since edits can cascade across the project.
- **Variant-scoped changes** — when possible, scope changes to a specific variant to avoid breaking other usages.

## Response Format

- Be brief and action-oriented. Lead with what you did.
- Summarize changes in 1-2 sentences.
- Don't repeat the user's request or give lengthy explanations unless asked.
