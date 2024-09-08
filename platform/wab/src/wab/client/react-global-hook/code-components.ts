import { GlobalHookCtx } from "@/wab/client/react-global-hook/types";
import { mkFrameValKeyToContextDataKey } from "@/wab/client/react-global-hook/utils";
import { isPlainObjectPropType } from "@/wab/shared/code-components/code-components";
import { hackyCast, withoutNils } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { isTplComponent } from "@/wab/shared/core/tpls";
import {
  InvalidArgMeta,
  ValNode,
  ValidationType,
  isValComponent,
} from "@/wab/shared/core/val-nodes";
import { TplNode } from "@/wab/shared/model/classes";

export function validateCodeComponentParams(opts: {
  globalHookCtx: GlobalHookCtx;
  frameUid: number | undefined;
  instanceKey: string;
  tplNode: TplNode;
  valNode: ValNode;
}) {
  const { globalHookCtx, frameUid, instanceKey, tplNode, valNode } = opts;
  if (
    isTplComponent(tplNode) &&
    isCodeComponent(tplNode.component) &&
    tplNode.component._meta &&
    isValComponent(valNode)
  ) {
    const meta = tplNode.component._meta;
    const ccContextData = frameUid
      ? globalHookCtx.frameValKeyToContextData.get(
          mkFrameValKeyToContextDataKey(frameUid, instanceKey)
        )
      : undefined;
    const invalidArgs: InvalidArgMeta[] = withoutNils(
      tplNode.component.params.map((p) => {
        const propType = meta.props[p.variable.name];
        if (!isPlainObjectPropType(propType)) {
          return undefined;
        }
        if (
          "required" in propType &&
          propType.required &&
          valNode.codeComponentProps[p.variable.name] == null
        ) {
          return {
            param: p,
            validationType: ValidationType.Required,
          };
        }
        if ("validator" in propType && propType.validator) {
          const res = hackyCast(propType).validator(
            valNode.codeComponentProps[p.variable.name],
            valNode.codeComponentProps,
            ccContextData,
            { path: [p.variable.name] }
          );
          if (res !== true) {
            return {
              param: p,
              validationType: ValidationType.Custom,
              message: res,
            };
          }
        }
        return undefined;
      })
    );
    if (invalidArgs.length > 0) {
      valNode.invalidArgs = invalidArgs;
    }
  }
}
