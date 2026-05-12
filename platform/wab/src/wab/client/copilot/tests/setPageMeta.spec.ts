import { setPageMetaTool } from "@/wab/client/copilot/tools/setPageMeta";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import {
  ComponentType,
  PageComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import {
  CustomCode,
  ObjectPath,
  TemplatedString,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";

let studioCtx: StudioCtx;

beforeEach(() => {
  ({ studioCtx } = fakeStudioCtx());
});

async function createPage(name: string, path?: string): Promise<PageComponent> {
  return studioCtx.changeUnsafe(() => {
    const page = studioCtx.addComponent(name, {
      type: ComponentType.Page,
      noSwitchArena: true,
    }) as PageComponent;
    if (path !== undefined) {
      studioCtx.tplMgr().changePagePath(page, path);
    }
    return page;
  });
}

function expectPage(componentUuid: string): PageComponent {
  const page = studioCtx.site.components.find(
    (component) => component.uuid === componentUuid
  );
  if (!page) {
    throw new Error(`Expected page "${componentUuid}" to exist.`);
  }
  expect(isPageComponent(page)).toBe(true);
  return page as PageComponent;
}

describe("setPageMeta copilot tool", () => {
  it("renames a page and updates its path and static metadata", async () => {
    const { uuid: componentUuid } = await createPage("Landing", "/landing");

    await setPageMetaTool.execute(studioCtx, {
      componentUuid,
      name: "Pricing",
      path: "pricing",
      title: '"Pricing | Acme"',
      description: '"Simple pricing for every team."',
      canonical: '"https://example.com/pricing"',
      openGraphImage: '"https://example.com/pricing-og.png"',
    });
    const page = expectPage(componentUuid);

    expect(page.name).toEqual("Pricing");
    expect(page.pageMeta.path).toEqual("/pricing");
    expect(page.pageMeta.title).toEqual("Pricing | Acme");
    expect(page.pageMeta.description).toEqual("Simple pricing for every team.");
    expect(page.pageMeta.canonical).toEqual("https://example.com/pricing");
    expect(page.pageMeta.openGraphImage).toEqual(
      "https://example.com/pricing-og.png"
    );
  });

  it("supports dynamic metadata values", async () => {
    const { uuid: componentUuid } = await createPage(
      "Product",
      "/products/[slug]"
    );

    await setPageMetaTool.execute(studioCtx, {
      componentUuid,
      // Backtick-wrapped templated string with interpolation.
      title: "`Product ${$ctx.params.slug}`",
      // Bare JS expression (no backticks) — escape hatch for raw code.
      description: "$props.description ?? 'Product details'",
      // Backtick-wrapped, single interpolation.
      canonical: "`${$ctx.path}`",
      openGraphImage: "`${$props.openGraphImage}`",
    });
    const page = expectPage(componentUuid);

    const title = page.pageMeta.title;
    expect(isKnownTemplatedString(title)).toBe(true);
    expect((title as TemplatedString).text[0]).toEqual("Product ");
    expect((title as TemplatedString).text[1]).toBeInstanceOf(ObjectPath);
    expect(((title as TemplatedString).text[1] as ObjectPath).path).toEqual([
      "$ctx",
      "params",
      "slug",
    ]);

    const description = page.pageMeta.description as TemplatedString;
    const descriptionExpr = description.text[1] as CustomCode;
    expect(descriptionExpr).toBeInstanceOf(CustomCode);
    expect(descriptionExpr.code).toEqual(
      "($props.description ?? 'Product details')"
    );

    const canonical = page.pageMeta.canonical as TemplatedString;
    expect(canonical.text[1]).toBeInstanceOf(ObjectPath);
    expect((canonical.text[1] as ObjectPath).path).toEqual(["$ctx", "path"]);

    const openGraphImage = page.pageMeta.openGraphImage as TemplatedString;
    expect(openGraphImage.text[1]).toBeInstanceOf(ObjectPath);
    expect((openGraphImage.text[1] as ObjectPath).path).toEqual([
      "$props",
      "openGraphImage",
    ]);
  });

  it("clears nullable meta fields when given null", async () => {
    const { uuid: componentUuid } = await createPage("Landing", "/landing");

    await setPageMetaTool.execute(studioCtx, {
      componentUuid,
      title: '"Landing | Acme"',
      description: '"Welcome."',
      canonical: '"https://example.com/landing"',
      openGraphImage: '"https://example.com/landing-og.png"',
    });

    await setPageMetaTool.execute(studioCtx, {
      componentUuid,
      title: null,
      description: null,
      canonical: null,
      openGraphImage: null,
    });
    const page = expectPage(componentUuid);

    expect(page.pageMeta.title).toBeNull();
    // `description` is non-nullable on the model, so null clears to ""
    expect(page.pageMeta.description).toEqual("");
    expect(page.pageMeta.canonical).toBeNull();
    expect(page.pageMeta.openGraphImage).toBeNull();
  });

  it("returns error for unquoted plain text", async () => {
    const { uuid: componentUuid } = await createPage("Landing", "/landing");

    await expect(
      setPageMetaTool.execute(studioCtx, {
        componentUuid,
        // Plain prose — neither quoted, backtick-wrapped, nor valid JS.
        title: "My nice title",
      })
    ).rejects.toThrow(/quote/i);
  });

  it("rejects non-page components", async () => {
    const component = await studioCtx.changeUnsafe(() =>
      studioCtx.addComponent("Widget", {
        type: ComponentType.Plain,
      })
    );

    await expect(
      setPageMetaTool.execute(studioCtx, {
        componentUuid: component.uuid,
        path: "/widget",
      })
    ).rejects.toThrow(`Component "${component.uuid}" is not a page.`);
  });
});
