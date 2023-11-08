import GraphiQLExplorer from "graphiql-explorer";
import type {
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputField,
  GraphQLOutputType,
  GraphQLScalarType,
  ValueNode,
} from "graphql";
import { isEnumType, isWrappingType } from "graphql";

function unwrapOutputType(outputType: GraphQLOutputType): any {
  let unwrappedType = outputType;
  while (isWrappingType(unwrappedType)) {
    unwrappedType = unwrappedType.ofType;
  }
  return unwrappedType;
}

export function makeDefaultArg(
  parentField: GraphQLField<any, any>,
  arg: GraphQLArgument | GraphQLInputField
): boolean {
  const unwrappedType = unwrapOutputType(parentField.type);
  if (
    unwrappedType.name.startsWith("GitHub") &&
    unwrappedType.name.endsWith("Connection") &&
    (arg.name === "first" || arg.name === "orderBy")
  ) {
    return true;
  }
  return false;
}

export function getDefaultScalarArgValue(
  parentField: GraphQLField<any, any>,
  arg: GraphQLArgument | GraphQLInputField,
  argType: GraphQLEnumType | GraphQLScalarType
): ValueNode {
  const unwrappedType = unwrapOutputType(parentField.type);
  switch (unwrappedType.name) {
    case "GitHubRepository":
      if (arg.name === "name") {
        return { kind: "StringValue", value: "graphql-js" };
      } else if (arg.name === "owner") {
        return { kind: "StringValue", value: "graphql" };
      }
      break;
    case "NpmPackage":
      if (arg.name === "name") {
        return { kind: "StringValue", value: "graphql" };
      }
      break;
    default:
      if (
        isEnumType(argType) &&
        unwrappedType.name.startsWith("GitHub") &&
        unwrappedType.name.endsWith("Connection")
      ) {
        if (
          arg.name === "direction" &&
          argType
            .getValues()
            .map((x) => x.name)
            .includes("DESC")
        ) {
          return { kind: "EnumValue", value: "DESC" };
        } else if (
          arg.name === "field" &&
          argType
            .getValues()
            .map((x) => x.name)
            .includes("CREATED_AT")
        ) {
          return { kind: "EnumValue", value: "CREATED_AT" };
        }
      }
      return GraphiQLExplorer.defaultValue(argType);
  }
  return GraphiQLExplorer.defaultValue(argType);
}
