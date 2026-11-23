/** Smallest value of a PostgreSQL `integer` column. */
export const PG_INTEGER_MIN = -2_147_483_648;
/** Largest value of a PostgreSQL `integer` column. */
export const PG_INTEGER_MAX = 2_147_483_647;

/** Whether `value` fits in a PostgreSQL `integer` column. */
export function isPgInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= PG_INTEGER_MIN &&
    value <= PG_INTEGER_MAX
  );
}
