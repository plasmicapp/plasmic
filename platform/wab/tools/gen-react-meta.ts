// Note: AllHTMLAttributes in @types/react/index.d.ts is simply the union of all the element specific HTML attribute
// sets (div, form, img, etc.).  It's a less precise type used by certain "lossy" (less type specific) overrides of
// operations like cloneElement.

import * as fs from "fs";
import L from "lodash";
import { check } from "../src/wab/common";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const JS = require("JSONStream");

/**
 * Walk a JSON tree and return array of all non-Array Objects encountered.
 * @param tree
 * @return {any[]}
 */
function getObjs(tree: any) {
  const xs: any[] = [];
  function rec(obj: any) {
    if (obj.constructor === Array) {
      obj.forEach(rec);
    } else if (typeof obj === "object") {
      xs.push(obj);
      for (const key in obj) {
        rec(obj[key]);
      }
    }
  }
  rec(tree);
  return xs;
}

async function readTypedocJson(fileName: string) {
  try {
    return JSON.parse(fs.readFileSync(fileName).toString());
  } catch (e) {
    console.error("Error reading file", e);
    process.exit(1);
  }
}

async function main() {
  const pkg = process.argv[2];
  const fileName = process.argv[3];
  const json = await readTypedocJson(fileName);

  const allObjs = getObjs(json).filter((x) => x.id && x.type !== "reference");
  const idMap = new Map(allObjs.map((x) => [x.id, x] as [number, any]));
  // Note: names are not unique.
  const nameMap = new Map(
    [...idMap.values()].map((x) => [x.name, x] as [string, any])
  );
  const parentMap = new Map<number, any>();
  for (const x of idMap.values()) {
    for (const child of x.children || []) {
      parentMap.set(child.id, x);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getParent = (x: any) => parentMap.get(x.id);
  const getById = (id: number) => idMap.get(id);
  const reflect = (x: any) => getById(x.id);
  const getByName = (name: string) => nameMap.get(name);

  /**
   * Returns types from leaf to root of ancestry (so HTMLAttributes come
   * last, if they're an ancestor).
   *
   * TODO Currently only crawls up a class hierarchy.
   */
  function getAncestorTypes(type: any): any[] {
    if (type.children) {
      check(["Type literal", "Interface", "Class"].includes(type.kindString));
      return [type];
    } else if (type.kindString === "Type alias") {
      return getAncestorTypes(type.type);
    } else if (type && type.type == "intersection") {
      let res: any[] = [];
      for (const interArg of type.types) {
        if (interArg.name === "Readonly") {
          for (const arg of interArg.typeArguments) {
            res = res.concat(getAncestorTypes(reflect(arg) || arg));
          }
        } else {
          res = res.concat(getAncestorTypes(reflect(interArg)));
        }
      }
      return res;
    } else if (type && type.type == "reflection") {
      // Only process the special type literal corresponding to the children class.
      if (
        type.declaration.sources &&
        type.declaration.sources.length === 1 &&
        type.declaration.sources[0] &&
        type.declaration.sources[0].fileName ===
          "sub/node_modules/@types/react/index.d.ts" &&
        type.declaration &&
        type.declaration.children &&
        type.declaration.children.length === 1 &&
        type.declaration.children[0] &&
        type.declaration.children[0].name === "children"
      ) {
        return getAncestorTypes(type.declaration);
      } else {
        return [];
      }
    } else if (type && type.type === "reference") {
      return getAncestorTypes(reflect(type));
    } else {
      throw new Error();
    }
  }

  // eslint-disable-next-line no-shadow
  function genPkgMeta(pkg: string, pkgPathPattern: RegExp) {
    // TODO Currently only processes classes descending from React.Component.
    // Does not handle ComponentClass objects.
    const components = allObjs.filter(
      (x) =>
        x.kindString === "Class" &&
        x.sources[0].fileName.match(pkgPathPattern) &&
        (x.extendedTypes || []).find((t: any) => t.name === "Component")
    );
    for (const comp of components) {
      console.log(comp.name, comp.sources[0].fileName);
    }
    const outMeta: any[] = [];
    for (const c of components) {
      for (const child of c.children) {
        if (child.name === "props") {
          let types: any[] = [];

          try {
            types = getAncestorTypes(child.type);
          } catch (e) {}
          const props: any[] = [];
          for (const type of types) {
            // TODO we are only admitting children props of the standard HTMLProps
            for (const field of type.children) {
              if (
                field.kindString == "Property" ||
                field.kindString === "Variable"
              ) {
                props.push(field);
              }
            }
          }
          // children is a default prop specified directly on
          // Component.props.  It may be overridden later with e.g. a
          // `never` type, but it's there by default for all components.
          props.push({
            name: "children",
            type: { name: "ReactNode" },
          });

          const cleanProps: any[] = L(props)
            .uniqBy((p) => p.name)
            .sortBy((p) => p.name)
            .value();

          outMeta.push({
            component: c.name,
            props: cleanProps.map((p) => ({
              name: p.name,
              type: p.type.name,
              origin: (p.inheritedFrom || { name: undefined }).name,
            })),
          });
        }
      }
    }
    const sortedMeta = L.sortBy(outMeta, (x) => x.component);
    fs.writeFileSync(
      "src/wab/shared/foreign-components/foreign-react-" + pkg + "-gen.ts",
      genSource(sortedMeta)
    );
  }

  if (pkg === "react") {
    // IntrinsicElements is where HTML tag props are defined.
    const outElts: any[] = [];
    for (const elt of getByName("IntrinsicElements").children) {
      const propType = reflect(
        elt.type.name === "SVGProps" ? elt.type : elt.type.typeArguments[0]
      );
      const outProps: any[] = [];
      for (const prop of propType.children) {
        if (prop.kindString === "Property") {
          outProps.push({
            name: prop.name,
            type: prop.type.name,
            origin: (prop.inheritedFrom || { name: null }).name,
          });
        }
      }
      outElts.push({
        component: elt.name,
        props: outProps,
      });
    }

    fs.writeFileSync(
      "src/wab/component-metas/react-meta-gen.ts",
      genSource(outElts)
    );
  } else if (pkg === "bootstrap") {
    genPkgMeta("bootstrap", /\/react-bootstrap\//);
  } else if (pkg === "antd") {
    genPkgMeta("antd", /^antd\//);
  } else if (pkg === "router") {
    genPkgMeta("router", /\/(react-router-dom|react-router)\//);
  } else if (pkg === "fetch") {
    genPkgMeta("fetch", /^react-fetch-component\//);
  }
}

function genSource(data: any) {
  return (
    "export const componentMetasStr = `" + JSON.stringify(data, null, 2) + "`;"
  );
}

main();
