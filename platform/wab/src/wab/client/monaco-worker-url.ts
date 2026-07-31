import { getStaticUrl } from "@/wab/shared/urls";
import memoizeOne from "memoize-one";

/**
 * We need to run this before using the Monaco Editor:
 * https://github.com/microsoft/monaco-editor/blob/v0.50.0/docs/integrate-esm.md
 */
export const fixWorkerUrl = memoizeOne(() => {
  (window as any).MonacoEnvironment.getWorkerUrl = function (
    _moduleId: any,
    label: any
  ) {
    if (label === "typescript" || label === "javascript") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getStaticUrl()}/ts.worker.js');`)}`;
    } else if (label === "json") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getStaticUrl()}/json.worker.js');`)}`;
    } else if (label === "html") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getStaticUrl()}/html.worker.js');`)}`;
    } else if (label === "css") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getStaticUrl()}/css.worker.js');`)}`;
    } else {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getStaticUrl()}/editor.worker.js');`)}`;
    }
  };
});
