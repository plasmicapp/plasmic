import { ensure, removeWhere, tuple, withoutNils } from "@/wab/common";
import { getCssInitial, parseCssNumericNew, showCssValues } from "@/wab/css";
import { pick } from "lodash";
import { CSSProperties } from "react";

// Don't allow number
type StringCSSProperties = {
  [p in keyof CSSProperties]: CSSProperties[p] & string;
};

// Hack: The extra * is intentional to avoid it being removed by `parseCssValue`
// Should be in sync with cssPegParser.
export const bgClipTextTag = "/* clip: text **/";

export class BackgroundLayerArgs {
  image:
    | NoneBackground
    | ImageBackground
    | ColorFill
    | LinearGradient
    | RadialGradient;
  position?: StringCSSProperties["backgroundPosition"];
  size?: StringCSSProperties["backgroundSize"];
  repeat?: StringCSSProperties["backgroundRepeat"];
  origin?: StringCSSProperties["backgroundOrigin"];
  clip?: StringCSSProperties["backgroundClip"];
  attachment?: StringCSSProperties["backgroundAttachment"];
}

export class BackgroundLayer extends BackgroundLayerArgs {
  // Should be set true only when generating stylesheets, and just for the last
  // layer (`"background-color"` prop shouldn't go into the model).
  preferBackgroundColorOverColorFill: boolean = false;
  constructor(args: BackgroundLayerArgs) {
    super();
    Object.assign(
      this,
      pick(
        args,
        "image",
        "position",
        "size",
        "repeat",
        "origin",
        "clip",
        "attachment"
      )
    );
  }
  isNoneLayer() {
    return this.image instanceof NoneBackground;
  }
  hasTextClip() {
    return this.clip === "text" || this.clip === bgClipTextTag;
  }
  showCss() {
    if (this.isNoneLayer()) {
      return this.image.showCss();
    }

    const imageOrColor =
      this.preferBackgroundColorOverColorFill && this.image instanceof ColorFill
        ? this.image.color
        : this.image.showCss();

    if (this.image instanceof ColorFill) {
      // ColorFill doesn't offer any other controls, so we should fill the entire
      // picture
      return `${imageOrColor}`;
    }

    let size = this.size,
      position = this.position;
    // According to MDN, the <bg-size> value may only be included
    // immediately after <position>, separated with the '/' character,
    // like this: "center/80%".
    if (size) {
      if (!position) {
        position = getCssInitial("background-position", "div");
      }
      size = `/ ${size}`;
    }

    if (this.clip || this.origin) {
      // If background-clip and background-origin should have different values,
      // we need to set both (see W3C background spec
      // https://www.w3.org/TR/css-backgrounds-3/#background )
      this.clip = this.clip || getCssInitial("background-clip", "div");
      this.origin = this.origin || getCssInitial("background-origin", "div");
    }

    // "background-clip: text" does not work in the shorthand - it must be set
    // globally, separated and after the background shorthand.
    const clip = this.hasTextClip() ? bgClipTextTag : this.clip;
    return `${imageOrColor} ${position ?? ""} ${size ?? ""} ${
      this.repeat ?? ""
    } ${this.origin ?? ""} ${clip ?? ""} ${this.attachment ?? ""}`
      .replace(/\s+/g, " ")
      .trim();
  }
}

export function mkBackgroundLayer(
  image: BackgroundLayer["image"],
  overrides?: Omit<BackgroundLayerArgs, "image">
) {
  return new BackgroundLayer({
    image,
    position: getCssInitial("background-position", "div"),
    size: getCssInitial("background-size", "div"),
    repeat: "repeat",
    ...(overrides ?? {}),
  });
}

export class BackgroundArgs {
  layers: BackgroundLayer[];
}

export class Background extends BackgroundArgs {
  constructor(args: BackgroundArgs) {
    super();
    Object.assign(this, pick(args, "layers"));
  }
  // Remove "none" layers
  filterNoneLayers() {
    removeWhere(this.layers, (l) => l.isNoneLayer());
  }
  // Return true if any layer has "background-clip: text"
  hasTextClip() {
    return this.layers.some((l) => l.hasTextClip());
  }
  showCss() {
    return showCssValues(
      "background",
      this.layers.map((l) => l.showCss())
    );
  }
}

// background: none
export class NoneBackground {
  showCss() {
    return "none";
  }
}

export class ImageBackgroundArgs {
  url: string;
}
export class ImageBackground extends ImageBackgroundArgs {
  constructor(args: ImageBackgroundArgs) {
    super();
    Object.assign(this, pick(args, "url"));
  }
  showCss() {
    if (this.url.startsWith("var(--")) {
      return this.url;
    } else {
      // eslint-disable-next-line no-useless-escape
      return `url(\"${this.url}\")`;
    }
  }
}

export class ColorFillArgs {
  color: string;
}

/**
 * This is a hack to provide background fill layers. CSS does not support
 * adding a background-image layer with just a color, so we create a
 * linear-gradient from ${color} to ${color} instead. Our PEG parser will
 * know the difference from ColorFill to LinearGradient because LinearGradient
 * always have an angle as the first parameter, while ColorFill has only
 * colors.
 */
export class ColorFill extends ColorFillArgs {
  constructor(args: ColorFillArgs) {
    super();
    Object.assign(this, pick(args, "color"));
  }
  showCss() {
    return `linear-gradient(${this.color}, ${this.color})`;
  }
}

export class LinearGradientArgs {
  repeating: boolean;
  angle: number;
  stops: Stop[];
}
export class LinearGradient extends LinearGradientArgs {
  constructor(args: LinearGradientArgs) {
    super();
    Object.assign(this, pick(args, "repeating", "angle", "stops"));
  }
  showCss() {
    const name = `${this.repeating ? "repeating-" : ""}linear-gradient`;
    const angle = this.angle != null ? `${this.angle}deg, ` : "";
    const stops = [...this.stops].map((stop) => stop.showCss()).join(", ");
    return `${name}(${angle}${stops})`;
  }
}

export class RadialGradientArgs {
  repeating: boolean;
  cx: Dim;
  cy: Dim;
  rx: Dim;
  ry: Dim;
  stops: Stop[];
}
export class RadialGradient extends RadialGradientArgs {
  constructor(args: RadialGradientArgs) {
    super();
    Object.assign(
      this,
      pick(args, "repeating", "cx", "cy", "rx", "ry", "stops")
    );
  }
  showCss() {
    const name = `${this.repeating ? "repeating-" : ""}radial-gradient`;
    const ellipse = `ellipse ${this.rx.showCss()} ${this.ry.showCss()} at ${this.cx.showCss()} ${this.cy.showCss()}`;
    const stops = [...this.stops]
      .map((stop: /*TWZ*/ Stop | Stop) => stop.showCss())
      .join(", ");
    return `${name}(${ellipse}, ${stops})`;
  }
}

export class Stop {
  constructor(public color: string, public dim: Dim) {
    this.color = color;
    this.dim = dim;
  }
  clone() {
    return new Stop(this.color, this.dim);
  }
  showCss() {
    return withoutNils(
      tuple(this.color, this.dim != null ? this.dim.showCss() : undefined)
    ).join(" ");
  }
}

export class Dim {
  constructor(public value: number, public unit: string) {}
  showCss() {
    return `${this.value}${this.unit}`;
  }
  setValue(v: string) {
    const parsed = parseCssNumericNew(v);
    if (parsed !== undefined) {
      this.value = parsed.num;
      this.unit = parsed.units;
    } else {
      ensure(parsed);
    }
  }
}

export class BoxShadowArgs {
  inset: boolean | number;
  x: Dim;
  y: Dim;
  blur: Dim;
  spread: Dim;
  color: string;
}
export class BoxShadow extends BoxShadowArgs {
  constructor(args: BoxShadowArgs) {
    super();
    Object.assign(
      this,
      pick(args, "inset", "x", "y", "blur", "spread", "color")
    );
  }
  showCss() {
    const inset = this.inset ? "inset " : "";
    const parts = [this.x, this.y, this.blur, this.spread].map((x: Dim) =>
      x.showCss()
    );
    return `${inset}${parts.join(" ")} ${this.color}`;
  }
}

export class BoxShadows {
  shadows: BoxShadow[];
  constructor(shadows: BoxShadow[]) {
    this.shadows = shadows;
  }
  showCss() {
    return this.shadows
      .map((s: /*TWZ*/ BoxShadow | BoxShadow) => s.showCss())
      .join(", ");
  }
}
