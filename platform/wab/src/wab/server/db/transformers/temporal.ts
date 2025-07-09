import { Transformer } from "@/wab/server/db/transformers/base";
import { mkRangeTransformer } from "@/wab/server/db/transformers/range";
import { ensure } from "@/wab/shared/common";
import { regex } from "regex";
import { Temporal } from "temporal-polyfill";

export const dateTransformer: Transformer<Temporal.PlainDate> = {
  serialize: (x: Temporal.PlainDate) => {
    return x.toString();
  },
  deserialize: (x: string) => {
    return Temporal.PlainDate.from(x);
  },
};

export const dateRangeTransformer = mkRangeTransformer(dateTransformer);

const PG_TSTZ_REGEXP = regex`
^
(?<year> \d{4} )
-
(?<month> \d{2} )
-
(?<day> \d{2} )
\ # space
(?<hour> \d{2} )
:
(?<minute> \d{2} )
:
(?<second> \d{2} )
(\. (?<microsecond> \d{6} ))?
(?<offset> [+\-]\d{2} )
$
`;

export const tstzTransformer: Transformer<Temporal.Instant> = {
  serialize: (x: Temporal.Instant) => {
    return x.toString();
  },
  deserialize: (x: string) => {
    // Could look like:
    // - "2025-01-01 00:00:00+00"
    // - "2025-01-01 00:00:00.123456+00:00"
    const match = ensure(
      PG_TSTZ_REGEXP.exec(x),
      `failed to parse timestamptz: ${x}`
    );
    const groups = match.groups!;
    const ms = Number.parseInt(groups["microsecond"]);
    return new Temporal.PlainDate(
      Number.parseInt(groups["year"]),
      Number.parseInt(groups["month"]),
      Number.parseInt(groups["day"])
    )
      .toZonedDateTime({
        plainTime: new Temporal.PlainTime(
          Number.parseInt(groups["hour"]),
          Number.parseInt(groups["minute"]),
          Number.parseInt(groups["second"]),
          isNaN(ms) ? 0 : Math.floor(ms / 1000),
          isNaN(ms) ? 0 : ms % 1000
        ),
        timeZone: groups["offset"],
      })
      .toInstant();
  },
};

export const tstzRangeTransformer = mkRangeTransformer(tstzTransformer);
