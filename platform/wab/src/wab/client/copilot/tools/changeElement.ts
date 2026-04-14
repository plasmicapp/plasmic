import { renameTpl } from "@/wab/client/operations/rename-tpl";
import { processUnsanitizedStyles } from "@/wab/client/web-importer/html-parser";
import { unwrap } from "@/wab/commons/failable-utils";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { getBaseVariant } from "@/wab/shared/Variants";
import {
  COPILOT_TOOL_DEFS,
  defineCopilotTool,
} from "@/wab/shared/copilot/enterprise/copilot-tools";
import {
  getComponentArenaAndVariantTplMgr,
  getComponentByUuid,
  getVariantsByUuids,
} from "@/wab/shared/copilot/utils";
import { codeLit, tryExtractJson } from "@/wab/shared/core/exprs";
import { JsonObject } from "@/wab/shared/core/lang";
import { flattenTpls, isTplNamable } from "@/wab/shared/core/tpls";

export const changeElementTool = defineCopilotTool(
  COPILOT_TOOL_DEFS.changeElement,
  async (studioCtx, { componentUuid, variantUuids, changes }) => {
    const component = getComponentByUuid(studioCtx.site, componentUuid);

    const variants = variantUuids?.length
      ? getVariantsByUuids(variantUuids, {
          component,
          site: studioCtx.site,
        })
      : undefined;

    const { vtm, arena } = getComponentArenaAndVariantTplMgr(
      studioCtx.site,
      component,
      studioCtx.tplMgr()
    );
    studioCtx.switchToArena(arena);

    const variantCombo = variants ?? [getBaseVariant(component)];

    const componentTpls = flattenTpls(component.tplTree);

    const result = unwrap(
      await studioCtx.change<never, string>(({ success }) => {
        const response: string[] = [];

        for (const change of changes) {
          const tpl = componentTpls.find((t) => t.uuid === change.tplUuid);
          if (!tpl) {
            response.push(
              `Element with UUID "${change.tplUuid}" not found in component "${component.name}".`
            );
            continue;
          }

          if (change.name !== undefined) {
            if (!isTplNamable(tpl)) {
              response.push(`Element "${change.tplUuid}" cannot be named.`);
            } else {
              const renameResult = renameTpl(tpl, change.name, {
                component,
                tplMgr: studioCtx.tplMgr(),
              });
              if (renameResult.result === "error") {
                response.push(
                  `Failed to rename "${change.tplUuid}": ${renameResult.message}`
                );
              } else if (renameResult.newName === null) {
                response.push(`Element "${change.tplUuid}" name removed.`);
              } else {
                response.push(
                  `Element "${change.tplUuid}" renamed to "${renameResult.newName}".`
                );
              }
            }
          }

          if (change.styles) {
            const vs = vtm.ensureVariantSetting(tpl, variantCombo);
            const rsh = RSH(vs.rs, tpl);

            // The style attr could be a dynamic expression (e.g. a code expression
            // or data binding) instead of a plain JSON object. In that case
            // tryExtractJson returns undefined, and we should not overwrite
            // it as it would break the dynamic expression.
            const styleAttr = vs.attrs["style"];
            const parsedJsonStyles = tryExtractJson(styleAttr);
            if (styleAttr && parsedJsonStyles === undefined) {
              response.push(
                `Element "${change.tplUuid}" has a dynamic style expression that cannot be modified by copilot.`
              );
              continue;
            }

            const existingUnsafeStyles = (parsedJsonStyles as JsonObject) ?? {};

            // Separate styles into add/update (non-null) and remove (null)
            const stylesToAdd: Record<string, string> = {};
            const stylesToRemove: string[] = [];
            for (const [key, value] of Object.entries(change.styles)) {
              if (value === null) {
                stylesToRemove.push(key);
              } else {
                stylesToAdd[key] = value;
              }
            }

            // Add/update styles (non-null values)
            if (Object.keys(stylesToAdd).length > 0) {
              const { safe, unsafe } = processUnsanitizedStyles(stylesToAdd);
              rsh.merge(safe);

              if (Object.keys(unsafe).length > 0) {
                vs.attrs["style"] = codeLit({
                  ...existingUnsafeStyles,
                  ...unsafe,
                });
              }
            }

            // Remove styles (null values).
            if (stylesToRemove.length > 0) {
              for (const key of stylesToRemove) {
                // The removal keys should always match since copilot has access to the
                // serialized component i.e the style keys it sees are the ones already
                // in the bundle (sanitized and valid). So copilot would provide the exact
                // key name to be removed. The removed style could be a safe or unsafe style
                // property. We try removing it from both places.
                rsh.clear(key);
                delete existingUnsafeStyles[key];
              }

              if (Object.keys(existingUnsafeStyles).length > 0) {
                vs.attrs["style"] = codeLit(existingUnsafeStyles);
              } else {
                delete vs.attrs["style"];
              }
            }

            response.push(
              `Element "${change.tplUuid}" styles changed successfully.`
            );
          }
        }

        return success(response.join("\n"));
      })
    );

    return result;
  }
);
