import { Site, TplNode } from "../classes";
import { ensure } from "../common";
import { hasNonTrivialCodeExprs } from "../tpls";
import { FindFreeVarsRequest, FindFreeVarsResponse } from "./ApiSchema";
import { exportReactPlainTypical } from "./codegen/react-p/plain";
import { TplMgr } from "./TplMgr";

type FindFreeVarsFn = (
  req: FindFreeVarsRequest
) => Promise<FindFreeVarsResponse>;

export class RefactorClient {
  constructor(private findFreeVarsFn: FindFreeVarsFn) {}

  /**
   * If extracting the given tpl into a new function or component, get the
   * variables that would be captured as parameters.
   */
  async findFreeVars(tpl: TplNode, tplMgr: TplMgr, site: Site) {
    if (!hasNonTrivialCodeExprs(tpl)) {
      return {};
    }

    const component = ensure(
      tplMgr.findComponentContainingTpl(tpl),
      () => `No component for tpl ${tpl.uuid}`
    );
    const generatedCode = exportReactPlainTypical(
      site,
      "dummy-site-name",
      "dummy-site-id",
      component,
      { markTpl: tpl }
    );

    const { params } = await this.findFreeVarsFn({
      generatedCode,
    });

    return params;
  }
}
