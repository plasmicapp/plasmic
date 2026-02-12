/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it } from "vitest";
import { noopFn } from "../utils";
import { executePlasmicQueries } from "./server";
import { asyncFuncCalls } from "./testonly/test-common";
import {
  TestState,
  expectInitialState,
  runRejectTest,
  runResolveTest,
  runResolveZeroTest,
  testPermutations,
} from "./testonly/test-queries";

describe("executePlasmicQuery", () => {
  let state: TestState;
  let queryData: ReturnType<typeof executePlasmicQueries>;

  beforeEach(() => {
    asyncFuncCalls.length = 0;
  });

  testPermutations.forEach(({ name, create$Queries, createQueries }) => {
    describe(`permutation: ${name}`, () => {
      beforeEach(async () => {
        state = { current: create$Queries() };
        queryData = executePlasmicQueries(
          state.current,
          createQueries({}, state.current)
        );

        await expectInitialState(state);
      });

      it("resolves if all queries resolve", async () => {
        await runResolveTest(state);
        await expect(queryData).resolves.toEqual({
          'depFn:["dep1-param"]': "dep1-done",
          'depFn:["dep2-param"]': "dep2-done",
          'depFn:["dep3-param","dep1-done","dep2-done"]': "dep3-done",
          'resultFn:["result-param","dep3-done"]': "result-done",
        });
      });

      it("resolves zero values", async () => {
        await runResolveZeroTest(state);
        await expect(queryData).resolves.toEqual({
          'depFn:["dep1-param"]': null,
          'depFn:["dep2-param"]': false,
          'depFn:["dep3-param",null,false]': 0,
          'resultFn:["result-param",0]': "",
        });
      });

      it("rejects if any query rejects", async () => {
        queryData.catch(noopFn); // avoid rejectPromiseionHandledWarning

        await runRejectTest(state);
        await expect(queryData).rejects.toThrowError();
      });
    });
  });
});
