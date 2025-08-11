import { mkShortId, switchType } from "@/wab/shared/common";
import { cloneVariantedValue } from "@/wab/shared/core/styles";
import { DataToken, StyleToken, Token } from "@/wab/shared/model/classes";

export function cloneToken(token: StyleToken): StyleToken;
export function cloneToken(token: DataToken): DataToken;
export function cloneToken(token: Token): Token {
  return switchType(token)
    .when(StyleToken, (t) => {
      return new StyleToken({
        name: t.name,
        type: t.type,
        value: t.value,
        variantedValues: t.variantedValues.map(cloneVariantedValue),
        uuid: mkShortId(),
        isRegistered: t.isRegistered,
        regKey: t.regKey,
      });
    })
    .when(DataToken, (t) => {
      return new DataToken({
        name: t.name,
        type: t.type,
        value: t.value,
        variantedValues: t.variantedValues.map(cloneVariantedValue),
        uuid: mkShortId(),
        isRegistered: t.isRegistered,
        regKey: t.regKey,
      });
    })
    .result();
}
