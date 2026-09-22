import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { formatDocsCode } from "@/wab/client/components/docs/serialize-docs-preview";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { Component } from "@/wab/shared/model/classes";

vi.mock("@/wab/client/components/docs/serialize-docs-preview", () => ({
  formatDocsCode: vi.fn(),
  resolveCollisionsForComponentProp: vi.fn(),
  serializeToggledComponent: vi.fn(),
  updateComponentCode: vi.fn(),
}));

describe("DocsPortalCtx asynchronous formatting", () => {
  const component = {} as Component;
  let ctx: DocsPortalCtx;
  let formatting: ReturnType<typeof Promise.withResolvers<string>>;

  beforeEach(() => {
    ctx = new DocsPortalCtx({} as StudioCtx);
    formatting = Promise.withResolvers<string>();
    vi.mocked(formatDocsCode).mockReturnValue(formatting.promise);
  });

  it("stores generated code immediately, then replaces it with formatted code", async () => {
    ctx.setComponentCustomCode(component, "<Button   />", true);
    expect(ctx.getComponentCustomCode(component)).toBe("<Button   />");
    formatting.resolve("<Button />");
    await formatting.promise;
    expect(ctx.getComponentCustomCode(component)).toBe("<Button />");
  });

  it("does not overwrite a user edit when formatting finishes", async () => {
    ctx.setComponentCustomCode(component, "<Button   />", true);
    ctx.setComponentCustomCode(component, '<Button title="new" />');
    formatting.resolve("<Button />");
    await formatting.promise;
    expect(ctx.getComponentCustomCode(component)).toBe(
      '<Button title="new" />',
    );
  });

  it("does not restore code after it was reset", async () => {
    ctx.setComponentCustomCode(component, "<Button   />", true);
    ctx.resetComponentCustomCode();
    formatting.resolve("<Button />");
    await formatting.promise;
    expect(ctx.getComponentCustomCode(component)).toBeUndefined();
  });
});
