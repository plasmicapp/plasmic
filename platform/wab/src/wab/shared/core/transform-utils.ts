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

export const getSliderConfig = (unit: string) => {
  return (
    unitSliderConfig[unit] || {
      step: 0.01,
      min: -5,
      max: 5,
    }
  );
};

/**
 * Transform Migration Utils
 */
// migrateTransformsValue.ts
type TransformType = "translate" | "rotate" | "scale" | "skew";

interface Transform {
  type: TransformType;
  X: string;
  Y: string;
  Z?: string;
}

const defaultTransforms: Record<TransformType, Transform> = {
  translate: { type: "translate", X: "0px", Y: "0px", Z: "0px" },
  rotate: { type: "rotate", X: "0deg", Y: "0deg", Z: "0deg" },
  scale: { type: "scale", X: "1", Y: "1", Z: "1" },
  skew: { type: "skew", X: "0deg", Y: "0deg" },
};

/** Match single-axis functions like translateX(10px), rotateZ(45deg), scaleY(2), etc. */
const SINGLE_AXIS_FN =
  /([a-zA-Z0-9]+)([XYZ])\((-?[0-9]+\.?[0-9]*((deg)|(px)|(rad)|%|(grad)|(turn))?)\)/g;

/** Split strictly by triple '$$$' delimiter */
const GROUP_SPLIT = /\${3}/g;

const ZERO_RE = /^\s*[-+]?0(?:\.0+)?(?:deg|px|rad|grad|turn|%)?\s*$/i;

const isZero = (v?: string) => !v || ZERO_RE.test(v);

/**
 * Parse an angle value like "45deg", "1.5rad", etc. into degrees
 */
function parseAngleToDegrees(angleStr: string): number {
  const match = angleStr.match(/^(-?[0-9]+\.?[0-9]*)(deg|rad|grad|turn)?$/);
  if (!match) {
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "deg";

  switch (unit) {
    case "deg":
      return value;
    case "rad":
      return (value * 180) / Math.PI;
    case "grad":
      return value * 0.9; // 1 grad = 0.9 degrees
    case "turn":
      return value * 360;
    default:
      return value;
  }
}

/**
 * Combines multiple rotation axes (X, Y, Z) into a single rotate3d transformation
 * using quaternion mathematics to compute the equivalent axis-angle representation.
 */
function combineRotations(rotX: string, rotY: string, rotZ: string): string {
  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const rxDeg = parseAngleToDegrees(rotX);
  const ryDeg = parseAngleToDegrees(rotY);
  const rzDeg = parseAngleToDegrees(rotZ);

  const rx = toRad(rxDeg);
  const ry = toRad(ryDeg);
  const rz = toRad(rzDeg);

  // Unit quaternions for X/Y/Z
  const qx = [Math.cos(rx / 2), Math.sin(rx / 2), 0, 0]; // [w, x, y, z]
  const qy = [Math.cos(ry / 2), 0, Math.sin(ry / 2), 0];
  const qz = [Math.cos(rz / 2), 0, 0, Math.sin(rz / 2)];

  // Hamilton product: a ⨂ b
  const mul = (a, b) => {
    const [w1, x1, y1, z1] = a;
    const [w2, x2, y2, z2] = b;
    return [
      w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
      w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
      w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
      w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    ];
  };

  // CSS order: rotateX(...) rotateY(...) rotateZ(...)
  // Applied as Z then Y then X => q = qx ⨂ qy ⨂ qz
  let q = mul(mul(qx, qy), qz);

  // Normalize
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  q = q.map((v) => v / (len || 1));

  const [w, x, y, z] = q;

  // Axis-angle
  const clampedW = Math.max(-1, Math.min(1, w));
  const angle = 2 * Math.acos(clampedW);
  const s = Math.sqrt(Math.max(0, 1 - clampedW * clampedW)); // |sin(angle/2)|

  let ax, ay, az;
  if (s < 1e-8) {
    // Angle ~ 0: axis can be anything unit; use X-axis
    ax = 1;
    ay = 0;
    az = 0;
  } else {
    ax = x / s;
    ay = y / s;
    az = z / s;
  }

  // Normalize axis for CSS rotate3d (not strictly required but nice)
  const axisLen = Math.hypot(ax, ay, az) || 1;
  ax /= axisLen;
  ay /= axisLen;
  az /= axisLen;

  const angleDeg = toDeg(angle);

  return `rotate3d(${ax.toFixed(6)}, ${ay.toFixed(6)}, ${az.toFixed(
    6
  )}, ${angleDeg.toFixed(4)}deg)`;
}

/**
 * Convert per-axis functions into a standard 3d version of transform
 * translateX() translateY() translateZ() -> translate3d(X, Y, Z)
 * rotateX() rotateY() rotateZ() -> rotate3d(X, Y, Z, angle)
 * scaleX() scaleY() scaleZ() -> scale3d(X, Y, Z)
 * skewX() skewY() -> skew(X, Y)
 */
function normalizeSingleTransformTo3dFormat(group: string): string {
  const axesByType: Record<TransformType, Transform> = {
    translate: { ...defaultTransforms.translate },
    rotate: { ...defaultTransforms.rotate },
    scale: { ...defaultTransforms.scale },
    skew: { ...defaultTransforms.skew },
  };

  let matchedAny = false;

  group.replace(
    SINGLE_AXIS_FN,
    (_m, rawName: string, axis: "X" | "Y" | "Z", value: string) => {
      const base = rawName.toLowerCase();
      if (!(base in axesByType)) {
        return _m;
      }
      axesByType[base as TransformType][axis] = value;
      matchedAny = true;
      return _m;
    }
  );

  if (!matchedAny) {
    return group.trim();
  }

  // detect which transform type has changed
  const touched = (t: TransformType) =>
    JSON.stringify(axesByType[t]) !== JSON.stringify(defaultTransforms[t]);

  const type: TransformType = touched("rotate")
    ? "rotate"
    : touched("translate")
    ? "translate"
    : touched("scale")
    ? "scale"
    : "skew";

  const t = axesByType[type];

  switch (type) {
    case "translate": {
      const x = t.X ?? "0px";
      const y = t.Y ?? "0px";
      const z = t.Z ?? "0px";
      return `translate3d(${x}, ${y}, ${z})`;
    }
    case "scale": {
      const x = t.X ?? "1";
      const y = t.Y ?? "1";
      const z = t.Z ?? "1";
      return `scale3d(${x}, ${y}, ${z})`;
    }
    case "rotate": {
      const rx = t.X ?? "0deg";
      const ry = t.Y ?? "0deg";
      const rz = t.Z ?? "0deg";

      const nonZeroAxes = [rx, ry, rz].filter((v) => !isZero(v)).length;

      // If more than one axis is non-zero → use quaternion-based combineRotations
      // to compute the equivalent single-axis rotate3d(x, y, z, angle)
      if (nonZeroAxes > 1) {
        return combineRotations(rx, ry, rz);
      }

      let axisVec = ["0", "0", "1"];
      let angle = rz;

      if (!isZero(rz)) {
        axisVec = ["0", "0", "1"];
        angle = rz;
      } else if (!isZero(rx)) {
        axisVec = ["1", "0", "0"];
        angle = rx;
      } else if (!isZero(ry)) {
        axisVec = ["0", "1", "0"];
        angle = ry;
      } else {
        axisVec = ["0", "0", "1"];
        angle = "0deg";
      }

      return `rotate3d(${axisVec.join(", ")}, ${angle})`;
    }
    case "skew": {
      const x = t.X ?? defaultTransforms.skew.X;
      const y = t.Y ?? defaultTransforms.skew.Y;
      return `skew(${x}, ${y})`;
    }
  }
}

/**
 * Migrates a legacy transform string (with $$$ separators)
 * into a standard transform value format with space separated functions.
 */
function migrateTransformsValue(oldValue: string): string {
  if (!oldValue || !oldValue.trim()) {
    return oldValue;
  }

  const groups = oldValue.split(GROUP_SPLIT);

  return groups
    .map((g) => g.trim())
    .filter((g) => g.length > 0)
    .map(normalizeSingleTransformTo3dFormat)
    .join(" ");
}

export const _migrationOnlyUtil = {
  migrateTransformsValue,
  normalizeSingleTransformTo3dFormat,
  isZero,
};
