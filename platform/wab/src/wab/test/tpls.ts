import { ensureInstance, switchType } from "@/wab/shared/common";
import { SlotInfo } from "@/wab/shared/eval/val-state";
import {
  ensureKnownRenderExpr,
  Param,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import { isSlot } from "@/wab/shared/SlotUtils";
import { mkBaseVariant } from "@/wab/shared/Variants";
import { mkTplInlinedText } from "@/wab/shared/core/tpls";
import {
  ValComponent,
  ValNode,
  ValSlot,
  ValTag,
  writeableValNode,
} from "@/wab/shared/core/val-nodes";

export const TEST_GLOBAL_VARIANT = mkBaseVariant();

export function mkTplTestText(text: string) {
  return mkTplInlinedText(text, [TEST_GLOBAL_VARIANT]);
}

export const renderStateForTests = {
  _key2val: new Map<string, ValNode>(),
  key2val(key: string) {
    return this._key2val.get(key);
  },
};

export function buildValTree(root: TplComponent) {
  return evalTpl(root, { owner: undefined, valKey: "", slots: new Map() });
}

interface EvalCtxForTests {
  slots: Map<Param, ValNode[]>;
  valKey: string;
  owner: ValComponent | undefined;
}

// Always evaluates the first VariantSetting (doesn't support variants)
function evalTpl(tpl: TplComponent, ctx: EvalCtxForTests): ValComponent;
function evalTpl(tpl: TplTag, ctx: EvalCtxForTests): ValTag;
function evalTpl(tpl: TplSlot, ctx: EvalCtxForTests): ValSlot;
function evalTpl(tpl: TplNode, ctx: EvalCtxForTests): ValNode;
function evalTpl(tpl: TplNode, ctx: EvalCtxForTests): ValNode {
  const updatedKey = [ctx.valKey, tpl.uuid].filter(Boolean).join(".");
  const baseValParams = {
    className: "",
    fibers: [{}] as any,
    frameUid: 1,
    fullKey: updatedKey,
    key: updatedKey,
    parent: undefined,
    slotInfo: undefined,
    valOwner: ctx.owner,
  } as const;
  return switchType(tpl)
    .when(TplComponent, (tplComp): ValComponent => {
      const val = new ValComponent({
        ...baseValParams,
        slotArgs: new Map(),
        tpl: tplComp,
        slotCanvasEnvs: new Map(),
      });
      renderStateForTests._key2val.set(updatedKey, val);
      const slots = new Map(
        (tplComp.vsettings[0]?.args ?? [])
          .filter((arg) => isSlot(arg.param))
          .map((arg) => [
            arg.param,
            ensureKnownRenderExpr(arg.expr).tpl.map((child) =>
              evalTpl(child, { ...ctx, valKey: updatedKey })
            ),
          ])
      );
      const root = evalTpl(tplComp.component.tplTree, {
        owner: val,
        slots,
        valKey: updatedKey,
      });
      writeableValNode(val).contents = [root];
      writeableValNode(root).parent = val;
      [...slots.entries()].forEach(([param, nodes]) =>
        nodes.forEach((valChild) => {
          writeableValNode(valChild).slotInfo = new SlotInfo(
            param,
            ensureInstance(valChild.parent, ValSlot),
            val
          );
        })
      );
      writeableValNode(val).slotArgs = slots;
      return val;
    })
    .when(TplTag, (tplTag): ValTag => {
      const val = new ValTag({
        ...baseValParams,
        children: [],
        tpl: tplTag,
      });
      renderStateForTests._key2val.set(updatedKey, val);
      writeableValNode(val).children = tplTag.children.map((child) => {
        const valChild = evalTpl(child, { ...ctx, valKey: updatedKey });
        writeableValNode(valChild).parent = val;
        return valChild;
      });
      return val;
    })
    .when(TplSlot, (tplSlot): ValSlot => {
      const val = new ValSlot({
        ...baseValParams,
        contents: [],
        tpl: tplSlot,
      });
      renderStateForTests._key2val.set(updatedKey, val);
      writeableValNode(val).contents = (
        ctx.slots.get(tplSlot.param) ??
        tplSlot.defaultContents.map((child) =>
          evalTpl(child, { ...ctx, valKey: updatedKey })
        )
      ).map((valChild) => {
        writeableValNode(valChild).parent = val;
        return valChild;
      });
      return val;
    })
    .result();
}
