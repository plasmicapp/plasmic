import {
  cStandard400Response,
  cStandard4xxResponse,
} from "@/wab/shared/api/util";
import {
  ApiCmsDatabase,
  CmsDatabaseId,
  CmsLocaleSpecificData,
} from "@/wab/shared/ApiSchema";
import { zOpaqueString, zParseJson } from "@/wab/shared/utils/zod-utils";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const PrimitiveFilterCondSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

const FilterCondSchema = z.union([
  PrimitiveFilterCondSchema,
  z.strictObject({ $in: z.array(PrimitiveFilterCondSchema) }),
  z.strictObject({ $gt: PrimitiveFilterCondSchema }),
  z.strictObject({ $ge: PrimitiveFilterCondSchema }),
  z.strictObject({ $lt: PrimitiveFilterCondSchema }),
  z.strictObject({ $le: PrimitiveFilterCondSchema }),
  z.strictObject({ $regex: PrimitiveFilterCondSchema }),
]);
export type FilterCond = z.infer<typeof FilterCondSchema>;

// Recursive schemas must be manually typed.
const FilterClauseSchema: z.Schema<FilterClause> = z
  .object({
    get $and() {
      return z.optional(z.array(FilterClauseSchema));
    },
    get $or() {
      return z.optional(z.array(FilterClauseSchema));
    },
    get $not() {
      return z.optional(FilterClauseSchema);
    },
  })
  .catchall(FilterCondSchema);
type LogicalFilterClause = {
  $and?: FilterClause[];
  $or?: FilterClause[];
  $not?: FilterClause;
};
export type FilterClause =
  | LogicalFilterClause
  | (LogicalFilterClause &
      Record<Exclude<string, keyof LogicalFilterClause>, FilterCond>);

const NonNegativeInt = z.number().nonnegative().int();

const ApiCmsQuerySchema = z.object({
  where: z.optional(FilterClauseSchema),
  limit: z.optional(NonNegativeInt),
  offset: z.optional(NonNegativeInt),
  order: z.optional(
    z.array(
      z.union([
        z.string(),
        z.object({
          field: z.string(),
          dir: z.union([z.literal("asc"), z.literal("desc")]),
        }),
      ])
    )
  ),
  fields: z.optional(z.array(z.string())),
});
export type ApiCmsQuery = z.infer<typeof ApiCmsQuerySchema>;

export interface PublicApiCmsRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  identifier: string | null;
  data: CmsLocaleSpecificData;
}

export const publicCmsReadsContract = c.router({
  queryTable: {
    method: "GET",
    path: "/api/v1/cms/databases/:dbId/tables/:tableIdentifier/query",
    pathParams: z.object({
      dbId: zOpaqueString<CmsDatabaseId>(),
      tableIdentifier: z.string(),
    }),
    query: z.object({
      // Query is encoded as the q= query param, a JSON string
      q: z.optional(z.string().transform(zParseJson(ApiCmsQuerySchema))),
      // draft=1 to query draft rows
      draft: z.optional(z.union([z.string(), z.literal("1")])),
      locale: z.optional(z.string()),
    }),
    responses: {
      200: c.type<{ rows: PublicApiCmsRow[] }>(),
      400: cStandard400Response(),
      401: cStandard4xxResponse(),
      403: cStandard4xxResponse(),
    },
  },
  countTable: {
    method: "GET",
    path: "/api/v1/cms/databases/:dbId/tables/:tableIdentifier/count",
    pathParams: z.object({
      dbId: zOpaqueString<CmsDatabaseId>(),
      tableIdentifier: z.string(),
    }),
    query: z.object({
      // Query is encoded as the q= query param, a JSON string
      // Same as queryTable, but it only accepts the `where` field
      q: z.optional(
        z
          .string()
          .transform(zParseJson(ApiCmsQuerySchema.pick({ where: true })))
      ),
      // draft=1 to query draft rows
      draft: z.optional(z.union([z.string(), z.literal("1")])),
    }),
    responses: {
      200: c.type<{ count: number }>(),
      400: cStandard400Response(),
      401: cStandard4xxResponse(),
      403: cStandard4xxResponse(),
    },
  },
  getDatabase: {
    method: "GET",
    path: "/api/v1/cms/databases/:dbId",
    pathParams: z.object({
      dbId: zOpaqueString<CmsDatabaseId>(),
    }),
    responses: {
      200: c.type<ApiCmsDatabase>(),
    },
  },
});
