import { makeGlobalContextPropName } from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  CodeComponent,
  ComponentType,
  mkComponent,
} from "@/wab/shared/core/components";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { CodeComponentMeta } from "@/wab/shared/model/classes";

function mkCodeComponent(name: string, meta: Partial<CodeComponentMeta>) {
  return mkComponent({
    name,
    type: ComponentType.Code,
    tplTree: mkTplTagX("div"),
    codeComponentMeta: {
      importPath: "./contexts",
      importName: null,
      defaultExport: false,
      ...meta,
    } as CodeComponentMeta,
  }) as CodeComponent;
}

describe("makeGlobalContextPropName", () => {
  it("normalizes import names that are not valid JS identifiers", () => {
    expect(
      makeGlobalContextPropName(
        mkCodeComponent("global-my-context", { importName: "my-context" })
      )
    ).toBe("myContextProps");
    expect(
      makeGlobalContextPropName(mkCodeComponent("global-my-context", {}))
    ).toBe("globalMyContextProps");
    expect(
      makeGlobalContextPropName(
        mkCodeComponent("global-my-context", {
          importName: "my-context",
          defaultExport: true,
        })
      )
    ).toBe("myContextProps");
  });

  it("leaves valid import names alone", () => {
    expect(
      makeGlobalContextPropName(
        mkCodeComponent("global-my-context", { importName: "MyContext" })
      )
    ).toBe("myContextProps");
    // Follows the import symbol, which falls back to the component name.
    expect(makeGlobalContextPropName(mkCodeComponent("my_context", {}))).toBe(
      "my_contextProps"
    );
  });

  it("prefers the alias", () => {
    const comp = mkCodeComponent("global-my-context", {
      importName: "my-context",
    });
    expect(
      makeGlobalContextPropName(comp, new Map([[comp, "MyContext2"]]))
    ).toBe("myContext2Props");
  });
});
