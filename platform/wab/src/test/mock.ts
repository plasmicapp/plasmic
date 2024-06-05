import { mockDeep } from "jest-mock-extended";

/**
 * Makes a deep mock that recursively returns deep mocks.
 *
 * This is useful for mocking objects with methods that perform side effects
 * that you don't care about (e.g. DOM operations during unit tests).
 */
export function mockDeepAuto<T>() {
  return mockDeep<T>({ fallbackMockImplementation: () => mockDeepAuto() });
}
