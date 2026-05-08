# Design Guidelines for Plasmic

Create designs that are striking, memorable, and launch-ready. Every design should have a clear aesthetic point-of-view.

## Design Thinking

Before generating HTML, commit to a specific aesthetic direction by considering:

- **Purpose** — What problem does this interface solve? Who uses it?
- **Tone** — Pick a clear direction: brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. Use these as inspiration but make the aesthetic feel intentional and cohesive.
- **Differentiation** — What makes this design unforgettable? What's the one thing someone will remember?

Both bold maximalism and refined minimalism work — the key is intentionality, not intensity.

## Typography

Choose fonts that are beautiful, unique, and interesting. Avoid overused generic fonts. Pair a distinctive display font with a refined body font. Establish clear hierarchy through varied sizes, weights, and spacing.

## Color & Theme

Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Ensure sufficient contrast for readability.

## Spatial Composition

Use unexpected layouts — asymmetry, overlap, diagonal flow. Generous negative space or controlled density. Avoid predictable, cookie-cutter component patterns.

## Backgrounds & Visual Details

Create atmosphere and depth rather than defaulting to solid colors. Consider gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, and grain overlays.

## Motion & Polish

Add hover states, transitions, and micro-interactions. Use `animation-delay` for staggered reveals. Focus on high-impact moments.

## Animations

Use CSS `@keyframes` and `animation` properties subtly to bring designs to life. Good candidates:

- Fade-in on page load for hero content (staggered with `animation-delay`)
- Gentle hover scale/lift on cards and buttons
- Smooth color transitions on interactive elements
- Subtle floating or pulsing effects on decorative accents

Keep animations tasteful: prefer `ease` or `ease-out` timing, short durations (200–600ms for interactions, 800–1200ms for reveals), and small transforms (2–8px translate, 1.02–1.05 scale). Define `@keyframes` in the `<style>` block alongside other rules.

## Matching Complexity to Vision

Maximalist designs need elaborate styling with extensive effects. Minimalist designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Match the implementation effort to the aesthetic ambition.
