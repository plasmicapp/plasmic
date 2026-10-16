import {
  PreviewCodegenContext,
  buildDocsPreviewModules,
  buildPreviewModules,
  buildPreviewUpdate,
} from "@/wab/client/components/live/preview-codegen";
import { syncPreview } from "@/wab/client/components/live/preview-sync";
import type {
  PreviewUpdate,
  SourceModule,
} from "@/wab/client/components/live/preview-types";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { generateSiteFromBundle } from "@/wab/shared/__testonly__/site-tests-utils";
import { Bundle, Bundler } from "@/wab/shared/bundler";
import { ensure, jsonClone } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { initBuiltinActions } from "@/wab/shared/core/states";
import { deepTrackComponents } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import fs from "fs";
import { autorun, observable, runInAction } from "mobx";
import path from "path";

const fixtureDir = path.resolve(
  __dirname,
  "../../../shared/codegen/__testonly__/bundles",
);
function loadFixture(name: string): PreviewCodegenContext {
  const site = generateSiteFromBundle(
    JSON.parse(
      fs.readFileSync(path.join(fixtureDir, `${name}.json`), "utf8"),
    ) as [string, Bundle][],
  );
  deepTrackComponents(site);
  const siteInfo = {
    id: "preview-test" as ProjectId,
    name: "Preview test",
    appAuthProvider: undefined,
  };
  initBuiltinActions({
    projectId: siteInfo.id,
    platform: "react",
    projectFlags: jsonClone(DEVFLAGS),
    inStudio: true,
  });
  return { site, siteInfo };
}

function transpileAll(modules: SourceModule[]) {
  const frame = { update: async () => {}, showError: async () => {} };
  return new Promise<unknown>((resolve) => {
    const dispose = syncPreview(
      { __plasmicLive: frame } as unknown as Window,
      () => ({ modules }),
      (error) => {
        dispose();
        resolve(error);
      },
    );
  });
}

it.each([
  "counters-test",
  "global-variant-test",
  "custom-functions-test",
  "style-token-overrides",
  "imported-project-default-theme-styles",
  "data-tokens",
])(
  "snapshots live and docs modules from %s without mutating the model",
  async (name) => {
    const ctx = loadFixture(name);
    const bundler = new Bundler();
    const before = bundler.bundle(ctx.site, "preview-test", "test");
    const snapshots: {
      component: string;
      render: PreviewUpdate["render"];
      propsModule?: SourceModule;
      liveModules: string[];
      docsModules: string[];
    }[] = [];
    const fixtureModules = new Map<string, SourceModule>();
    for (const component of ctx.site.components.filter(
      (c) => !isCodeComponent(c),
    )) {
      const route = {
        component,
        previewPath: "/preview",
        variants: {},
        globals: {},
        pageQuery: {},
        appUser: {},
      };
      const live = buildPreviewUpdate(ctx, route);
      const docs = buildDocsPreviewModules(ctx, component, false);
      expect(buildPreviewUpdate(ctx, route)).toEqual(live);
      // Both consumers must receive the same component implementations and JSX pragma.
      const docsByName = new Map(docs.modules.map((mod) => [mod.name, mod]));
      for (const mod of live.modules.filter((m) =>
        m.name.includes("render__"),
      )) {
        expect(docsByName.get(mod.name)).toEqual(mod);
        expect(mod.jsxPragma).toBe("createPlasmicElementProxy");
      }
      const modules = [
        ...new Map(
          [...live.modules, ...docs.modules].map((mod) => [mod.name, mod]),
        ).values(),
      ];
      expect(new Set(live.modules.map((mod) => mod.name)).size).toBe(
        live.modules.length,
      );
      // Exercise the actual transpiler over every emitted module.
      expect(await transpileAll(modules)).toBeUndefined();
      modules
        .filter((mod) => mod.name !== "./preview-props.tsx")
        .forEach((mod) => fixtureModules.set(mod.name, mod));
      snapshots.push({
        component: component.name,
        render: live.render,
        propsModule: live.modules.find(
          (mod) => mod.name === "./preview-props.tsx",
        ),
        liveModules: live.modules.map((mod) => mod.name),
        docsModules: docs.modules.map((mod) => mod.name),
      });
    }
    expect(snapshots.length).toBeGreaterThan(0);
    expect({
      previews: snapshots,
      modules: [...fixtureModules.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }).toMatchSnapshot();
    expect(bundler.bundle(ctx.site, "preview-test", "test")).toEqual(before);
  },
);

it("keeps memoized component outputs when unrelated route values change", () => {
  const ctx = loadFixture("counters-test");
  const component = ensure(
    ctx.site.components.find((c) => !isCodeComponent(c)),
    "fixture component",
  );
  const route = observable(
    {
      component,
      previewPath: "/one",
      variants: {},
      globals: {},
      pageQuery: {},
      appUser: {},
    },
    { component: false },
  );
  const outputs: ReturnType<typeof buildPreviewModules>["rootOutput"][] = [];
  const dispose = autorun(() => {
    void route.previewPath;
    outputs.push(buildPreviewModules(ctx, component).rootOutput);
  });
  runInAction(() => {
    route.previewPath = "/two";
  });
  expect(outputs).toHaveLength(2);
  expect(outputs[0]).toBe(outputs[1]);
  dispose();
});

it("builds a 404 without generating a component entry", () => {
  const ctx = loadFixture("counters-test");
  const result = buildPreviewUpdate(ctx, {
    previewPath: "/missing",
    variants: {},
    globals: {},
    pageQuery: {},
    appUser: {},
  });
  expect(result.render).toEqual({ notFound: "/missing" });
  expect(result.modules.some((mod) => mod.name === "./preview-props.tsx")).toBe(
    false,
  );
});

it("builds a 404 for a root deleted while it is previewed", () => {
  const ctx = loadFixture("counters-test");
  const page = ensure(
    ctx.site.components.find((c) => c.pageMeta),
    "fixture has a page",
  );
  ctx.site.components.splice(ctx.site.components.indexOf(page), 1);
  const result = buildPreviewUpdate(ctx, {
    component: page,
    previewPath: "/deleted",
    variants: {},
    globals: {},
    pageQuery: {},
    appUser: {},
  });
  expect(result.render).toEqual({ notFound: "/deleted" });
});
