import { CmsRow } from "@/wab/server/entities/Entities";
import {
  getConflictingCmsRowIds,
  traverseSchemaFields,
} from "@/wab/server/util/cms-util";
import {
  CmsFieldMeta,
  CmsRowData,
  CmsRowId,
  CmsTableId,
  UserId,
} from "@/wab/shared/ApiSchema";
import { getDefaultLocale } from "@/wab/shared/cms";
import { Dict } from "@/wab/shared/collections";
import { cloneDeep, Dictionary } from "lodash";

const createField = (
  identifier: string,
  type: any,
  fields?: CmsFieldMeta[],
  override?: Partial<CmsFieldMeta>
): CmsFieldMeta => ({
  identifier,
  name: identifier,
  type,
  helperText: "",
  required: false,
  hidden: false,
  localized: false,
  defaultValueByLocale: {},
  fields: fields || [],
  ...override,
});

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

const createData = (...args: string[]): Dict<unknown> => ({
  field1: args[0],
  field2: args[1],
  field3: args[2],
});

const createRowData = (...args: string[]): CmsRowData =>
  ({
    "": createData(...args),
  } as CmsRowData);

const addLocaleData = (
  row: CmsRow,
  localeData: Dict<unknown>,
  locale: string
) => {
  if (row.data) {
    row.data = { ...row.data, [locale]: localeData } as CmsRowData;
  }
};

const createRow = (id: CmsRowId, data?: CmsRowData): CmsRow => ({
  id: id,
  identifier: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdById: "null" as UserId,
  createdBy: null,
  updatedById: "null" as UserId,
  updatedBy: null,
  deletedById: "null" as UserId,
  deletedBy: null,
  tableId: "null" as CmsTableId,
  table: null,
  rank: "",
  data: data || null,
  draftData: null,
  revision: 0,
  toJSON: function (): Dictionary<any> {
    throw new Error("Function not implemented.");
  },
  validate: function (): Promise<void> {
    throw new Error("Function not implemented.");
  },
});

function generateAllFieldUniqueRows(number: number) {
  const dummyRows: CmsRow[] = [];
  for (let i = 0; i < number; i++) {
    const args: string[] = [];
    for (let j = 0; j < 3; j++) {
      args.push(String(3 * i + j));
    }
    dummyRows.push(createRow(String(i) as CmsRowId, createRowData(...args)));
  }
  return dummyRows;
}

function getRandomIndex(range: number) {
  return Math.floor(Math.random() * range);
}

function getDefaultLocaleFieldValue(row: CmsRow, fieldIdentifier: string) {
  return getDefaultLocale(row.data as CmsRowData)[fieldIdentifier];
}

describe("getConflictingCmsRowIds", () => {
  let publishedRows = generateAllFieldUniqueRows(100);

  it("should ignore the current checking row in the published rows", () => {
    const randomRow = publishedRows[getRandomIndex(publishedRows.length)];
    const fieldIdentifier = "field1";
    const fieldValue = getDefaultLocaleFieldValue(randomRow, fieldIdentifier);
    const result = getConflictingCmsRowIds(
      publishedRows,
      randomRow.id,
      fieldIdentifier,
      fieldValue
    );
    expect(result).toEqual([]);
  });

  it("should only check default locale data", () => {
    const localeData = createData("locale1", "locale2", "locale3");
    publishedRows.forEach((row) => addLocaleData(row, localeData, "US"));
    const randomRow = publishedRows[getRandomIndex(publishedRows.length)];
    const fieldIdentifier = "field1";
    const fieldValue = getDefaultLocaleFieldValue(randomRow, fieldIdentifier);
    const result = getConflictingCmsRowIds(
      publishedRows,
      randomRow.id,
      fieldIdentifier,
      fieldValue
    );
    expect(result).toEqual([]);
  });

  it("should return all of the conflicting rows", () => {
    publishedRows = generateAllFieldUniqueRows(100);

    for (let i = 0; i < 20; i++) {
      for (let j = 1; j < 5; j++) {
        // The initial set of 20 rows data is repeated every 20 rows.
        publishedRows[20 * j + i].data = cloneDeep(publishedRows[i].data);
      }
    }
    const randomRow =
      publishedRows[Math.floor(Math.random() * publishedRows.length)];
    const fieldIdentifier = "field1";
    const fieldValue = getDefaultLocaleFieldValue(randomRow, fieldIdentifier);
    const result = getConflictingCmsRowIds(
      publishedRows,
      randomRow.id,
      fieldIdentifier,
      fieldValue
    );
    expect(result.length).toEqual(4);
  });
});
