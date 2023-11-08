import { Request, Response } from "express-serve-static-core";
import { uncheckedCast } from "../../common";
import { superDbMgr } from "./util";

export async function getPromotionCodeById(req: Request, res: Response) {
  const dbMgr = superDbMgr(req);
  const { promoCodeId } = uncheckedCast<{ promoCodeId: string }>(req.params);
  const promotionCode = await dbMgr.getPromotionCodeById(promoCodeId);
  if (!promotionCode) {
    res.json({});
  }
  res.json({ ...promotionCode });
}
