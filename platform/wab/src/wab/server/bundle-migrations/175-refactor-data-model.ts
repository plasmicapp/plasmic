import {
  assert,
  ensure,
  intersectSets,
  removeWhere,
  unexpected,
  xDifference,
  xGroupBy,
} from "@/wab/shared/common";
import { isPlumeComponent, PlumeComponent } from "@/wab/shared/core/components";
import { mkOnChangeParamForState } from "@/wab/shared/core/lang";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  Bundle,
  BundledInst,
  Bundler,
  FastBundler,
} from "@/wab/shared/bundler";
import { isKnownNamedState, Site, State } from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { Class, Field, MetaRuntime, Type } from "@/wab/shared/model/model-meta";
import { writeable } from "@/wab/shared/core/sites";
import {
  genOnChangeParamName,
  isPublicState,
  removeComponentState,
} from "@/wab/shared/core/states";
import { trackComponentRoot, trackComponentSite } from "@/wab/shared/core/tpls";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  for (const inst of Object.values(bundle.map)) {
    if (
      [
        "AnyType",
        "BoolType",
        "RenderableType",
        "HrefType",
        "TargetType",
        "GlobalVariantGroup",
        "SlotParam",
        "StateParam",
        "GlobalVariantGroupParam",
        "PropParam",
        "StateChangeHandlerParam",
      ].includes(inst.__type)
    ) {
      //  Already migrated
      return;
    }
  }

  const codeComponentStates = new Set<string>();
  const stateToComponent = new Map<string, string>();

  for (const [key, inst] of Object.entries(bundle.map)) {
    if (inst.__type === "Any") {
      // "Any" -> "AnyType"
      inst.__type = "AnyType";
    } else if (inst.__type === "Bool") {
      // "Bool" -> "BoolType"
      inst.__type = "BoolType";
    } else if (inst.__type === "OpaqueType") {
      // OpaqueType -> RenderableType, TargetType, HrefType
      if (inst.name === "renderable") {
        inst.__type = "RenderableType";
      } else if (inst.name === "href") {
        inst.__type = "HrefType";
        delete inst.params;
      } else if (inst.name === "target") {
        inst.__type = "TargetType";
        delete inst.params;
      } else {
        unexpected(() => `Unexpected type name ${inst.name}`);
      }
    } else if (inst.__type === "VariantGroup") {
      // VariantGroup -> GlobalVariantGroup
      inst.__type = "GlobalVariantGroup";
      assert(
        inst.linkedState == null,
        () => "GlobalVariantGroup shouldn't have linkedState"
      );
      delete inst.linkedState;
    } else if (inst.__type === "Component") {
      inst.states.forEach((state) => {
        assert(
          typeof state.__ref === "string",
          () => "Unexpected state to be " + state
        );
        if (!!inst.codeComponentMeta || !!inst.plumeInfo) {
          codeComponentStates.add(state.__ref);
        }
        stateToComponent.set(state.__ref, key);
      });
    }
  }

  const slotParams = new Set<number>(),
    componentVariantGroupParams = new Set<number>(),
    globalVariantGroupParams = new Set<number>(),
    stateParams = new Set<number>(),
    stateChangeHandlerParams = new Set<number>(),
    codeComponentOnChangeParams = new Set<number>();

  // Param -> SlotParam, StateParam, GlobalVariantGroupParam, StateChangeHandlerParam
  for (const [key, inst] of Object.entries(bundle.map)) {
    if (inst.__type === "TplSlot") {
      assert("__ref" in inst.param, () => "Missing TplSlot.param ref");
      const paramIid = inst.param.__ref;
      slotParams.add(paramIid);
      bundle.map[paramIid].__type = "SlotParam";
      bundle.map[paramIid].tplSlot = { __ref: key };
    }
    if (inst.__type === "ComponentVariantGroup") {
      assert(
        "__ref" in inst.param,
        () => "Missing ComponentVariantGroup.param ref"
      );
      const paramIid = inst.param.__ref;
      componentVariantGroupParams.add(paramIid);
      const stateIid = ensure(
        inst.linkedState?.__ref,
        () => `Missing ComponentVariantGroup.linkedState`
      );
      assert(
        bundle.map[stateIid].__type === "State",
        () => `linkedState is of type ${bundle.map[stateIid].__type}`
      );
      bundle.map[stateIid].__type = "VariantGroupState";
      bundle.map[stateIid].variantGroup = { __ref: key };
    }
    if (inst.__type === "GlobalVariantGroup") {
      assert(
        "__ref" in inst.param,
        () => "Missing GlobalVariantGroup.param ref"
      );
      const paramIid = inst.param.__ref;
      globalVariantGroupParams.add(paramIid);
      bundle.map[paramIid].__type = "GlobalVariantGroupParam";
    }
    if (
      inst.__type === "State" ||
      inst.__type === "VariantGroupState" ||
      inst.__type === "NamedState"
    ) {
      assert("__ref" in inst.param, () => "Missing State.param ref");
      const paramIid = inst.param.__ref;
      stateParams.add(paramIid);
      bundle.map[paramIid].__type = "StateParam";
      bundle.map[paramIid].state = { __ref: key };
      if (inst.onChangeParam) {
        assert(
          "__ref" in inst.onChangeParam,
          () => "Missing State.onChangeParam ref"
        );
        const changeHandlerParamIid = inst.onChangeParam.__ref;
        if (!codeComponentStates.has(key)) {
          stateChangeHandlerParams.add(changeHandlerParamIid);
          bundle.map[changeHandlerParamIid].__type = "StateChangeHandlerParam";
          bundle.map[changeHandlerParamIid].state = { __ref: key };
        } else {
          // Code component states use reigstered PropParam instead of
          // StateChangeHandlerParam
          codeComponentOnChangeParams.add(changeHandlerParamIid);
          bundle.map[changeHandlerParamIid].__type = "PropParam";
        }
      }
    }
  }

  // Assert these are disjoint sets
  const disjointSets = [
    slotParams,
    globalVariantGroupParams,
    stateParams,
    stateChangeHandlerParams,
    codeComponentOnChangeParams,
  ];
  for (let i = 1; i < disjointSets.length; i++) {
    for (let j = 0; j < i; j++) {
      const intersection = intersectSets(disjointSets[i], disjointSets[j]);
      assert(
        intersection.size === 0,
        () =>
          `Sets not disjoint: ${i} and ${j} have common elements ${[
            ...intersection.keys(),
          ].join(",")}`
      );
    }
  }

  // Assert every component variant group param is also a state param
  const difference = xDifference(componentVariantGroupParams, stateParams);
  assert(
    difference.size === 0,
    () =>
      `The following component variant group params are not state params: ${
        [...difference.keys()].length
      }`
  );

  for (const inst of Object.values(bundle.map)) {
    if (inst.__type === "Param") {
      // Remaining Params are PropParam
      inst.__type = "PropParam";
    }
  }

  // Add onChange params to states

  const tmpBundler = new Bundler(fakeMetaRuntime);

  const mkStateHandlerParam = (stateIid: string, stateJson: BundledInst) => {
    const componentIid = ensure(
      stateToComponent.get(stateIid),
      () => `Couldn't find component for ${stateIid}`
    );
    assert(
      ["State", "VariantGroupState", "NamedState"].includes(stateJson.__type),
      () => `Unexpected ${stateJson.__type}, expected state`
    );
    assert(
      stateJson.onChangeParam == null,
      () => `State already has onChange param`
    );
    const stateParam = ensure(
      ensure(
        bundle.map[stateJson.param.__ref],
        () => `Couldn't find state param ref`
      ),
      () => `Coulnd't find stateParam`
    );
    const variable = ensure(
      ensure(
        bundle.map[stateParam.variable.__ref],
        () => `Couldn't find state variable ref`
      ),
      () => `Coulnd't find state variable`
    );
    const onChangeParam = mkOnChangeParamForState(
      stateJson.variableType,
      genOnChangeParamName(variable.name),
      { privateState: true }
    );
    // We can assign to null here because `tmpBundler` uses `fakeMetaRuntime`
    writeable(onChangeParam).state = null as any;
    const tmpBundle = tmpBundler.bundle(
      onChangeParam,
      "id",
      bundle.version || "0-new-version"
    );
    assert(tmpBundle.deps.length === 0, () => `Shouldn't have any deps`);
    Object.assign(bundle.map, tmpBundle.map);

    const onChangeParamIid = tmpBundle.root;
    bundle.map[onChangeParamIid].state = { __ref: stateIid };
    stateJson.onChangeParam = { __ref: onChangeParamIid };
    bundle.map[componentIid].params.push({ __ref: onChangeParamIid });
  };

  for (const [key, inst] of [...Object.entries(bundle.map)]) {
    if (
      !inst.onChangeParam &&
      (inst.__type === "State" ||
        inst.__type === "NamedState" ||
        inst.__type === "VariantGroupState")
    ) {
      mkStateHandlerParam(key, inst);
    }
  }

  const finalBundler = new FastBundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    finalBundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    trackComponentRoot(component);
    trackComponentSite(component, site);
  }

  fixPlumeComponents(site);

  // assertSiteInvariants(site);

  Object.assign(
    bundle,
    finalBundler.bundle(
      siteOrProjectDep,
      entity.id,
      bundle.version || "0-new-version"
    )
  );

  finalBundler.unbundleAndRecomputeParents(bundle as Bundle, entity.id);
};

// Fake meta runtime where `state` param is nullable so we can bundle in `tmpBundle`
const changeHandlerParamCls = ensure(
  meta.schema.find((cls) => cls.name === "StateChangeHandlerParam"),
  () => `Couldn't find StateChangeHandlerParam cls`
);
const fakeMetaRuntime = new MetaRuntime(
  [
    ...meta.schema.filter((cls) => cls !== changeHandlerParamCls),
    new Class({
      ...changeHandlerParamCls,
      fields: [
        ...changeHandlerParamCls.fields.filter((f) => f.name !== "state"),
        new Field({
          name: "state",
          type: new Type({
            type: "Optional",
            params: [
              new Type({
                type: "State",
                params: [],
              }),
            ],
          }),
          annotations: ["Const", "WeakRef"],
        }),
      ],
    }),
  ],
  3000000
);

// Due to an old bug, some plume components have duplicated states
// pointing to the same param. We need to dedupe them here.
function fixPlumeComponents(site: Site) {
  const oldToNewState = new Map<State, State>();
  site.components
    .filter((c): c is PlumeComponent => isPlumeComponent(c))
    .forEach((component) => {
      [...xGroupBy(component.states, (s) => s.param).entries()]
        .filter(([_param, states]) => states.length > 1)
        .forEach(([param, duplicatedStates]) => {
          const realState =
            duplicatedStates.find((state) => isKnownNamedState(state)) ??
            duplicatedStates.find((state) => isPublicState(state)) ??
            duplicatedStates[0];
          // Fix `param.state` links
          writeable(param).state = realState;
          const deletedStates = duplicatedStates.filter((s) => s !== realState);
          deletedStates.forEach((deletedState) => {
            oldToNewState.set(deletedState, realState);
            removeWhere(component.states, (state) => state === deletedState);
          });
        });
    });
  // Fix `state.implicitState` references
  site.components.forEach((component) => {
    for (const state of [...component.states]) {
      if (state.implicitState) {
        const newImplicitState = oldToNewState.get(state.implicitState);
        if (newImplicitState) {
          // The implicit states should also be duplicated
          assert(
            !isPublicState(newImplicitState) ||
              component.states.some(
                (state2) => state2.implicitState === newImplicitState
              ),
            () =>
              `Could not find implicit state for public state ${newImplicitState.param.variable.name}`
          );
          // Dedupe
          removeComponentState(site, component, state);
        }
      }
    }
  });
}

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
