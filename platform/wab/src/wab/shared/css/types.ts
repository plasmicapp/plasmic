/**
 * CSS Length units
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/length
 */
export const LENGTH_UNITS = [
  "px",
  "em",
  "rem",
  "ch",
  "ex",
  "vw",
  "vh",
  "vmin",
  "vmax",
  "vb",
  "vi",
  "dvw",
  "dvh",
  "dvmin",
  "dvmax",
  "dvb",
  "dvi",
  "svw",
  "svh",
  "svmin",
  "svmax",
  "svb",
  "svi",
  "lvw",
  "lvh",
  "lvmin",
  "lvmax",
  "lvb",
  "lvi",
  "cm",
  "mm",
  "in",
  "pt",
  "pc",
] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

/**
 * CSS Angle units
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/angle
 */
export const ANGLE_UNITS = ["deg", "rad", "grad", "turn"] as const;
export type AngleUnit = (typeof ANGLE_UNITS)[number];

/**
 * CSS Percentage unit
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/percentage
 */
export const PERCENTAGE_UNITS = ["%"] as const;

/**
 * Unitless number (no units)
 */
export const NUMBER_UNITS = [""] as const;

/**
 * Combined length and percentage units
 * Used for CSS properties that accept both length and percentage values
 * Examples: width, height, padding, margin, etc.
 */
export const LENGTH_PERCENTAGE_UNITS = [
  ...LENGTH_UNITS,
  ...PERCENTAGE_UNITS,
] as const;

/**
 * Combined number (unitless) and percentage units
 * Used for CSS properties like line-height that accept unitless numbers
 * Examples: "1.5", "150%"
 */
export const NUMBER_LENGTH_PERCENTAGE_UNITS = [
  ...NUMBER_UNITS,
  ...LENGTH_UNITS,
  ...PERCENTAGE_UNITS,
] as const;

/**
 * All CSS units (length, percentage, and angle)
 */
export const CSS_UNITS = [
  ...LENGTH_UNITS,
  ...PERCENTAGE_UNITS,
  ...ANGLE_UNITS,
] as const;

/**
 * CSS Zero type - unitless numeric value of 0
 * Examples: "0"
 */
export type Zero = "0";

/**
 * CSS Length type - distance value with length units
 * Examples: "10px", "2rem", "50vw"
 */
export type Length = `${string}${LengthUnit}` | Zero;

/**
 * CSS Percentage type - percentage value
 * Examples: "50%", "100%"
 */
export type Percentage = `${string}%`;

/**
 * CSS Angle type - angle value with angle units
 * Examples: "45deg", "1.5rad", "0.25turn"
 */
export type Angle = `${string}${AngleUnit}` | Zero;

/**
 * CSS Number type - unitless numeric value
 * Examples: "1", "0.5", "2"
 */
export type UnitlessNumber = string & {};

/**
 * LengthPercentage type - Length | Percentage
 * Used for values that can be either a length or percentage
 * Examples: "10px", "50%", "2rem"
 */
export type LengthOrPercentage = Length | Percentage;

/**
 * NumberPercentage type - Number | Percentage
 * Used for values that can be either a unitless number or percentage
 * Examples: "1", "0.5", "50%"
 */

export type NumberOrPercentage = UnitlessNumber | Percentage;

/**
 * Type name enum for runtime unit extraction
 */
export type ValueTypeName =
  | "Length"
  | "Percentage"
  | "Angle"
  | "UnitlessNumber"
  | "LengthOrPercentage"
  | "NumberOrPercentage";

/**
 * Gets allowed units for a CSS value type
 *
 * @param typeName The CSS value type name
 * @returns Array of allowed unit strings
 */
export function getAllowedUnitsForType(typeName: ValueTypeName) {
  switch (typeName) {
    case "Length":
      return LENGTH_UNITS;
    case "Percentage":
      return PERCENTAGE_UNITS;
    case "Angle":
      return ANGLE_UNITS;
    case "UnitlessNumber":
      return NUMBER_UNITS;
    case "LengthOrPercentage":
      return LENGTH_PERCENTAGE_UNITS;
    case "NumberOrPercentage":
      return [...NUMBER_UNITS, ...PERCENTAGE_UNITS];
    default:
      throw new Error(`Unknown type: ${typeName}`);
  }
}
