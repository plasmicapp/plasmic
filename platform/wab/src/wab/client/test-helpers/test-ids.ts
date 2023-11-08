let testIdCounter = 0;

export const testIds = {
  projectPanel: testId(),
  globalVariantsHeader: testId(),
};

function testId(): { "data-test-id": string; selector: string } {
  const id = `test-id_${++testIdCounter}`;
  const value = { "data-test-id": id };

  Object.defineProperty(value, "selector", {
    enumerable: false,
    value: `[data-test-id=${id}]`,
  });

  return value as any;
}
