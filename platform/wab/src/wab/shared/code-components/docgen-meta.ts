// import * as parser from "@babel/parser";
// import { TSTypeAnnotation } from "@babel/types/lib";
// import L from "lodash";
// import { ComponentDoc, PropItem, PropItemType } from "react-docgen-typescript";
// import { ArgType, Component, Param, Site, Type } from "../../classes";
// import { tuple } from "../../common";
// import { isCodeComponent, removeComponentParam } from "../../components";
// import { ComponentPropOrigin, mkParam } from "../../lang";
// import { isRenderFuncType, typeFactory } from "../core/model-util";
// import { attachRenderableTplSlots } from "./code-components";

export interface PropEnumValueItem {
  value: string;
}

/*
export function reactDocgenPropItemToParam(
  propItem: PropItem
): Param | undefined {
  const r = reactDocgenTypeToWabType(propItem.name, propItem.type);
  if (!r) {
    return undefined;
  }
  const origin = propItem.parent?.fileName.endsWith(
    "node_modules/@types/react/index.d.ts"
  )
    ? ComponentPropOrigin.ReactHTMLAttributes
    : undefined;
  const rawType = propItem.type.raw;
  const fullDescription = rawType
    ? `Raw type: ${rawType}.\n${propItem.description}`
    : propItem.description;

  if (L.isArray(r)) {
    const [type, values] = r;
    return mkParam({
      name: propItem.name,
      type,
      enumValues: values,
      origin,
      description: fullDescription,
      required: propItem.required,
    });
  } else {
    return mkParam({
      name: propItem.name,
      type: r,
      origin,
      description: fullDescription,
      required: propItem.required,
    });
  }
}

function reactDocgenTypeToWabType(
  propName: string,
  t: PropItemType
): undefined | Type | [Type, (string | number | boolean)[]] {
  if (propName.startsWith("on")) {
    // We model function type to boolean, to indicate whether it is set or not.
    // The value is always an empty function.
    return typeFactory.bool();
  }
  if (t.name !== "enum") {
    if (isRenderableTsType(t.name)) {
      return typeFactory.renderable();
    }
    if (t.name === "string") {
      return typeFactory.text();
    }
    if (t.name === "number") {
      return typeFactory.num();
    }
    if (t.name === "boolean") {
      return typeFactory.bool();
    }
    if (t.name === "any" || t.name === "unknown") {
      return typeFactory.any();
    }
    return undefined;
  }
  const values = t.value as PropEnumValueItem[];
  const hasType = (typeName: string) => {
    return !!values.find((item) => item.value === typeName);
  };

  // Sometimes the ReactNode is flattened, for example, NonNull<ReactNode>.
  if (
    t.raw === "ReactNode" ||
    hasType("ReactNode") ||
    !!values.find((item) => item.value.startsWith("ReactElement<")) ||
    (hasType("ReactNodeArray") && hasType("ReactPortal"))
  ) {
    return typeFactory.renderable();
  }
  if (hasType("string")) {
    return typeFactory.text();
  }
  if (hasType("number")) {
    return typeFactory.num();
  }
  if (hasType("boolean")) {
    return typeFactory.bool();
  }

  const funcLikeValue = values.find((item) => item.value.includes("=>"));
  if (funcLikeValue) {
    const funcType = parseTsRenderFuncType(funcLikeValue.value);
    if (funcType && isRenderFuncType(funcType)) {
      return funcType;
    }
  }

  // no type in enum. Try parse as primitive enums.
  const tryParseJson = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const parsed = values
    .map((v) => tryParseJson(v.value))
    .filter((v) => v != null);
  if (parsed.length === 0) {
    return undefined;
  }
  if (parsed.every((item) => L.isString(item))) {
    return tuple(typeFactory.text(), parsed as string[]);
  }
  if (parsed.every((item) => L.isNumber(item))) {
    return tuple(typeFactory.num(), parsed as number[]);
  }
  // "boolean | undefined" is generated as "true | false | undefined"
  if (parsed.every((v) => L.isBoolean(v))) {
    return typeFactory.bool();
  }

  if (
    parsed.every(
      (item) => L.isNumber(item) || L.isString(item) || L.isBoolean(item)
    )
  ) {
    return tuple(typeFactory.any(), parsed as (number | string | boolean)[]);
  }

  return typeFactory.any();
}

function parseTsRenderFuncType(typeStr: string) {
  try {
    const res = parser.parse(`type x = ${typeStr};`, {
      strictMode: false,
      plugins: ["jsx", "typescript"],
    }).program.body[0];
    if (
      !res ||
      res.type !== "TSTypeAliasDeclaration" ||
      res.typeAnnotation.type !== "TSFunctionType"
    ) {
      return undefined;
    }
    const funcNode = res.typeAnnotation;

    const typeNodeToType = (node: TSTypeAnnotation) => {
      if (node.typeAnnotation.type === "TSStringKeyword") {
        return typeFactory.text();
      } else if (node.typeAnnotation.type === "TSNumberKeyword") {
        return typeFactory.num();
      } else if (node.typeAnnotation.type === "TSTypeReference") {
        const typeName = node.typeAnnotation.typeName;
        if (
          typeName.type === "Identifier" &&
          isRenderableTsType(typeName.name)
        ) {
          return typeFactory.renderable();
        }
      }
      return typeFactory.any();
    };

    const funcParams: ArgType[] = [];
    const pushFuncParam = (type: Type) => {
      funcParams.push(typeFactory.arg(`param${funcParams.length}`, type));
    };
    for (const param of funcNode.parameters) {
      if (
        param.type === "Identifier" &&
        param.typeAnnotation?.type === "TSTypeAnnotation"
      ) {
        pushFuncParam(typeNodeToType(param.typeAnnotation));
      } else {
        pushFuncParam(typeFactory.any());
      }
    }

    if (funcNode.typeAnnotation?.type === "TSTypeAnnotation") {
      pushFuncParam(typeNodeToType(funcNode.typeAnnotation));
    } else {
      pushFuncParam(typeFactory.any());
    }

    return typeFactory.func(...funcParams);
  } catch {
    return undefined;
  }
}

function isRenderableTsType(typeStr: string) {
  return typeStr === "ReactNode" || typeStr.startsWith("ReactElement<");
}
*/

/*
export function createCodeComponentFromDocInfo(
  compInfo: ComponentDoc,
  extraMeta?: ExtraComponentMeta
) {
  const params = withoutNils(
    Object.entries(compInfo.props).map(([propName, propInfo]) =>
      reactDocgenPropItemToParam(propInfo)
    )
  );
  const name = compInfo.displayName;
  return createCodeComponent(name, params, undefined, extraMeta);
}
*/

/*
export function updateCodeComponent(
  site: Site,
  component: Component,
  compInfo: ComponentDoc
) {
  for (const [propName, propInfo] of Object.entries(compInfo.props)) {
    const existingParam = component.params.find(
      (p) => p.variable.name === propName
    );
    const newParam = reactDocgenPropItemToParam(propInfo);
    if (newParam) {
      if (existingParam) {
        existingParam.type = newParam.type;
        existingParam.enumValues = newParam.enumValues;
        existingParam.origin = newParam.origin;
        existingParam.description = newParam.description;
        existingParam.required = newParam.required;
      } else {
        component.params.push(newParam);
      }
    } else if (existingParam) {
      removeComponentParam(site, component, existingParam);
    }
  }

  if (isCodeComponent(component)) {
    attachRenderableTplSlots(component);
  }
}
*/
