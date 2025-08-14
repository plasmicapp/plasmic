import { Locator } from "playwright/test";

export async function setSelection(
  locator: Locator,
  pattern: string | RegExp,
  flags?: string
): Promise<void> {
  await locator.evaluate(
    (element, { searchPattern, searchFlags }) => {
      element.focus();
      const textNode = element.childNodes[0];
      const match = textNode.textContent?.match(
        new RegExp(searchPattern, searchFlags)
      );
      if (match) {
        const range = document.createRange();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        range.setStart(textNode, match.index!);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        range.setEnd(textNode, match.index! + match[0].length);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    },
    { searchPattern: pattern, searchFlags: flags }
  );
}
