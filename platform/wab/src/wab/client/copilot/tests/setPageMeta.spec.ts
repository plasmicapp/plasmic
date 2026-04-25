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
      title: "Pricing | Acme",
      description: "Simple pricing for every team.",
      canonical: "https://example.com/pricing",
      openGraphImage: "https://example.com/pricing-og.png",
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
      title: {
        type: "template",
        parts: [
          "Product ",
          { type: "objectPath", path: ["$ctx", "params", "slug"] },
        ],
      },
      description: {
        type: "code",
        code: "$props.description",
        fallback: "Product details",
      },
      canonical: {
        type: "objectPath",
        path: ["$ctx", "path"],
      },
      openGraphImage: {
        type: "code",
        code: "$props.openGraphImage",
      },
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
    expect(descriptionExpr.code).toEqual("($props.description)");
    expect((descriptionExpr.fallback as CustomCode).code).toEqual(
      '"Product details"'
    );

    const canonical = page.pageMeta.canonical as TemplatedString;
    expect(canonical.text[1]).toBeInstanceOf(ObjectPath);
    expect((canonical.text[1] as ObjectPath).path).toEqual(["$ctx", "path"]);

    const openGraphImage = page.pageMeta.openGraphImage as TemplatedString;
    expect(openGraphImage.text[1]).toBeInstanceOf(CustomCode);
    expect((openGraphImage.text[1] as CustomCode).code).toEqual(
      "($props.openGraphImage)"
    );
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
