import { traverseSchemaFields } from "@/wab/server/util/cms-util";
import { CmsFieldMeta } from "@/wab/shared/ApiSchema";

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
