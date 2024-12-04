import { isBaseVariant } from "@/wab/shared/Variants";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import {
  getRepetitionElementName,
  getRepetitionIndexName,
} from "@/wab/shared/core/components";
import { getRawCode } from "@/wab/shared/core/exprs";
import { getNumberOfRepeatingAncestors } from "@/wab/shared/core/tpls";
import { TplComponent, TplTag } from "@/wab/shared/model/classes";

export function getRepetitionItemInternalName(idx: number) {
  return `__plasmic_item_${idx}`;
}

export function getRepetitionIndexInternalName(idx: number) {
  return `__plasmic_idx_${idx}`;
}

export function serializeDataRepsIndexName(node: TplTag | TplComponent) {
  return [...Array(getNumberOfRepeatingAncestors(node))].map((_, i) =>
    getRepetitionIndexInternalName(i)
  );
}

export function serializeDataReps(
  ctx: SerializerBaseContext,
  node: TplTag | TplComponent,
  serializedContent: string
) {
  const baseVs = node.vsettings.find((vs) => isBaseVariant(vs.variants));
  if (!baseVs?.dataRep) {
    return serializedContent;
  }

  const elementName = getRepetitionElementName(baseVs.dataRep);
  const indexName = getRepetitionIndexName(baseVs.dataRep);

  const idx = getNumberOfRepeatingAncestors(node) - 1;
  const elementInternalName = getRepetitionItemInternalName(idx);
  const indexInternalName = getRepetitionIndexInternalName(idx);

  const collectionCode = getRawCode(baseVs.dataRep.collection, ctx.exprCtx);
  const code = `(${serializeEnsureArray(collectionCode)}).map(
    (${elementInternalName}, ${indexInternalName}) => {
      const ${elementName} = ${elementInternalName};
      const ${indexName} = ${indexInternalName};
      return (
        ${serializedContent}
      );
    }
  )`;

  return code;
}

function serializeEnsureArray(serializedCode: string) {
  return `((_par) => !_par ? [] : Array.isArray(_par) ? _par : [_par])(${serializedCode})`;
}
