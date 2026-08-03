import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import { htmlToTpl } from "@/wab/client/operations/html-to-tpl";
import { formatWIErrors, WIError } from "@/wab/client/web-importer/errors";
import { unwrap } from "@/wab/commons/neverthrow-utils";
import { notification } from "antd";
import { ok } from "neverthrow";
import React from "react";

/** Issues shown in the warning notification; the full list goes to the console. */
const MAX_SHOWN_IMPORT_ISSUES = 5;

export async function pasteFromWebImporter(
  text,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  if (!studioCtx.appCtx.appConfig.allowHtmlPaste) {
    return { handled: false };
  }

  const htmlString = text.trim();
  if (!htmlString.startsWith("<")) {
    return { handled: false };
  }

  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);
  const component = viewCtx.currentTplComponent().component;

  const result = await studioCtx.app.withSpinner(
    htmlToTpl(htmlString, {
      site: studioCtx.site,
      vtm: viewCtx.variantTplMgr(),
      appCtx: viewCtx.appCtx,
    })
  );

  if (result.isErr()) {
    // The HTML produced nothing usable; leave it to other paste handlers.
    return { handled: false };
  }

  const { tpls, errors, finalize } = result.value;

  const finalizeResult = unwrap(
    await studioCtx.change<never, { success: boolean; wiErrors: WIError[] }>(
      () => {
        const wiErrors = finalize({
          component,
          tplMgr: viewCtx.tplMgr(),
          ccRegistry: studioCtx.codeComponentsRegistry,
        });

        return ok({
          success: viewCtx.viewOps.pasteNodes({
            nodes: tpls,
            cursorClientPt,
            target: undefined,
            loc: insertRelLoc,
          }),
          wiErrors,
        });
      }
    )
  );

  const wiErrors = formatWIErrors([...errors, ...finalizeResult.wiErrors]);
  if (wiErrors.length > 0) {
    console.warn(
      `[web-importer] HTML imported with ${wiErrors.length} issue(s):\n` +
        wiErrors.map((e) => `  - ${e}`).join("\n")
    );
    notification.warning({
      message: `HTML imported with ${wiErrors.length} issue(s)`,
      description: (
        <>
          <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
            {wiErrors.slice(0, MAX_SHOWN_IMPORT_ISSUES).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {wiErrors.length > MAX_SHOWN_IMPORT_ISSUES && (
            <div>
              and {wiErrors.length - MAX_SHOWN_IMPORT_ISSUES} more. See the
              browser console for the full list.
            </div>
          )}
        </>
      ),
    });
  }

  return { handled: true, success: finalizeResult.success };
}
