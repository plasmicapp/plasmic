---
name: plasmic-designer
description: Build and modify Plasmic Studio designs using copilot tools via Chrome DevTools MCP. First argument should be a project ID, followed by the design request. Use this skill whenever the user mentions Plasmic, Plasmic Studio, visual web builder, or asks to design, build, edit, or modify UI components, pages, sections, or layouts inside a Plasmic project. Also trigger when the user references a Plasmic project ID, wants to add/remove/restyle elements in a visual editor, or asks about Plasmic component props, variants, slots, or tokens — even if they don't say "Plasmic" explicitly but describe visual design work that implies it.
allowed-tools: mcp__chrome-devtools__evaluate_script mcp__chrome-devtools__navigate_page mcp__chrome-devtools__take_screenshot mcp__chrome-devtools__list_pages
metadata:
  version: "1.0.0"
---

# Plasmic Designer

Skill Version: 1.0.0

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
   - `skill` — Skill name and version being used (e.g. `plasmic-designer@1.0.0`, `unknown`).

   Pass `"unknown"` for any field you cannot reliably identify.

## Workflow

Follow an explore-first pattern for every request:

1. **Understand** — Use `read` to inspect the current state before making changes. If the request could reuse existing components (buttons, cards, navbars), read available components first and prefer reusing them over creating new HTML.
2. **Plan** — For complex requests, think through the sequence of operations before acting. Break large tasks into logical steps.
3. **Execute** — Make changes using the appropriate tools.
4. **Verify** — Use `take_screenshot` to visually confirm the result. Use `read` if you need to verify structural changes.

## API Reference

All tools are called via `evaluate_script` using async arrow functions (the tools return Promises). Each returns `{ success: true, output: "..." }` or `{ success: false, error: { message: "...", type: "..." } }`.

Check `success` on every call. On failure, read the error message — common causes are invalid UUIDs or elements that don't exist. If a UUID-related error occurs, re-read the component to get fresh UUIDs before retrying.

### read — Inspect project data

```javascript
// Read all components and tokens
async () => {
  return await window.PLASMIC_AI_TOOLS.read({
    project: {
      components: true,
      tokens: true,
      screenBreakpoints: true,
      globalVariants: true,
    },
  });
};

// Read a specific component
async () => {
  return await window.PLASMIC_AI_TOOLS.read({
    components: ["<componentUuid>"],
  });
};

// Read specific elements within a component
async () => {
  return await window.PLASMIC_AI_TOOLS.read({
    elements: [
      { componentUuid: "<componentUuid>", elementUuid: "<elementUuid>" },
    ],
  });
};

// Read specific tokens
async () => {
  return await window.PLASMIC_AI_TOOLS.read({ tokens: ["<tokenUuid>"] });
};
```

The output is often XML. Parse it to extract UUIDs, structure, props, variants, and slots. Large projects may return large results — read selectively by requesting specific components rather than everything.

### insertHtml — Add HTML/CSS snippets

```javascript
async () => {
  return await window.PLASMIC_AI_TOOLS.insertHtml({
    html: "<div class='section'>...</div>",
    componentUuid: "<componentUuid>",
    tplUuid: "<targetElementUuid>",
    insertRelLoc: "append", // "before" | "prepend" | "append" | "after" | "wrap" | "replace"
    // variantUuids: ["<variantUuid>"]  // optional, defaults to base variant
  });
};
```

After insertion, the browser canvas updates automatically.

### changeElement — Rename elements and/or modify CSS

```javascript
async () => {
  return await window.PLASMIC_AI_TOOLS.changeElement({
    componentUuid: "<componentUuid>",
    // variantUuids: ["<variantUuid>"],  // optional
    changes: [
      {
        tplUuid: "<elementUuid>",
        // optional; pass null to remove the existing name
        name: "HeroSection",
        // optional; and null removes a property
        styles: {
          "background-color": "#1a1a2e",
          padding: "48px 24px",
          color: null,
        },
      },
    ],
  });
};
```

Each change entry can include a `name`, `styles`, or both.

### deleteElement — Remove an element

```javascript
async () => {
  return await window.PLASMIC_AI_TOOLS.deleteElement({
    componentUuid: "<componentUuid>",
    tplUuid: "<elementUuid>",
  });
};
```

## Components & Variants

### Targeting

Mutation tools require a `componentUuid` (from `read` results). They accept an optional `variantUuids` array — when omitted, changes apply to the base variant.

### Reusing Existing Components

When you read a component, the output includes **props** (text, boolean, enum, number, href with defaults), **variants** (boolean toggles or enum option groups), **slots** (named content areas), **base-variant-tpl-tree** (element tree with styles), and **VariantSettings** (style overrides per variant). Review these to understand the component before using it.

To use a component in insertHtml:

```html
<plasmic-component
  data-plasmic-name="ComponentName"
  data-props='{"propName":"value","variantGroup":"optionName"}'
  style="margin: 16px;"
>
  <div slot="slotName">Slot content here</div>
</plasmic-component>
```

- `data-plasmic-name` must exactly match the component name from `read()` (case-sensitive).
- `data-props` is a JSON object for both props and variant activations. Boolean variants: `"group": true`. Enum variants: `"group": "optionName"`.
- `slot="slotName"` on direct children fills a named slot.
- **Only layout/position styles work on instances**: width, height, min/max sizing, margin, position, top/left/bottom/right, z-index, order, align-self, flex-grow/shrink, opacity, display (only `none`), transform, and transition properties. Background, padding, color, font, border, etc. are ignored on instances — use `changeElement` on the component's root element instead. This is a Plasmic platform constraint, not a preference.

## HTML Code Guidelines

Before generating HTML, read `references/html-constraints.md` for the full set of rules. The key points:

- Use `<style>` blocks with BEM-style class names instead of inline styles.
- Use flex layout exclusively (Plasmic does not support CSS Grid).
- Include `@media` queries for responsive breakpoints — read the project's breakpoints with `read({ project: { screenBreakpoints: true } })` first.
- Use Google Fonts (single name, no fallback lists).
- Use inline SVG for icons, `https://placehold.co` for placeholder images.
- No JavaScript, no vendor prefixes, no `data:image/svg+xml`, no `currentColor`, no `:root`.

## Design Quality

Before generating designs, read `references/design-guidelines.md` for aesthetic principles and design thinking guidance.

## Design Tokens

Read the project's tokens with `read()` before generating designs, then:

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
