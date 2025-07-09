import { Transformer } from "@/wab/server/db/transformers/base";
import { ensure } from "@/wab/shared/common";
import { mkRange, Range } from "@/wab/shared/range";
import { regex } from "regex";

export function mkRangeTransformer<T>(
  transformer: Transformer<T>
): Transformer<Range<T>> {
  return {
    serialize: (x: Range<T>) => {
      return toPgRange(x, transformer.serialize);
    },
    deserialize: (x: string) => {
      return fromPgRange(x, transformer.deserialize);
    },
  };
}

const PG_RANGE_REGEXP = regex`
^
(?<left> \[ | \( )
(?<lower> .* )
,
(?<upper> .* )
(?<right> \] | \) )
$
`;

function toPgRange<T>(
  range: Range<T>,
  toString: (element: T) => string
): string {
  return (
    (range.lowerExclusive ? "(" : "[") +
    toString(range.lower) +
    "," +
    toString(range.upper) +
    (range.upperExclusive ? ")" : `]`)
  );
}

function fromPgRange<T>(
  pgRange: string,
  fromString: (pgElement: string) => T
): Range<T> {
  const match = ensure(
    pgRange.match(PG_RANGE_REGEXP),
    `failed to parse PG range: ${pgRange}`
  );
  const groups = match.groups!;
  return mkRange(
    fromString(stripPgValueQuotes(groups["lower"])),
    fromString(stripPgValueQuotes(groups["upper"])),
    {
      lowerExclusive: groups["left"] === "(",
      upperExclusive: groups["right"] === ")",
    }
  );
}

/**
 * WARNING: This function does not currently unescape values properly.
 * However, this isn't required for dates and timestamptz values (what we use right now).
 */
function stripPgValueQuotes(pgValue: string): string {
  if (pgValue.startsWith('"') && pgValue.endsWith('"')) {
    return pgValue.slice(1, -1);
  } else {
    return pgValue;
  }
}
