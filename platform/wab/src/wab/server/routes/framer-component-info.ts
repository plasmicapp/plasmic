// This file is a mostly a copy of @framerjs/component-importer/src/analyze/extractPropTypes/types.ts.
export enum PropTypeName {
  boolean = "boolean",
  string = "string",
  color = "color",
  number = "number",
  enum = "enum",
  array = "array",
  reactNode = "reactNode",
  unsupported = "unsupported",
}
export type Primitive = string | boolean | number | undefined | null;
export type PropType =
  | {
      type: PropTypeName.boolean;
      name: string;
      defaultValue?: boolean;
    }
  | {
      type: PropTypeName.string;
      name: string;
      defaultValue?: string;
    }
  | {
      type: PropTypeName.color;
      name: string;
      defaultValue?: string;
    }
  | {
      type: PropTypeName.number;
      name: string;
      min?: number;
      max?: number;
      step?: number;
      defaultValue?: number;
    }
  | {
      type: PropTypeName.enum;
      name: string;
      possibleValues: Primitive[];
      defaultValue?: Primitive;
    }
  | {
      type: PropTypeName.array;
      name: string;
      of: PropType;
      defaultValue?: Primitive[];
    }
  | {
      type: PropTypeName.reactNode;
      name: string;
    }
  | {
      type: PropTypeName.unsupported;
      name: string;
    };
