import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";
import { PLASMIC_DISPLAY_NONE } from "@/wab/shared/css";
import { isKnownTplTag } from "@/wab/shared/model/classes";
import {
  ChangesType,
  summarizeChanges,
} from "@/wab/shared/model/model-change-util";

function setup() {
  const site = createSite();
  const component = mkComponent({
    name: "A",
    type: ComponentType.Plain,
    tplTree: (baseVariant) =>
      mkTplTagX("div", { baseVariant, styles: { display: "block" } }),
  });
  site.components = [component];
  const recorder = new ChangeRecorder({ site });
  const studioCtx = {
    site,
    tplMgr: () => new TplMgr({ site }),
  } as unknown as StudioCtx;
  const root = component.tplTree;
  if (!isKnownTplTag(root)) {
    throw new Error("Expected a TplTag");
  }
  const setStyle = (prop: string, value: string) => {
    const rs = root.vsettings[0].rs;
    rs.values = { ...rs.values, [prop]: value };
  };
  const setColor = (color: string) => setStyle("color", color);
  return { component, recorder, studioCtx, setStyle, setColor };
}

describe("summarizeChanges", () => {
  it("keeps a style change CSS-only when Component.updatedAt is also written", () => {
    const { component, recorder, studioCtx, setColor } = setup();

    const changes = recorder.withRecording(() => {
      setColor("red");
      component.updatedAt = 1;
    });
    const summary = summarizeChanges(studioCtx, changes);
    expect(summary.changesType).toBe(ChangesType.CssOnly);
    expect(summary.updatedComponents.has(component)).toBe(true);

    recorder.dispose();
  });

  it("ignores a change to Component.updatedAt alone", () => {
    const { component, recorder, studioCtx } = setup();

    const changes = recorder.withRecording(() => {
      component.updatedAt = 1;
    });
    const summary = summarizeChanges(studioCtx, changes);
    expect(summary.changesType).toBe(ChangesType.NoChange);
    expect(summary.updatedComponents.size).toBe(0);

    recorder.dispose();
  });

  it("forces an evaluation when display changes", () => {
    const { component, recorder, studioCtx, setStyle, setColor } = setup();

    // A hidden element that is auto-opened on selection is rendered with an
    // inline display, which only an evaluation updates
    setStyle(PLASMIC_DISPLAY_NONE, "true");
    const displayChanges = recorder.withRecording(() => {
      setStyle("display", "grid");
      component.updatedAt = 1;
    });
    const displaySummary = summarizeChanges(studioCtx, displayChanges);
    expect(displaySummary.changesType).toBe(ChangesType.CssOnly);
    expect(displaySummary.styleForcesEval).toBe(true);
    expect(displaySummary.deepUpdatedComponents.has(component)).toBe(true);

    const visibilityChanges = recorder.withRecording(() => {
      setStyle(PLASMIC_DISPLAY_NONE, "false");
    });
    expect(summarizeChanges(studioCtx, visibilityChanges).styleForcesEval).toBe(
      true,
    );

    const colorChanges = recorder.withRecording(() => {
      setColor("red");
      component.updatedAt = 2;
    });
    expect(summarizeChanges(studioCtx, colorChanges).styleForcesEval).toBe(
      false,
    );

    recorder.dispose();
  });

  it("forces an evaluation when flex-direction changes", () => {
    const { component, recorder, studioCtx, setStyle } = setup();

    const changes = recorder.withRecording(() => {
      setStyle("flex-direction", "column");
      component.updatedAt = 1;
    });
    const summary = summarizeChanges(studioCtx, changes);
    expect(summary.changesType).toBe(ChangesType.CssOnly);
    expect(summary.styleForcesEval).toBe(true);
    expect(summary.deepUpdatedComponents.has(component)).toBe(true);

    recorder.dispose();
  });

  it.each([
    ["display", "grid", true],
    ["flex-direction", "column", true],
    [PLASMIC_DISPLAY_NONE, "true", true],
    ["color", "red", false],
  ])(
    "includes mixin users and their referencers for %s only when evaluation is needed",
    (prop, value, forcesEval) => {
      const { component, recorder, studioCtx } = setup();
      const mixin = studioCtx.tplMgr().addMixin("Layout");
      mixin.rs.values = { display: "flex", "flex-direction": "row" };
      const root = component.tplTree;
      if (!isKnownTplTag(root)) {
        throw new Error("Expected a TplTag");
      }
      root.vsettings[0].rs.mixins = [mixin];
      const parent = mkComponent({
        name: "Parent",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplComponentX({ component, baseVariant }),
      });
      const unrelated = mkComponent({
        name: "Unrelated",
        type: ComponentType.Plain,
        tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
      });
      studioCtx.site.components = [component, parent, unrelated];

      const changes = recorder.withRecording(() => {
        mixin.rs.values = { ...mixin.rs.values, [prop]: value };
      });
      const summary = summarizeChanges(studioCtx, changes);
      expect(summary.changesType).toBe(ChangesType.CssOnly);
      expect(summary.styleForcesEval).toBe(forcesEval);
      expect(summary.deepUpdatedComponents).toEqual(
        new Set(forcesEval ? [component, parent] : []),
      );

      recorder.dispose();
    },
  );

  it("does not treat other Component fields as CSS-only", () => {
    const { component, recorder, studioCtx, setColor } = setup();

    const changes = recorder.withRecording(() => {
      setColor("red");
      component.name = "B";
    });
    expect(summarizeChanges(studioCtx, changes).changesType).toBe(
      ChangesType.OtherChanges,
    );

    recorder.dispose();
  });
});
