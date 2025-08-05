import { arrayRemove } from "@/wab/shared/collections";
import { ensure } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import { convertHrefExprToCodeExpr } from "@/wab/shared/core/exprs";
import { flattenTpls } from "@/wab/shared/core/tpls";
import { isKnownPageHref, PageHref, Site } from "@/wab/shared/model/classes";

/**
 * Fixes any PageHref in Site to point to local pages. At this point,
 * you have duplicated pages from imported site to local site, but there
 * are PageHrefs in components in `site` that are pointing to
 * "imported" pages, which is not really allowed.  We convert them to point
 * either to the local sites, if those pages have been copied here, or to
 * CustomCode, if they're referencing pages that are not local to this site.
 */
export function fixPageHrefsToLocal(site: Site) {
  const pathToPage = Object.fromEntries(
    site.components.filter(isPageComponent).map((c) => [c.pageMeta.path, c])
  );

  for (const comp of site.components) {
    const swap = (expr: PageHref) => {
      const found =
        pathToPage[
          ensure(expr.page.pageMeta, "Can only reference page components").path
        ];
      if (found) {
        console.log("Swapping with local", found.pageMeta.path);
        expr.page = found;
        return expr;
      } else {
        // Referencing a page component that's not local; swap to code expr
        return convertHrefExprToCodeExpr(site, comp, expr);
      }
    };

    for (const tpl of flattenTpls(comp.tplTree)) {
      for (const vsettings of tpl.vsettings) {
        for (const arg of [...vsettings.args]) {
          if (isKnownPageHref(arg.expr) && arg.expr.page) {
            const swapped = swap(arg.expr);
            if (swapped) {
              arg.expr = swapped;
            } else {
              arrayRemove(vsettings.args, arg);
            }
          }
        }
        for (const [attr, expr] of Object.entries(vsettings.attrs)) {
          if (isKnownPageHref(expr) && expr.page) {
            const swapped = swap(expr);
            if (swapped) {
              vsettings.attrs[attr] = swapped;
            } else {
              delete vsettings.attrs[attr];
            }
          }
        }
      }
    }
  }
}
