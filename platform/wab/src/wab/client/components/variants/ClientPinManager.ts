import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, mergeMaps, partitions, xpickBy } from "@/wab/shared/common";
import { PinManager, PinState, PinStateManager } from "@/wab/shared/PinManager";
import { isGlobalVariant } from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  ComponentVariantFrame,
  GlobalVariantFrame,
} from "@/wab/shared/component-frame";
import { Variant } from "@/wab/shared/model/classes";
import { ValComponent } from "@/wab/shared/core/val-nodes";
import L from "lodash";
import { computed } from "mobx";

/**
 * Returns the ClientPinManager for the current viewCtx state
 */
export function makeClientPinManager(viewCtx: ViewCtx) {
  const compFrame = viewCtx.currentComponentStackFrame();
  const globalFrame = viewCtx.globalFrame;
  return new ClientPinManager(
    compFrame,
    globalFrame,
    makeCurrentVariantEvalState(viewCtx)
  );
}

export function makeCurrentVariantEvalState(viewCtx: ViewCtx) {
  if (viewCtx.valState().maybeValSysRoot()) {
    const valComponent = ensure(
      L.last(viewCtx.valComponentStack()),
      () => `There is at least one ValComponent on the stack`
    );
    return makeVariantEvalState(viewCtx, valComponent);
  } else {
    return new Map<Variant, boolean>();
  }
}

export function makeVariantEvalState(vc: ViewCtx, valComponent: ValComponent) {
  const component = valComponent.tpl.component;

  // To check what variants are activated for this valComponent via its args,
  // we need to see what its args were evaluated to. The only place to find it
  // is in the CanvasEnv of elements _inside_ of this component, as they
  // could refer to the activated variants via $props.

  const map = new Map<Variant, boolean>();
  for (const group of component.variantGroups) {
    const groupName = toVarName(group.param.variable.name);
    const variantsObj = {
      [groupName]:
        valComponent.fibers[0].memoizedProps?.variants?.[groupName] ??
        valComponent.fibers[0].memoizedProps?.[groupName],
    };
    for (const variant of group.variants) {
      map.set(
        variant,
        vc.canvasCtx.Sub.reactWeb.hasVariant(
          variantsObj,
          groupName,
          toVarName(variant.name)
        )
      );
    }
  }
  return map;
}

function applyPinStateToVariantFrames(
  state: PinState,
  componentFrame: ComponentVariantFrame,
  globalFrame: GlobalVariantFrame
) {
  const [locals, globals] = partitions(state.targetVariants, [
    (v) => !isGlobalVariant(v),
  ]);
  componentFrame.setTargetVariants(locals);
  globalFrame.setTargetVariants(globals);

  const localPins = xpickBy(
    state.pinnedVariants,
    (pin, variant) => !isGlobalVariant(variant)
  );
  componentFrame.setPinnedVariants(localPins);

  const globalPins = xpickBy(state.pinnedVariants, (pin, variant) =>
    isGlobalVariant(variant)
  );
  globalFrame.setPinnedVariants(globalPins);
}

export function makeEmptyPinState(): PinState {
  return {
    targetVariants: [],
    pinnedVariants: new Map<Variant, boolean>(),
  };
}

function extractPinStateFromVariantFrames(
  componentFrame: ComponentVariantFrame,
  globalFrame: GlobalVariantFrame
): PinState {
  return {
    targetVariants: [
      ...componentFrame.getTargetVariants(),
      ...globalFrame.getTargetVariants(),
    ],
    pinnedVariants: mergeMaps(
      componentFrame.getPinnedVariants(),
      globalFrame.getPinnedVariants()
    ),
  };
}

export class ClientPinManager extends PinManager {
  constructor(
    private componentFrame: ComponentVariantFrame,
    private globalFrame: GlobalVariantFrame,
    evalState: Map<Variant, boolean>
  ) {
    super(
      new PinStateManager(
        globalFrame.site,
        componentFrame.tplComponent.component,
        evalState
      )
    );
  }

  protected get curState() {
    return this._curState.get();
  }

  private _curState = computed(() => {
    return extractPinStateFromVariantFrames(
      this.componentFrame,
      this.globalFrame
    );
  });

  protected applyPinState(state: PinState) {
    applyPinStateToVariantFrames(state, this.componentFrame, this.globalFrame);
  }
}
