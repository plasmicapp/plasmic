Vendored React Slick 0.31.0 for the Studio canvas and live preview.

The `lib/` files come from the upstream npm package, with:

- `platform/patches/react-slick.patch` applied (resize filtering and initial
  responsive breakpoint detection).
- `plasmic-slick-prev` and `plasmic-slick-next` classes retained on the arrows.
- `repeatedElement(false, slide)` wrapping the contents of pre/post-cloned slides
  so Studio does not treat infinite-loop copies as separate editable elements.

When upgrading, replace the upstream files, reapply the patch and these two
Studio changes, update `package.json`, and rebuild `canvas-packages`. The build
aliases both `react-slick` and `@ant-design/react-slick` to this copy.
