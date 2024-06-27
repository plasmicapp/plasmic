import styles from "@/wab/client/components/canvas/HoverBox/SpacingVisualizer.module.sass";
import { cx } from "@/wab/shared/common";
import { Side } from "@/wab/shared/geom";
import * as React from "react";

type SpacingValues = Record<Side, number>;

const EMPTY_SPACING: SpacingValues = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

interface Props {
  allowPadding: boolean;
  allowMargin: boolean;
  paddingPx: SpacingValues | undefined;
  marginPx: SpacingValues | undefined;
  zoom: number;
}

function applyZoom(spacingValues: SpacingValues, zoom: number) {
  if (spacingValues === EMPTY_SPACING) {
    return EMPTY_SPACING;
  }

  const values = { ...spacingValues };
  Object.keys(values).forEach((side) => {
    values[side] = values[side] * zoom;
  });
  return values;
}

export function _SpacingVisualizer(props: Props) {
  const {
    allowPadding,
    allowMargin,
    paddingPx = EMPTY_SPACING,
    marginPx = EMPTY_SPACING,
    zoom,
  } = props;

  if (!allowPadding && !allowMargin) {
    return null;
  }

  const zoomedPaddingPx = applyZoom(paddingPx, zoom);
  const zoomedMarginPx = applyZoom(marginPx, zoom);

  return (
    <div className={styles.container}>
      {allowPadding && (
        <SpacingVisualizerMaskedShape
          offsetTop={zoomedPaddingPx.top}
          offsetBottom={zoomedPaddingPx.bottom}
          offsetLeft={zoomedPaddingPx.left}
          offsetRight={zoomedPaddingPx.right}
        />
      )}

      {allowMargin && (
        <div
          style={{
            position: "absolute",
            top: -1 * zoomedMarginPx.top,
            left: -1 * zoomedMarginPx.left,
            right: -1 * zoomedMarginPx.right,
            bottom: -1 * zoomedMarginPx.bottom,
          }}
        >
          <SpacingVisualizerMaskedShape
            isMargin={true}
            offsetTop={zoomedMarginPx.top}
            offsetBottom={zoomedMarginPx.bottom}
            offsetLeft={zoomedMarginPx.left}
            offsetRight={zoomedMarginPx.right}
          />
        </div>
      )}
    </div>
  );
}

function SpacingVisualizerMaskedShape(props: {
  isMargin?: boolean;
  offsetTop: number;
  offsetLeft: number;
  offsetRight: number;
  offsetBottom: number;
}) {
  const { isMargin, offsetTop, offsetLeft, offsetRight, offsetBottom } = props;

  const left = `${offsetLeft}px`;
  const top = `${offsetTop}px`;
  const right = `calc(100% - ${offsetRight}px)`;
  const bottom = `calc(100% - ${offsetBottom}px)`;

  return (
    <div
      className={cx(styles.mask, isMargin && styles.isMargin)}
      style={{
        clipPath: `polygon(
            0% 0%,
            0% 100%,
            ${left} 100%,
            ${left} ${top},
            ${right} ${top},
            ${right} ${bottom},
            ${offsetLeft}px ${bottom},
            ${offsetLeft}px 100%,
            100% 100%,
            100% 0%
        )`,
      }}
    >
      <div className={styles.background} />
      <div className={styles.pattern} />
    </div>
  );
}

export const SpacingVisualizer = React.memo(_SpacingVisualizer);
