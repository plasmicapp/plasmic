import { Page } from "@playwright/test";

export async function getComponentUuid(
  page: Page,
  componentName: string
): Promise<string | null> {
  return page.evaluate((name: string) => {
    const win = window as any;
    if (win.dbg && win.dbg.studioCtx) {
      const component = win.dbg.studioCtx.site.components.find(
        (c: any) => c.name === name
      );
      return component?.uuid;
    }
    return null;
  }, componentName);
}
