import chromajs from "chroma-js";
import mapValues from "lodash/mapValues";

type PlasmicChroma = typeof chromajs & {
  isLiteralUnpickedColor(color: string): boolean;
  isLiteralTransparent(color: string): boolean;
  stringify(color: string): string;
};

function adjustChromaFunction(maybeFunction: any) {
  return typeof maybeFunction === "function"
    ? (...args: any[]) =>
        maybeFunction(
          ...args.map((arg: any) =>
            typeof arg === "string" && Chroma.isLiteralTransparent(arg)
              ? "#00000000"
              : arg
          )
        )
    : maybeFunction;
}

export const Chroma = adjustChromaFunction(chromajs) as PlasmicChroma;

Object.assign(Chroma, mapValues(chromajs, adjustChromaFunction), {
  isLiteralUnpickedColor: (color: string) => {
    return /currentColor|initial|inherit|unset/i.test(color);
  },
  isLiteralTransparent: (color: string) => {
    return /transparent/i.test(color);
  },

  stringify(colorValue: string) {
    return Chroma.isLiteralTransparent(colorValue) || !Chroma.valid(colorValue)
      ? colorValue
      : Chroma(colorValue).hex();
  },
});

export function getShortenedRgb(color: string) {
  return `rgba(${Chroma(color).rgb().join(", ")})`;
}

export const chroma = Chroma;
export default Chroma;
