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
import { Dictionary } from "lodash";

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

describe("getConflictingCmsRowIds", () => {
  const id1 = "1" as CmsRowId;
  const id2 = "2" as CmsRowId;
  const id3 = "3" as CmsRowId;

  it("should ignore the current checking row and only check default locale data", () => {
    const rows = [
      createRow(id1, { "": { field: 1 }, us: { field: 4 } }),
      createRow(id2, { "": { field: 2 }, us: { field: 4 } }),
      createRow(id3, { "": { field: 3 }, us: { field: 4 } }),
    ];

    expect(getConflictingCmsRowIds(rows, id1, "field", 1)).toEqual([]);
    expect(getConflictingCmsRowIds(rows, id1, "field", 2)).toEqual([id2]);
    expect(getConflictingCmsRowIds(rows, id1, "field", 3)).toEqual([id3]);
    expect(getConflictingCmsRowIds(rows, id1, "field", 4)).toEqual([]);

    expect(getConflictingCmsRowIds(rows, id2, "field", 1)).toEqual([id1]);
    expect(getConflictingCmsRowIds(rows, id2, "field", 2)).toEqual([]);
    expect(getConflictingCmsRowIds(rows, id2, "field", 3)).toEqual([id3]);
    expect(getConflictingCmsRowIds(rows, id2, "field", 4)).toEqual([]);

    expect(getConflictingCmsRowIds(rows, id3, "field", 1)).toEqual([id1]);
    expect(getConflictingCmsRowIds(rows, id3, "field", 2)).toEqual([id2]);
    expect(getConflictingCmsRowIds(rows, id3, "field", 3)).toEqual([]);
    expect(getConflictingCmsRowIds(rows, id3, "field", 4)).toEqual([]);
  });

  it("should return all of the conflicting rows", () => {
    const rows: CmsRow[] = [];
    rows.push(createRow(id1, { "": { field: 1 } }));
    rows.push(createRow(id2, { "": { field: 1 } }));
    rows.push(createRow(id3, { "": { field: 1 } }));
    expect(getConflictingCmsRowIds(rows, id1, "field", 1)).toEqual([id2, id3]);
  });

  it("should only check the requested field", () => {
    const rows: CmsRow[] = [];
    rows.push(createRow(id1, { "": { field1: 1, field2: 2 } }));
    rows.push(createRow(id2, { "": { field1: 2, field2: 1 } }));
    rows.push(createRow(id3, { "": { field1: 2, field2: 2 } }));
    expect(getConflictingCmsRowIds(rows, id3, "field1", 1)).toEqual([id1]);
    expect(getConflictingCmsRowIds(rows, id3, "field2", 1)).toEqual([id2]);
  });
});
