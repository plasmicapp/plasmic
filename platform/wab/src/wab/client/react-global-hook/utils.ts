import {
  ExtraSlotCanvasEnvData,
  RenderingCtx,
} from "@/wab/client/components/canvas/canvas-rendering";
import { Fiber } from "@/wab/client/react-global-hook/fiber";
import {
  GlobalHookCtx,
  SlotArgsData,
} from "@/wab/client/react-global-hook/types";
import {
  classNameProp,
  dataCanvasEnvsProp,
  frameUidProp,
  plasmicClonedIndex,
  renderingCtxProp,
  richTextProp,
  slotArgCompKeyProp,
  slotArgParamProp,
  slotExtraCanvasEnvProp,
  slotFragmentKey,
  slotPlaceholderAttr,
  valKeyProp,
  valOwnerProp,
} from "@/wab/shared/canvas-constants";
import { ensure, structuralMerge2, switchType } from "@/wab/shared/common";
import {
  isCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { isTplTextBlock } from "@/wab/shared/core/tpls";
import {
  ValComponent,
  ValNode,
  ValSlot,
  ValTag,
  ValTagParams,
  ValTextTag,
} from "@/wab/shared/core/val-nodes";
import {
  RichText,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import { isString } from "lodash";

function hasKey(v: any, key: string) {
  return typeof v === "object" && v !== null && key in v;
}

const tryReadInternalProp = (
  node: Fiber,
  propName: string
): string | undefined => {
  if (
    hasKey(node.memoizedProps, propName) &&
    isString(node.memoizedProps[propName])
  ) {
    return node.memoizedProps[propName];
  }
  if (isString(node.key) && node.key.startsWith(slotFragmentKey)) {
    const attrs = (() => {
      try {
        return JSON.parse(node.key.slice(slotFragmentKey.length));
      } catch {
        throw new Error("Failed to parse key: " + node.key);
      }
    })();
    if (hasKey(attrs, propName) && isString(attrs[propName])) {
      return attrs[propName];
    }
  }
  return undefined;
};

export function mergeArgsData(
  obj1: Record<string, SlotArgsData>,
  obj2: Record<string, SlotArgsData>
) {
  return structuralMerge2(obj1, obj2);
}

export const tryGetValKey = (node: Fiber): string | undefined =>
  tryReadInternalProp(node, valKeyProp);
export const tryGetOwnerKey = (node: Fiber): string | undefined =>
  tryReadInternalProp(node, valOwnerProp);
export const tryGetPlasmicClassName = (node: Fiber): string | undefined =>
  tryReadInternalProp(node, classNameProp);
export const tryGetSlotCompKey = (node: Fiber): string | undefined =>
  tryReadInternalProp(node, slotArgCompKeyProp);
export const tryGetSlotParam = (node: Fiber): string | undefined =>
  tryReadInternalProp(node, slotArgParamProp);
export const tryGetSlotPlaceholderKey = (node: Fiber): string | undefined =>
  tryReadInternalProp(node, slotPlaceholderAttr);
export const tryGetFrameUid = (node: Fiber): number | undefined => {
  if (hasKey(node.memoizedProps, frameUidProp)) {
    return node.memoizedProps[frameUidProp] as number;
  }
  return undefined;
};

export const tryGetRenderingCtx = (node: Fiber): RenderingCtx | undefined => {
  if (hasKey(node.memoizedProps, renderingCtxProp)) {
    return node.memoizedProps[renderingCtxProp] as RenderingCtx;
  }
  return undefined;
};

export const tryGetSlotCanvasEnv = (
  node: Fiber
): ExtraSlotCanvasEnvData | undefined => {
  if (hasKey(node.memoizedProps, slotExtraCanvasEnvProp)) {
    return node.memoizedProps[slotExtraCanvasEnvProp] as ExtraSlotCanvasEnvData;
  }
  return undefined;
};

export const tryGetCloneIndex = (node: Fiber): number | undefined => {
  if (hasKey(node.memoizedProps, plasmicClonedIndex)) {
    return +node.memoizedProps[plasmicClonedIndex];
  }
  return undefined;
};

export function tryGetRichTextData(node: Fiber):
  | {
      text: RichText;
      handle: { enterEdit: () => string | undefined; exitEdit: () => void };
    }
  | undefined {
  if (hasKey(node.memoizedProps, richTextProp)) {
    return node.memoizedProps[richTextProp];
  }
  return undefined;
}

function tryGetEnvFromId(
  globalHookCtx: GlobalHookCtx,
  id: string | undefined | null
) {
  return id != null
    ? ensure(
        globalHookCtx.envIdToEnvs
          .get(ensure(id, () => `Missing canvas env props`))
          ?.deref(),
        () => `Couldn't find envs`
      )
    : undefined;
}

export function tryGetNodeCanvasEnvs(
  globalHookCtx: GlobalHookCtx,
  node: Fiber
) {
  const id = tryReadInternalProp(node, dataCanvasEnvsProp);
  return tryGetEnvFromId(globalHookCtx, id);
}

export function tryGetEnvFromFullKey(
  globalHookCtx: GlobalHookCtx,
  fullKey: string
) {
  const id = globalHookCtx.fullKeyToEnvId.get(fullKey);
  return tryGetEnvFromId(globalHookCtx, id);
}

export function tryGetSlotArgInfo(node: Fiber) {
  // A real node passed in as a slot arg
  const slotTplCompKey = tryGetSlotCompKey(node);
  const slotParamUuid = tryGetSlotParam(node);
  if (slotTplCompKey && slotParamUuid) {
    return { slotTplCompKey, slotParamUuid };
  }

  // A placeholder node
  const slotPlaceholderKey = tryGetSlotPlaceholderKey(node);
  if (slotPlaceholderKey) {
    const split = slotPlaceholderKey.split("~");
    return { slotTplCompKey: split[0], slotParamUuid: split[1] };
  }

  return { slotTplCompKey: undefined, slotParamUuid: undefined };
}

export function createValNode(opts: {
  globalHookCtx: GlobalHookCtx;
  node: Fiber;
  tplNode: TplNode;
  instanceKey: string;
  fullKey: string;
  valOwner: ValComponent | undefined;
  className: string | undefined;
  frameUid: number;
  useFullKeyForEnv?: boolean;
}) {
  const {
    globalHookCtx,
    node,
    tplNode,
    instanceKey,
    fullKey,
    valOwner,
    className,
    frameUid,
  } = opts;
  const commonValNodeParams = {
    key: instanceKey,
    fullKey,
    valOwner,
    className,
    frameUid: ensure(frameUid, () => `Couldn't find frame UID`),
    fibers: [node],
    parent: undefined,
    slotInfo: undefined,
  };

  const valNode: ValNode = switchType(tplNode)
    .when(TplTag, (tplTag) => {
      const params: ValTagParams = {
        ...commonValNodeParams,
        tpl: tplTag,
        children: [],
        className: ensure(
          className,
          () => `Couldn't get className for ValTag ${fullKey}`
        ),
      };
      if (isTplTextBlock(tplTag)) {
        // richTextData may be undefined if node was not successfully rendered
        const richTextData = tryGetRichTextData(node);
        return new ValTextTag({
          ...params,
          ...richTextData,
          tpl: tplTag,
        });
      }
      return new ValTag(params);
    })
    .when(
      TplComponent,
      (tplComponent) =>
        new ValComponent({
          ...commonValNodeParams,
          slotArgs: new Map(),
          tpl: tplComponent,
          className: ensure(
            className,
            () => `Couldn't get className for ValComponent ${fullKey}`
          ),
          slotCanvasEnvs: new Map(),
        })
    )
    .when(
      TplSlot,
      (tplSlot) =>
        new ValSlot({
          ...commonValNodeParams,
          tpl: tplSlot,
          contents: [],
        })
    )
    .result();

  const envs = opts.useFullKeyForEnv
    ? tryGetEnvFromFullKey(globalHookCtx, fullKey)
    : tryGetNodeCanvasEnvs(globalHookCtx, node);

  if (envs) {
    valNode.envs = envs;
  }
  if (
    valNode instanceof ValComponent &&
    (isCodeComponent(valNode.tpl.component) ||
      isPlumeComponent(valNode.tpl.component))
  ) {
    valNode.codeComponentProps = node.memoizedProps;
    if (node.memoizedProps["className"]?.includes("__wab_error-display")) {
      // This is an error display, so we try to recover the props from the actual
      // node props we were trying to render.  It is stored as a prop to the
      // CanvasErrorBoundary, which is a _parent_ of this node.
      // We want to recover the node props even with a rendering error, because
      // the component's controls may depend on the node props.
      const nodeProps = node.return?.memoizedProps?.nodeProps;
      if (nodeProps) {
        valNode.codeComponentProps = nodeProps;
      }
    }
  }
  return valNode;
}

export const mkFrameValKeyToContextDataKey = (
  frameUid: number,
  valKey: string
) => `${frameUid}.${valKey}`;
