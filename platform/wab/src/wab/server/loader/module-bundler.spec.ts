/** @jest-environment node */
import { externalizeCssUrlsPlugin } from "@/wab/server/loader/module-bundler";
import esbuild from "esbuild";
import { promises as fs } from "fs";
import { glob } from "glob";
import os from "os";
import path from "path";

describe("externalizeCssUrlsPlugin", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "css-url-test-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  // Generated CSS can reference url(...) paths that don't exist on the build
  // server's disk -- e.g. a relative or root-absolute image path that the user
  // pasted in Studio, meant to resolve against their deployed site at runtime.
  // esbuild would otherwise try to resolve these and fail the whole bundle with
  // "Could not resolve ...". The plugin marks every url-token external, leaving
  // the original url(...) text intact for the browser to resolve at runtime.
  const cssWithUnresolvableUrls = [
    `.root-absolute { background-image: url("/static/missing-image.png"); }`,
    `.relative { background: url(./does-not-exist.svg) no-repeat; }`,
    `.parent-relative { mask-image: url(../assets/nope.png); }`,
  ].join("\n");

  it("preserves unresolvable url() in a css__*.css minify pass", async () => {
    await fs.writeFile(path.join(dir, "css__test.css"), cssWithUnresolvableUrls);
    const outdir = path.join(dir, "out");

    // Mirrors the component-css esbuild build in module-bundler.ts.
    await expect(
      esbuild.build({
        entryPoints: glob.sync(path.join(dir, "css__*.css")),
        minify: true,
        outdir,
        target: ["safari13"],
        plugins: [externalizeCssUrlsPlugin],
      })
    ).resolves.toBeDefined();

    const out = (
      await fs.readFile(path.join(outdir, "css__test.css"))
    ).toString();
    expect(out).toContain("url(/static/missing-image.png)");
    expect(out).toContain("url(./does-not-exist.svg)");
    expect(out).toContain("url(../assets/nope.png)");
  });

  it("preserves unresolvable url() when bundling (css-entrypoint pass)", async () => {
    await fs.writeFile(path.join(dir, "css__test.css"), cssWithUnresolvableUrls);
    const outdir = path.join(dir, "out");

    await expect(
      esbuild.build({
        entryPoints: glob.sync(path.join(dir, "css__*.css")),
        minify: true,
        outdir,
        bundle: true,
        target: ["safari13"],
        plugins: [externalizeCssUrlsPlugin],
      })
    ).resolves.toBeDefined();

    const out = (
      await fs.readFile(path.join(outdir, "css__test.css"))
    ).toString();
    expect(out).toContain("url(/static/missing-image.png)");
    expect(out).toContain("url(./does-not-exist.svg)");
  });

  // This is the build that actually fails in production: render modules
  // `import "./css__*.css"`, so the JS bundle transitively processes that CSS
  // and resolves its url() tokens. The plugin must be on this build too.
  it("preserves unresolvable url() when a JS module imports the CSS", async () => {
    await fs.writeFile(path.join(dir, "css__test.css"), cssWithUnresolvableUrls);
    await fs.writeFile(
      path.join(dir, "render__test.tsx"),
      `import "./css__test.css";\nexport const X = 1;\n`
    );
    const outdir = path.join(dir, "out");

    await expect(
      esbuild.build({
        entryPoints: [path.join(dir, "render__test.tsx")],
        bundle: true,
        format: "esm",
        minify: true,
        outdir,
        absWorkingDir: dir,
        target: "es6",
        plugins: [externalizeCssUrlsPlugin],
      })
    ).resolves.toBeDefined();

    const cssFile = (await fs.readdir(outdir)).find((f) => f.endsWith(".css"));
    const out = (
      await fs.readFile(path.join(outdir, cssFile!))
    ).toString();
    expect(out).toContain("url(/static/missing-image.png)");
    expect(out).toContain("url(./does-not-exist.svg)");
  });

  it("fails to bundle unresolvable url() without the plugin (regression guard)", async () => {
    // Sanity check that the plugin is doing the work: the same JS-imports-CSS
    // build without it fails with esbuild's "Could not resolve" error -- the
    // exact production failure.
    await fs.writeFile(path.join(dir, "css__test.css"), cssWithUnresolvableUrls);
    await fs.writeFile(
      path.join(dir, "render__test.tsx"),
      `import "./css__test.css";\nexport const X = 1;\n`
    );

    await expect(
      esbuild.build({
        entryPoints: [path.join(dir, "render__test.tsx")],
        bundle: true,
        format: "esm",
        minify: true,
        outdir: path.join(dir, "out"),
        absWorkingDir: dir,
        target: "es6",
        logLevel: "silent",
      })
    ).rejects.toThrow(/Could not resolve/);
  });
});
