import "vitest";

// eslint-disable @typescript-eslint/no-empty-object-type

// For using jest-extended with vitest.
declare module "vitest" {
  interface AsymmetricMatchersContaining extends CustomMatchers<any> {}
  interface ExpectStatic extends CustomMatchers<any> {}
}
