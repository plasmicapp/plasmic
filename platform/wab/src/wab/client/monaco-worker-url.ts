import { getPublicUrl } from "@/wab/shared/urls";
import memoizeOne from "memoize-one";

/**
 * We need to run this before using the Monaco Editor:
 * https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-amd-cross.md
 */
export const fixWorkerUrl = memoizeOne(() => {
  (window as any).MonacoEnvironment.getWorkerUrl = function (
    _moduleId: any,
    label: any
  ) {
    if (label === "typescript" || label === "javascript") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getPublicUrl()}/ts.worker.js');`)}`;
    } else if (label === "json") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getPublicUrl()}/json.worker.js');`)}`;
    } else if (label === "html") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getPublicUrl()}/html.worker.js');`)}`;
    } else if (label === "css") {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getPublicUrl()}/css.worker.js');`)}`;
    } else {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        importScripts('${getPublicUrl()}/editor.worker.js');`)}`;
    }
  };
});
