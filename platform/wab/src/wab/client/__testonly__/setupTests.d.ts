import "vitest";

// eslint-disable @typescript-eslint/no-empty-interface

// For using jest-extended with vitest.
declare module "vitest" {
  interface AsymmetricMatchersContaining extends CustomMatchers<any> {}
  interface ExpectStatic extends CustomMatchers<any> {}
}
