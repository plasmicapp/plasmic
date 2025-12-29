import { DbMgr } from "@/wab/server/db/DbMgr";
import { CmsTable } from "@/wab/server/entities/Entities";
import {
  CmsTableCache,
  LeafSelection,
  RefSelection,
  RootSelection,
  makeSelectionTree,
  makeSqlCondition,
  traverseSchemaFields,
  typeToPgType,
} from "@/wab/server/util/cms-util";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import {
  CmsFieldMeta,
  CmsMetaType,
  CmsTableId,
  CmsTableSchema,
} from "@/wab/shared/ApiSchema";
import { ALLOWED_UNIQUE_TYPES } from "@/wab/shared/cms";

const createField = (
  identifier: string,
  type: any,
  fields?: CmsFieldMeta[],
  override?: Partial<CmsFieldMeta>
): CmsFieldMeta => {
  return {
    identifier,
    name: identifier,
    type,
    helperText: "",
    required: false,
    hidden: false,
    localized: false,
    unique: false,
    defaultValueByLocale: {},
    fields: fields || [],
    ...override,
  };
};

describe("traverseSchemaFields", () => {
  it("should process all fields in a flat structure", () => {
    const fields: CmsFieldMeta[] = [
      createField("field1", "text"),
      createField("field2", "number"),
      createField("field3", "boolean"),
    ];

    const processedFields: string[] = [];
    const processFieldCallback = (field: CmsFieldMeta) => {
      processedFields.push(field.identifier);
    };

    traverseSchemaFields(fields, processFieldCallback);

    expect(processedFields).toEqual(["field1", "field2", "field3"]);
  });

  it("should process nested fields", () => {
    const fields: CmsFieldMeta[] = [
      createField("field1", "text"),
      createField("field2", "object", [
        createField("nestedField1", "text"),
        createField("nestedField2", "number"),
      ]),
      createField("field3", "boolean"),
    ];

    const processedFields: string[] = [];
    const processFieldCallback = (field: CmsFieldMeta) => {
      processedFields.push(field.identifier);
    };

    traverseSchemaFields(fields, processFieldCallback);

    expect(processedFields).toEqual([
      "field1",
      "field2",
      "nestedField1",
      "nestedField2",
      "field3",
    ]);
  });

  it("should process deeply nested fields", () => {
    const fields: CmsFieldMeta[] = [
      createField("root", "object", [
        createField("level1", "list", [
          createField("level2", "object", [createField("level3", "long-text")]),
        ]),
      ]),
    ];

    const processedFields: string[] = [];
    const processFieldCallback = (field: CmsFieldMeta) => {
      processedFields.push(field.identifier);
    };

    traverseSchemaFields(fields, processFieldCallback);

    expect(processedFields).toEqual(["root", "level1", "level2", "level3"]);
  });

  it("should return the modified fields structure", () => {
    const fields: CmsFieldMeta[] = [
      createField("field1", "text"),
      createField("field2", "object", [createField("nestedField", "text")]),
    ];

    const processFieldCallback = (field: CmsFieldMeta) => {
      if (field.identifier === "field1") {
        field.required = true;
        field.label = "Field 1 Updated";
      }

      if (field.identifier === "nestedField") {
        field.helperText = "Nested field helper text";
      }
    };

    const result = traverseSchemaFields(fields, processFieldCallback);

    expect(result).toEqual([
      createField("field1", "text", [], {
        required: true,
        label: "Field 1 Updated",
      }),
      createField("field2", "object", [
        createField("nestedField", "text", [], {
          helperText: "Nested field helper text",
        }),
      ]),
    ]);
  });

  it("should handle empty fields array", () => {
    const fields: CmsFieldMeta[] = [];

    const processFieldCallback = jest.fn();

    const result = traverseSchemaFields(fields, processFieldCallback);

    expect(result).toEqual([]);
    expect(processFieldCallback).not.toHaveBeenCalled();
  });

  it("should allow deleting a nested field", () => {
    const fields: CmsFieldMeta[] = [
      createField("parentField", "object", [
        createField("childField1", "text"),
        createField("childField2", "number"),
      ]),
    ];

    const processFieldCallback = (field: CmsFieldMeta) => {
      if (field.identifier === "parentField" && field.type === "object") {
        field.fields = field.fields.filter(
          (childField) => childField.identifier !== "childField1"
        );
      }
    };

    const result = traverseSchemaFields(fields, processFieldCallback);

    expect(result).toEqual([
      createField("parentField", "object", [
        createField("childField2", "number"),
      ]),
    ]);
  });
});

describe("typeToPgType", () => {
  it("should support all ALLOWED_UNIQUE_TYPES", () => {
    ALLOWED_UNIQUE_TYPES.forEach((type) => {
      expect(typeToPgType(type)).toBeDefined();
    });
  });
});

const TEST_TABLE = {
  id: "test-table-id",
  schema: {
    fields: [
      createField("textField", CmsMetaType.TEXT),
      createField("numberField", CmsMetaType.NUMBER),
      createField("booleanField", CmsMetaType.BOOLEAN),
      createField("datetimeField", CmsMetaType.DATE_TIME),
      createField("objectField", CmsMetaType.OBJECT, [
        createField("enumField", CmsMetaType.ENUM),
      ]),
    ],
  } as CmsTableSchema,
} as any;

describe("makeSqlCondition", () => {
  it("considers empty clauses as TRUE", () => {
    expect(makeSqlCondition(TEST_TABLE, {}, { useDraft: false })).toEqual({
      condition: "TRUE",
      params: {},
    });
  });

  it("handles useDraft: true", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          textField: "foo",
        },
        { useDraft: true }
      )
    ).toEqual({
      condition:
        "((CASE WHEN r.draftData IS NOT NULL THEN r.draftData ELSE r.data END)->''->>'textField')::text = :val0",
      params: {
        val0: "foo",
      },
    });
  });

  it("special cases _id field", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          _id: "123456",
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "r.id = :val0",
      params: {
        val0: "123456",
      },
    });
  });

  it("accesses nested nested field", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          "objectField.enumField": "enumValue",
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->'objectField'->>'enumField')::text = :val0",
      params: {
        val0: "enumValue",
      },
    });
  });

  it("works with equality operator", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          textField: "foo",
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'textField')::text = :val0",
      params: {
        val0: "foo",
      },
    });
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          datetimeField: "2025-01-01T00:00:00Z",
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'datetimeField')::timestamp = :val0",
      params: {
        val0: "2025-01-01T00:00:00Z",
      },
    });
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          numberField: 42,
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'numberField')::numeric = :val0",
      params: {
        val0: 42,
      },
    });
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          booleanField: true,
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'booleanField')::boolean = :val0",
      params: {
        val0: true,
      },
    });
  });

  it("special cases equality operator with false boolean", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          booleanField: false,
        },
        { useDraft: false }
      )
    ).toEqual({
      condition:
        "((r.data->''->>'booleanField')::boolean = :val0 OR (r.data->''->>'booleanField')::boolean IS NULL)",
      params: {
        val0: false,
      },
    });
  });

  it("works with $gt", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          datetimeField: { $gt: "2025-01-01T00:00:00Z" },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'datetimeField')::timestamp > :val0",
      params: {
        val0: "2025-01-01T00:00:00Z",
      },
    });
  });

  it("works with $ge", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          numberField: { $ge: 42 },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'numberField')::numeric >= :val0",
      params: {
        val0: 42,
      },
    });
  });

  it("works with $lt", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          numberField: { $lt: 42 },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'numberField')::numeric < :val0",
      params: {
        val0: 42,
      },
    });
  });

  it("works with $le", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          datetimeField: { $le: "2025-01-01T00:00:00Z" },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'datetimeField')::timestamp <= :val0",
      params: {
        val0: "2025-01-01T00:00:00Z",
      },
    });
  });

  it("works with $in", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          textField: { $in: ["value1", "value2", "value3"] },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'textField')::text IN (:...val0)",
      params: {
        val0: ["value1", "value2", "value3"],
      },
    });
  });

  it("considers $in with zero arguments as FALSE", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          textField: { $in: [] },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "FALSE",
      params: {},
    });
  });

  it("works with $regex", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          textField: { $regex: "^test" },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "(r.data->''->>'textField')::text ~* :val0",
      params: {
        val0: "^test",
      },
    });
  });

  it("ands the level of conditions", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          textField: "foo",
          numberField: 42,
        },
        { useDraft: false }
      )
    ).toEqual({
      condition:
        "((r.data->''->>'textField')::text = :val0) AND ((r.data->''->>'numberField')::numeric = :val1)",
      params: {
        val0: "foo",
        val1: 42,
      },
    });
  });

  it("works with $and", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          $and: [{ textField: "foo" }, { numberField: 42 }],
        },
        { useDraft: false }
      )
    ).toEqual({
      condition:
        "((r.data->''->>'textField')::text = :val0) AND ((r.data->''->>'numberField')::numeric = :val1)",
      params: {
        val0: "foo",
        val1: 42,
      },
    });
  });

  it("works with $or", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          $or: [{ textField: "foo" }, { numberField: 42 }],
        },
        { useDraft: false }
      )
    ).toEqual({
      condition:
        "((r.data->''->>'textField')::text = :val0) OR ((r.data->''->>'numberField')::numeric = :val1)",
      params: {
        val0: "foo",
        val1: 42,
      },
    });
  });

  it("works with $not", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          $not: {
            textField: "foo",
          },
        },
        { useDraft: false }
      )
    ).toEqual({
      condition: "NOT ((r.data->''->>'textField')::text = :val0)",
      params: {
        val0: "foo",
      },
    });
  });

  it("works with complex nested logical expression", () => {
    expect(
      makeSqlCondition(
        TEST_TABLE,
        {
          booleanField: true, // 1
          $or: [
            {
              $and: [
                { textField: { $regex: "^bar" } },
                { numberField: { $gt: 10 } },
                { numberField: { $lt: 50 } },
              ],
            }, // 2
            {
              $not: {
                _id: "test-id",
                $and: [
                  { datetimeField: { $ge: "2023-01-01T00:00:00Z" } },
                  { datetimeField: { $le: "2023-12-31T23:59:59Z" } },
                  {},
                ],
              },
            }, // 3
            {
              "objectField.enumField": { $in: ["value1", "value2", "value3"] },
            }, // 4
          ],
        },
        { useDraft: false }
      )
    ).toEqual({
      condition:
        "((r.data->''->>'booleanField')::boolean = :val0) " + // 1
        "AND (" +
        ("(((r.data->''->>'textField')::text ~* :val1) AND ((r.data->''->>'numberField')::numeric > :val2) AND ((r.data->''->>'numberField')::numeric < :val3)) " + // 2
          "OR (NOT ((r.id = :val4) AND (((r.data->''->>'datetimeField')::timestamp >= :val5) AND ((r.data->''->>'datetimeField')::timestamp <= :val6) AND (TRUE)))) " + // 3
          "OR ((r.data->''->'objectField'->>'enumField')::text IN (:...val7))") + // 4
        ")",
      params: {
        val0: true,
        val1: "^bar",
        val2: 10,
        val3: 50,
        val4: "test-id",
        val5: "2023-01-01T00:00:00Z",
        val6: "2023-12-31T23:59:59Z",
        val7: ["value1", "value2", "value3"],
      },
    });
  });

  it("throws error is field is unknown", () => {
    expect(() =>
      makeSqlCondition(
        TEST_TABLE,
        {
          unknownField: "value",
        },
        { useDraft: false }
      )
    ).toThrow(
      new BadRequestError('Unknown field or logical operator "unknownField"')
    );
  });
});

describe("makeSelectionTree", () => {
  const aNameField = createField("name", CmsMetaType.TEXT);
  const animalTable: CmsTable = {
    id: "animal-table-id",
    identifier: "animal",
    schema: {
      fields: [aNameField],
    },
  } as Partial<CmsTable> as CmsTable;

  const hNameField = createField("name", CmsMetaType.TEXT);
  const hAgeField = createField("age", CmsMetaType.NUMBER, [], {
    hidden: true,
  });
  const hFavAnimalField = createField("favoriteAnimal", CmsMetaType.REF, [], {
    tableId: "animal-table-id" as CmsTableId,
  });
  const hBfField = createField("bestFriend", CmsMetaType.REF, [], {
    tableId: "human-table-id" as CmsTableId,
  });
  const hFriendsRefField = createField("ref", CmsMetaType.REF, [], {
    tableId: "human-table-id" as CmsTableId,
  });
  const hFriendsMetadataRelationshipField = createField(
    "relationship",
    CmsMetaType.TEXT
  );
  const hFriendsMetadataSharedAnimalRefField = createField(
    "sharedAnimal",
    CmsMetaType.REF,
    [],
    {
      tableId: "animal-table-id" as CmsTableId,
    }
  );
  const hFriendsMetadataField = createField("metadata", CmsMetaType.OBJECT, [
    hFriendsMetadataRelationshipField,
    hFriendsMetadataSharedAnimalRefField,
  ]);
  const hFriendsField = createField("friends", CmsMetaType.LIST, [
    hFriendsRefField,
    hFriendsMetadataField,
  ]);
  const humanTable: CmsTable = {
    id: "human-table-id",
    identifier: "human",
    schema: {
      fields: [hNameField, hAgeField, hFavAnimalField, hBfField, hFriendsField],
    },
  } as Partial<CmsTable> as CmsTable;

  let tableCache: CmsTableCache;

  beforeEach(() => {
    // We'll fill all data beforehand, let any calls to DbMgr fail
    tableCache = new CmsTableCache(undefined as unknown as DbMgr);
    tableCache.fill(animalTable);
    tableCache.fill(humanTable);
  });

  it("returns specified fields (including hidden)", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "name",
      "age",
    ]);
    expect(result.table).toBe(humanTable);
    expectLeaf(result, "name", hNameField);
    expectLeaf(result, "age", hAgeField);
  });

  it("returns all fields for *", async () => {
    const result = await makeSelectionTree(tableCache, animalTable, ["*"]);
    expect(result.table).toBe(animalTable);
    expectLeaf(result, "name", aNameField);
  });

  it("returns all non-hidden fields for *", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, ["*"]);
    expect(result.table).toBe(humanTable);
    expectLeaf(result, "name", hNameField);
    expect(getSelection(result, "age")).toBeUndefined();
    expectLeaf(result, "favoriteAnimal", hFavAnimalField);
    expectLeaf(result, "bestFriend", hBfField);
    expectLeaf(result, "friends", hFriendsField);
  });

  it("returns all fields for * with hidden field", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "*",
      "age",
    ]);
    expect(result.table).toBe(humanTable);
    expectLeaf(result, "name", hNameField);
    expectLeaf(result, "age", hAgeField);
    expectLeaf(result, "favoriteAnimal", hFavAnimalField);
    expectLeaf(result, "bestFriend", hBfField);
    expectLeaf(result, "friends", hFriendsField);
  });

  it("allows field made redundant with *", async () => {
    const result = await makeSelectionTree(tableCache, animalTable, [
      "*",
      "name", // redundant
    ]);
    expect(result.table).toBe(animalTable);
    expectLeaf(result, "name", aNameField);
  });

  it("allows redundant ref fields", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "favoriteAnimal.name",
      "favoriteAnimal", // redundant
    ]);
    expect(result.table).toBe(humanTable);
    expectRef(result, "favoriteAnimal", animalTable, hFavAnimalField);
    expectLeaf(result, "favoriteAnimal.name", aNameField);
  });

  it("allows redundant nested fields", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "friends",
      "friends.ref", // redundant
      "friends.metadata", // redundant
      "friends.metadata.relationship", // redundant
      "friends.metadata.sharedAnimal", // redundant
    ]);
    expect(result.table).toBe(humanTable);
    expectLeaf(result, "friends", hFriendsField);
  });

  it("returns only root nested field if subfield not selected", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "friends.metadata.sharedAnimal",
    ]);
    expect(result.table).toBe(humanTable);
    expectLeaf(result, "friends", hFriendsField);
  });

  it("returns all nested fields for *", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "favoriteAnimal.*",
      "bestFriend.*",
      "friends.ref.*",
      "friends.metadata.sharedAnimal.*",
    ]);
    expect(result.table).toBe(humanTable);

    expectRef(result, "favoriteAnimal", animalTable, hFavAnimalField);
    expectLeaf(result, "favoriteAnimal.name", aNameField);

    expectRef(result, "bestFriend", humanTable, hBfField);
    expectLeaf(result, "bestFriend.name", hNameField);
    expectLeaf(result, "bestFriend.favoriteAnimal", hFavAnimalField);
    expectLeaf(result, "bestFriend.bestFriend", hBfField);
    expectLeaf(result, "bestFriend.friends", hFriendsField);

    expectRef(result, "friends>ref", humanTable, hFriendsField, ["ref"]);
    expectLeaf(result, "friends>ref.name", hNameField);
    expectLeaf(result, "friends>ref.favoriteAnimal", hFavAnimalField);
    expectLeaf(result, "friends>ref.bestFriend", hBfField);
    expectLeaf(result, "friends>ref.friends", hFriendsField);

    expectRef(
      result,
      "friends>metadata>sharedAnimal",
      animalTable,
      hFriendsField,
      ["metadata", "sharedAnimal"]
    );
    expectLeaf(result, "friends>metadata>sharedAnimal.name", aNameField);
  });

  it("returns ref field nested in list->object", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "friends.metadata.sharedAnimal.name",
    ]);
    expect(result.table).toBe(humanTable);
  });

  it("returns nested fields within maximum depth", async () => {
    const result = await makeSelectionTree(tableCache, humanTable, [
      "bestFriend.bestFriend.bestFriend.name",
      "friends.ref.friends.ref.friends.ref.name",
    ]);
    expect(result.table).toBe(humanTable);
    expectLeaf(result, "bestFriend.bestFriend.bestFriend.name", hNameField);
    expectLeaf(result, "friends>ref.friends>ref.friends>ref.name", hNameField);
  });

  it("errors past maximum depth", async () => {
    await expect(
      makeSelectionTree(tableCache, humanTable, [
        "bestFriend.bestFriend.bestFriend.bestFriend.name",
      ])
    ).toReject();
    await expect(
      makeSelectionTree(tableCache, humanTable, [
        "friends.ref.friends.ref.friends.ref.friends.ref.name",
      ])
    ).toReject();
  });

  it("errors on invalid field name", async () => {
    await expect(
      makeSelectionTree(tableCache, humanTable, ["fakeFieldName"])
    ).toReject();
  });

  it("errors on invalid field name in nested field", async () => {
    await expect(
      makeSelectionTree(tableCache, humanTable, ["friends.fakeNestedFieldName"])
    ).toReject();
  });
});

function expectLeaf(
  root: RootSelection,
  fieldPath: string,
  field: CmsFieldMeta
): void {
  const leaf = getSelection(root, fieldPath);
  expect(leaf).toEqual({ type: "leaf", field });
}

function expectRef(
  root: RootSelection,
  fieldPath: string,
  table: CmsTable,
  field: CmsFieldMeta,
  nestedFieldPath: string[] = []
): void {
  const ref = getSelection(root, fieldPath);
  expect(ref).toEqual({
    type: "ref",
    field,
    nestedFieldPath,
    table,
    fields: expect.any(Map),
  });
}

/**
 * First splits by ".", then splits by ">".
 * Use ">" to refer to nested refs.
 */
function getSelection(
  root: RootSelection,
  fieldPath: string
): LeafSelection | RefSelection {
  let cur: RootSelection | LeafSelection | RefSelection = root;
  for (const field of fieldPath.split(".")) {
    cur = (cur as RootSelection).fields.get(field.replaceAll(">", "."))!;
  }
  return cur as LeafSelection | RefSelection;
}
