import {
  publicCreateRows,
  upsertDatabaseTables,
} from "@/wab/server/routes/cms";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { Request, Response } from "express-serve-static-core";

function makeReq(body: unknown) {
  return {
    params: { dbId: "db", tableIdentifier: "t" },
    body,
  } as unknown as Request;
}
const res = {} as Response;

describe("publicCreateRows", () => {
  it.each([
    undefined,
    null,
    {},
    { rows: null },
    { rows: false },
    { rows: 0 },
    { rows: "x" },
    { rows: { data: {} } },
  ])("throws BadRequestError when rows is not an array: %j", async (body) => {
    await expect(publicCreateRows(makeReq(body), res)).rejects.toThrow(
      BadRequestError,
    );
  });
});

describe("upsertDatabaseTables", () => {
  it.each([
    undefined,
    null,
    {},
    { tables: null },
    { tables: false },
    { tables: 0 },
    { tables: "x" },
    { tables: { identifier: "t" } },
  ])("throws BadRequestError when tables is not an array: %j", async (body) => {
    await expect(upsertDatabaseTables(makeReq(body), res)).rejects.toThrow(
      BadRequestError,
    );
  });
});
