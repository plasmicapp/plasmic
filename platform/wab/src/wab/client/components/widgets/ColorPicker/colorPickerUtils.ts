/* eslint-disable no-case-declarations */
import { Chroma } from "../../../../shared/utils/color-utils";

export const enum ColorMode {
  hex = "hex",
  rgb = "rgb",
  hsl = "hsl",
}

export function getShortColorHex(color: string) {
  if (Chroma.isLiteralUnpickedColor(color)) {
    return color;
  }

  if (!color || Chroma.isLiteralTransparent(color)) {
    return "#000000";
  }

  return Chroma.valid(color)
    ? Chroma(color).hex("rgb")?.toUpperCase()
    : "#000000";
}

export function getFullColorRepresentation(color: string, mode: ColorMode) {
  color = color.trim().replace(/^#/, "");

  if (/[a-z]+/i.test(color) && Chroma.valid(color)) {
    color = getShortenedColor(getShortColorHex(color), mode);
  } else if (/^[0-9a-f]{1,5}$/i.test(color)) {
    if (color.length <= 2) {
      // f -> ffffff
      // f0 -> f0f0f0
      color = color.repeat(6 / color.length);
    } else {
      // 08ef -> 08e -> 0088ee
      // 0000 -> 000 -> 000000
      color = color.substr(0, 3);
    }

    color = getShortenedColor(getShortColorHex(color), mode);
  }

  switch (mode) {
    case ColorMode.hex:
      return `#${color.replace(/#/, "")}`;

    case ColorMode.rgb:
      return `rgb(${color.replace(/^\s*rgba?\(/i, "").replace(/\)/, "")})`;

    case ColorMode.hsl:
      const [h, s, l] = color
        .trim()
        .replace(/^hsla?\(/i, "")
        .replace(/\)/, "")
        .split(/\s*,\s*/)
        .map((it) => parseInt(it.replace(/[^\d]/g, "")));

      return `hsl(${h || 0}, ${s}%, ${l}%)`;
  }
}

export function getShortenedHSL(h: number, s: number, l: number) {
  return `${Math.round(h || 0)}, ${Math.round(s)}%, ${Math.round(l)}%`;
}

export function getShortenedColor(color: string, mode: ColorMode) {
  if (!Chroma.valid(color)) {
    return "";
  }

  switch (mode) {
    case ColorMode.hex:
      return getShortColorHex(color);

    case ColorMode.rgb:
      return `${Chroma(color).rgb().join(", ")}`;

    case ColorMode.hsl:
      const [h, s, l] = Chroma(color).hsl();
      return getShortenedHSL(h, s * 100, l * 100);
  }
}

export function getColorComponents(value: string, selectionStart?: number) {
  return Array.from(value.matchAll(/\d+/g)).map((match: any) => {
    const start = match.index;
    const end = start + match[0].length;
    return {
      value: parseInt(match[0], 10),
      start,
      end,
      editing:
        selectionStart !== undefined &&
        selectionStart >= start &&
        selectionStart <= end,
    };
  });
}

export function getColorAlpha(color: string) {
  return color && Chroma.isLiteralUnpickedColor(color)
    ? 100
    : Chroma.valid(color)
    ? Math.round(Chroma(color).alpha() * 100)
    : 0;
}
