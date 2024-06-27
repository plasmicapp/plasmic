import { uncheckedCast } from "@/wab/shared/common";
import { PromotionCode } from "@/wab/server/entities/Entities";
import { superDbMgr } from "@/wab/server/routes/util";
import { Request, Response } from "express-serve-static-core";

export async function getPromotionCodeById(req: Request, res: Response) {
  const dbMgr = superDbMgr(req);
  const { promoCodeId } = uncheckedCast<{ promoCodeId: string }>(req.params);
  const promotionCode = await dbMgr.getPromotionCodeById(promoCodeId);
  if (!promotionCode) {
    res.json({});
    return;
  }
  res.json({ ...promotionCode });
}

/**
 * Gets the promotion code set in cookies.
 *
 * Promotion codes are NOT set in wab (Studio).
 * They are set on the marketing site instead.
 */
export function getPromotionCodeCookie(req: Request) {
  const cookie = req.cookies["promo_code"];
  if (!cookie) {
    return undefined;
  }

  return JSON.parse(cookie) as PromotionCode;
}
