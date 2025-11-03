/**
 * CSS Length units
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/length
 */
export const LENGTH_UNITS = [
  "px",
  "em",
  "rem",
  "vw",
  "vh",
  "vmin",
  "vmax",
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
      return [...LENGTH_UNITS];
    case "Percentage":
      return [...PERCENTAGE_UNITS];
    case "Angle":
      return [...ANGLE_UNITS];
    case "UnitlessNumber":
      return [...NUMBER_UNITS];
    case "LengthOrPercentage":
      return [...LENGTH_UNITS, ...PERCENTAGE_UNITS];
    case "NumberOrPercentage":
      return [...NUMBER_UNITS, ...PERCENTAGE_UNITS];
    default:
      throw new Error(`Unknown type: ${typeName}`);
  }
}
