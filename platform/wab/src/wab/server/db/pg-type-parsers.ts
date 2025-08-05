import {
  dateRangeTransformer,
  dateTransformer,
  tstzRangeTransformer,
} from "@/wab/server/db/transformers/temporal";
import { types } from "pg";

// Range types are missing from types.builtins.
// https://github.com/brianc/node-pg-types/pull/161
const rangeTypes = {
  INT4RANGE: 3904,
  NUMRANGE: 3906,
  TSRANGE: 3908,
  TSTZRANGE: 3910,
  DATERANGE: 3912,
  INT8RANGE: 3926,
  INT4MULTIRANGE: 4451,
  NUMMULTIRANGE: 4532,
  TSMULTIRANGE: 4533,
  TSTZMULTIRANGE: 4534,
  DATEMULTIRANGE: 4535,
  INT8MULTIRANGE: 4536,
};

// These type parsers tell pg to automatically convert types to JS types.
// However, this only works for data coming out of pg.
// Data going in to pg must still be serialized manually.
// Take care to serialize these types in the following places:
// - Entity column definitions: use transformer
// - Parameters: manually serialize

types.setTypeParser(types.builtins.DATE, dateTransformer.deserialize);
types.setTypeParser(rangeTypes.DATERANGE, dateRangeTransformer.deserialize);
// TODO: uncomment this eventually, but it will probably break all the Date code
// types.setTypeParser(types.builtins.TIMESTAMPTZ, tstzTransformer.deserialize);
types.setTypeParser(rangeTypes.TSTZRANGE, tstzRangeTransformer.deserialize);
