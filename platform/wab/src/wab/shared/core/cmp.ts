import { instUtil } from "@/wab/shared/model/InstUtil";
import { meta } from "@/wab/shared/model/classes-metas";
import { BaseRuntime } from "@/wab/shared/model/model-meta";

// Equality comparator that uses class metadata to guide its crawling
export class Comparator {
  _rt: BaseRuntime;
  constructor(rt = meta) {
    this._rt = rt;
  }
  deepEq(x, y) {
    return instUtil.deepEquals(x, y);
  }
}
