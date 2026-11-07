import { createFormConnectionSession } from "@/wab/client/components/sidebar-tabs/DataSource/ConnectToDBTable";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { code } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ensureKnownTplComponent } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { FormType } from "@plasmicpkgs/antd5";

vi.mock("@/wab/client/components/quick-modals", () => ({
  reactConfirm: vi.fn(async () => true),
}));

it.each([
  "changed",
  "deleted",
  "unchanged",
  "unrelated",
  "source",
  "form-type",
  "missing",
  "partial",
])(
  "rechecks a %s form after preparing its submit operation",
  async (targetState) => {
    const form = mkComponent({
      name: "Form",
      type: ComponentType.Plain,
      tplTree: mkTplTagX("div"),
      params: ["dataFormItems", "onFinish", "layout"].map((name) =>
        mkParam({ name, type: typeFactory.any(), paramType: "prop" }),
      ),
    });
    const component = mkComponent({
      name: "Page",
      type: ComponentType.Plain,
      tplTree: (baseVariant) =>
        mkTplComponentX({
          component: form,
          baseVariant,
          args: {
            dataFormItems: code("[]"),
            onFinish: code("undefined"),
            layout: code('"vertical"'),
          },
        }),
    });
    const tpl = ensureKnownTplComponent(component.tplTree);
    tpl.name = "form";
    const site = createSite();
    site.components = [...site.components, form, component];
    const onChange = vi.fn();
    const change = vi.fn(async (fn: () => unknown) => fn());
    const getDataSourceOpId = vi.fn(
      async (_project: string, _source: string, op: { name: string }) => {
        if (op.name === "create") {
          if (targetState === "changed") {
            tpl.vsettings[0].args[0].expr = code('["external"]');
          } else if (targetState === "unrelated") {
            ensure(
              tpl.vsettings[0].args.find(
                (arg) => arg.param.variable.name === "layout",
              ),
            ).expr = code('"horizontal"');
          } else if (targetState === "deleted") {
            site.components = site.components.filter(
              (item) => item !== component,
            );
          }
        }
        return { opId: "operation" };
      },
    );
    const studioCtx = {
      site,
      siteInfo: { id: "project" },
      projectFlags: () => DEVFLAGS,
      change,
      appCtx: {
        app: { withSpinner: <T>(promise: Promise<T>) => promise },
        api: {
          getDataSourceById: async () => ({ source: "postgres" }),
          executeDataSourceStudioOp: async () => ({
            tables: [
              {
                id: "table",
                fields: [{ id: "id", type: "number", primaryKey: true }],
              },
            ],
          }),
          getDataSourceOpId,
        },
      },
    } as unknown as StudioCtx;
    const session = createFormConnectionSession(studioCtx, {
      tpl,
      component,
      lookupSpec: ["source", "form-type"].includes(targetState)
        ? {
            sourceId: targetState === "source" ? "old-source" : "source",
            tableId: "table",
          }
        : undefined,
      initialSelectedFormOption: FormType.NewEntry,
      modalKey: "form",
      env: {},
      onChange,
    });
    session.setDraft({
      lookup: {
        sourceId: "source",
        tableId: "table",
        lookupFields: ["id"],
        lookupValue:
          targetState === "missing" || targetState === "partial"
            ? {
                value: targetState === "partial" ? {} : undefined,
                bindings: {},
              }
            : targetState === "form-type"
              ? { value: { id: 1 }, bindings: {} }
              : undefined,
      },
      formType: ["missing", "partial", "form-type"].includes(targetState)
        ? FormType.UpdateEntry
        : FormType.NewEntry,
    });
    const result = await session.commit();
    if (targetState === "missing" || targetState === "partial") {
      expect(result).toEqual({
        kind: "blocked",
        message: "Enter a lookup value before saving.",
      });
      expect(getDataSourceOpId).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
      return;
    }
    expect(getDataSourceOpId).toHaveBeenCalledTimes(2);
    if (
      ["unchanged", "unrelated", "source", "form-type"].includes(targetState)
    ) {
      expect(result.kind).toBe("saved");
      expect(change).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledOnce();
    } else {
      expect(result).toMatchObject({
        kind: "blocked",
        message: expect.stringContaining(targetState),
      });
      expect(change).toHaveBeenCalledOnce();
      expect(onChange).not.toHaveBeenCalled();
      expect(session.dirty).toBe(true);
    }
  },
);
