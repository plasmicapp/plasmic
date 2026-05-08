# HTML Constraints for Plasmic insertHtml

These rules reflect Plasmic platform constraints — following them avoids silent failures and rendering bugs.

## Styling with `<style>` Blocks

Use a `<style>` block with class names rather than inline styles on every element. This keeps HTML readable and reduces duplication. Use BEM-style scoped class names (e.g., `.hero__title`) to avoid collisions with other components in the project.

```html
<style>
  .hero {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #0b1f0e;
    padding: 64px;
  }
  .hero__title {
    font-family: "Cormorant Garamond";
    font-size: 72px;
    font-weight: 300;
    color: #f4f0e8;
  }
  .hero__subtitle {
    font-family: "DM Sans";
    font-size: 16px;
    color: #8ba888;
  }

  @media (max-width: 768px) {
    .hero {
      padding: 24px;
    }
    .hero__title {
      font-size: 42px;
    }
  }
</style>
<div class="hero">
  <h1 class="hero__title"><span>Welcome</span></h1>
  <p class="hero__subtitle"><span>A place in the forest</span></p>
</div>
```

Reserve inline `style` attributes only for truly unique one-off values.

## Responsive Design

All designs must be responsive. Before generating HTML for a Page component, read the project's breakpoint configuration:

```javascript
async () => {
  return await window.PLASMIC_AI_TOOLS.read({
    project: { screenBreakpoints: true },
  });
};
```

Each breakpoint has a `name`, `uuid`, and `maxWidth`. Use `@media (max-width: <maxWidth>px)` queries inside the `<style>` block — this handles all breakpoints in a single insertion and is much more efficient than making separate `changeElement` calls per breakpoint.

Write desktop-first base styles, then override for smaller screens: stack horizontal layouts vertically, reduce font sizes, shrink padding, hide decorative elements, and keep content readable.

## Layout

Use flex layout exclusively — set `flex-direction`, `justify-content`, and `align-items` on every flex container. Plasmic's rendering engine does not support CSS Grid (`display: grid`, `grid-template-columns`, etc.), so grid properties will be silently ignored or cause layout errors.

## Explicit CSS

Specify styles for every element. Plasmic does not inherit or assume browser defaults the same way a standalone page would, so leaving properties unset can produce unexpected results.

## Fonts

Use Google Fonts with a single font name in `font-family` (e.g., `'Inter'`). Plasmic handles font loading internally, and comma-separated fallback lists can cause rendering issues in the visual editor.

## Icons

Use inline SVG with inline properties (`fill`, `stroke`, `color`) rather than class-based styling. Class-based icon styles can conflict with Plasmic's style system.

## Content Completeness

If a design calls for N items (e.g., 15 cards, 6 team members), include all N. Do not use placeholder comments like `<!-- Repeat -->` — Plasmic inserts the HTML literally and won't expand placeholders.

## Prohibited Patterns

| Pattern                                     | Why it's prohibited                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| JavaScript in HTML                          | Plasmic strips JS from inserted HTML for security                                                                    |
| Vendor prefixes (`-webkit-`, `-moz-`, etc.) | Plasmic normalizes CSS internally; prefixes cause duplicate/conflicting rules                                        |
| `data:image/svg+xml` in backgrounds         | The Plasmic parser cannot handle data URIs in CSS background properties                                              |
| `currentColor`                              | Plasmic's style system doesn't resolve `currentColor` the same way browsers do, causing unexpected color inheritance |
| `:root` selector                            | Conflicts with Plasmic's own `:root` declarations and token system                                                   |
