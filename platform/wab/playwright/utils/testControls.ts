import { FrameLocator } from "@playwright/test";

export async function setSelectByLabel(
  frame: FrameLocator,
  selectName: string,
  label: string
): Promise<void> {
  const result = await frame.locator("body").evaluate(
    (_, { selectName: name, label: value }) => {
      const w = window as any;
      const testControl = w.dbg?.testControls?.[name];
      if (testControl?.setByLabel) {
        return testControl.setByLabel(value);
      }
      return null;
    },
    { selectName, label }
  );

  if (result === null) {
    throw new Error(`testControls.${selectName}.setByLabel not available`);
  }
}
