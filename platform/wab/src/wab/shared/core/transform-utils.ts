import { ensure } from "@/wab/shared/common";
import { Dictionary } from "lodash";

type TransformType = "move" | "rotate" | "scale" | "skew";

export interface Transform {
  type: TransformType;
  X: string;
  Y: string;
  Z?: string;
}

export const defaultTransforms: Dictionary<Transform> = {
  move: {
    type: "move",
    X: "0px",
    Y: "0px",
    Z: "0px",
  },
  rotate: {
    type: "rotate",
    X: "0deg",
    Y: "0deg",
    Z: "0deg",
  },
  scale: {
    type: "scale",
    X: "1",
    Y: "1",
    Z: "1",
  },
  skew: {
    type: "skew",
    X: "0deg",
    Y: "0deg",
  },
};

const unitSliderConfig = {
  px: {
    step: 1,
    min: -1000,
    max: 1000,
  },
  deg: {
    step: 1,
    min: -180,
    max: 180,
  },
  "%": {
    step: 1,
    min: -200,
    max: 200,
  },
  rad: {
    step: 0.1,
    min: -3.2,
    max: 3.2,
  },
  grad: {
    step: 1,
    min: -180,
    max: 180,
  },
  turn: {
    step: 0.1,
    min: -5,
    max: 5,
  },
};

export const transformAllowedUnits = {
  move: ["px", "%"],
  rotate: ["deg", "rad", "grad", "turn"],
  scale: [""],
  skew: ["deg", "rad", "grad", "turn"],
};

export const getSliderConfig = (unit: string) => {
  return (
    unitSliderConfig[unit] || {
      step: 0.01,
      min: -5,
      max: 5,
    }
  );
};

export const transformToFunction = {
  move: "translate",
  rotate: "rotate",
  scale: "scale",
  skew: "skew",
};

export const functionToTransform = {
  translate: "move",
  rotate: "rotate",
  scale: "scale",
  skew: "skew",
};

/**
 * TRANSFORM_PATTERN is going to match string in the format `name(Xunit)`
 *
 * TRANSFORM_SPLIT_PATTERN is going a version of TRANSFORM_PATTERN, but allowing
 * matches in such a way, that `name(Xunit)` is splited into ['name(', 'Xunit', ')']
 * when applying the match
 */
const TRANSFORM_PATTERN =
  /([a-zA-Z0-9]+)\((-?[0-9]+\.?[0-9]*((deg)|(px)|(rad)|%|(grad)|(turn))?)\)/g;
const TRANSFORM_SPLIT_PATTERN =
  /([a-zA-Z0-9]+)\(|(-?[0-9]+\.?[0-9]*((deg)|(px)|(rad)|%|(grad)|(turn))?)|\)/g;

export const fromTransformStringToObj = (rawTransform: string): Transform => {
  const functions = rawTransform.match(TRANSFORM_PATTERN);
  if (!functions) {
    return defaultTransforms.move;
  }

  const transform: Transform = {
    type: "move",
    X: "",
    Y: "",
    Z: undefined,
  };

  functions.forEach((rawFunction) => {
    const m = ensure(rawFunction.match(TRANSFORM_SPLIT_PATTERN));
    const name = m[0].slice(0, -2);
    const axis = m[0][m[0].length - 2];
    transform.type = functionToTransform[name];
    transform[axis] = m[1];
  });
  return transform;
};

export const fromTransformObjToString = (transform: Transform) => {
  return ["X", "Y", "Z"]
    .map((axis) => {
      if (transform.type === "skew" && axis === "Z") {
        return "";
      }
      return `${transformToFunction[transform.type]}${axis}(${
        transform[axis]
      })`;
    })
    .join(" ");
};

export const parseSelfPerspective = (rawSelfPerspective: string) => {
  const m = rawSelfPerspective.match(TRANSFORM_SPLIT_PATTERN);
  if (!m) {
    return undefined;
  }
  return m[1];
};

const ORIGIN_KEYWORDS = ["center", "left", "right", "top", "bottom"];

const convertOriginKeyword = (value: string, dir: "left" | "top") => {
  if (!ORIGIN_KEYWORDS.includes(value)) {
    return value;
  }

  if (
    value === "center" ||
    (dir === "left" && ["top", "bottom"].includes(value)) ||
    (dir === "top" && ["left", "right"].includes(value))
  ) {
    return "50%";
  }

  return dir === value ? "0%" : "100%";
};

export const parseOrigin = (origin: string | undefined) => {
  if (!origin) {
    return {
      left: undefined,
      top: undefined,
    };
  }
  const m = origin.split(" ");
  if (m.length === 1) {
    return {
      left: convertOriginKeyword(m[0], "left"),
      top: convertOriginKeyword(m[0], "top"),
    };
  }
  return {
    left: convertOriginKeyword(m[0], "left"),
    top: convertOriginKeyword(m[1], "top"),
  };
};

export const has3dComponent = (transformString: string) => {
  if (transformString.includes("perspective")) {
    return parseSelfPerspective(transformString) !== "0px";
  }
  const transform = fromTransformStringToObj(transformString);
  if (transform.type === "skew") {
    return false;
  } else if (transform.type === "rotate") {
    return (
      transform.X !== defaultTransforms[transform.type].X ||
      transform.Y !== defaultTransforms[transform.type].Y
    );
  } else if (transform.type === "move" || transform.type === "scale") {
    return transform.Z !== defaultTransforms[transform.type].Z;
  } else {
    return false;
  }
};
