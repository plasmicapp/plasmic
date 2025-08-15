import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import { FullRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { DefinedIndicator } from "@/wab/client/components/style-controls/DefinedIndicator";
import styles from "@/wab/client/components/style-controls/PosControls.module.sass";
import {
  createStyleContextMenu,
  ExpsProvider,
  getLabelForStyleName,
  mkStyleComponent,
  StyleComponentProps,
  useSidebarPopupSetting,
} from "@/wab/client/components/style-controls/StyleComponent";
import Button from "@/wab/client/components/widgets/Button";
import {
  DimTokenSpinner,
  DimValueOpts,
} from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import { DimManip, roundDim } from "@/wab/client/DimManip";
import { useQuerySelector } from "@/wab/client/hooks/useQuerySelector";
import ArrowBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowBottom";
import ArrowLeftIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowLeft";
import ArrowRightIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowRight";
import ArrowTopIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__ArrowTop";
import PositionCornerIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__PositionCorner";
import PositionCoverIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__PositionCover";
import PositionSideIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__PositionSide";
import { useForwardedRef } from "@/wab/commons/components/ReactUtil";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { TokenType, tryParseTokenRef } from "@/wab/commons/StyleToken";
import { sidesAndCorners } from "@/wab/commons/ViewUtil";
import { cx, ensure, maybe, spawn } from "@/wab/shared/common";
import { siteFinalStyleTokensAllDeps } from "@/wab/shared/core/site-style-tokens";
import { parseCssNumericNew } from "@/wab/shared/css";
import { ensureUnit } from "@/wab/shared/css-size";
import { isIndicatorExplicitlySet } from "@/wab/shared/defined-indicator";
import {
  Corner,
  cornerToSides,
  isStandardCorner,
  isStandardSide,
  oppSide,
  Orient,
  Side,
  sideToAdjacentSides,
  standardCorners,
  standardSides,
} from "@/wab/shared/geom";
import { IRuleSetHelpers, IRuleSetHelpersX } from "@/wab/shared/RuleSetHelpers";
import { Tooltip } from "antd";
import { MenuProps } from "antd/lib/menu";
import $ from "jquery";
import L from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import {
  DismissButton,
  FocusScope,
  mergeProps,
  OverlayProvider,
  useDialog,
  useModal,
  useOverlay,
  useOverlayPosition,
  useOverlayTrigger,
} from "react-aria";
import * as ReactDOM from "react-dom";
import { useOverlayTriggerState } from "react-stately";

interface MeasureControlProps extends StyleComponentProps {
  prop: Side;
  exp?: IRuleSetHelpers;
  manip: DimManip;
  menu: () => React.ReactElement<MenuProps>;
  dimOpts?: Partial<DimValueOpts>;
}

function MeasureControl_(props: MeasureControlProps) {
  // TODO: Wanted to make this more accessible...
  // We're doing all sorts of	weird focusing things with
  // DimSpinner / Textbox :-O  When you press ESC / ENTER, we'd ideally
  // restore focus back to the originating trigger.	But right now
  // TextBox	explicitly blurs() itself, putting focus on body, and
  // useRestoreFocus() requires focus to be within FocusScope to restore.

  const { prop, expsProvider, manip, dimOpts } = props;
  const studioCtx = expsProvider.studioCtx;
  const exp = () => props.exp || expsProvider.mergedExp();
  const initValRef = React.useRef<string | undefined>(undefined);
  const isDraggingRef = React.useRef(false);

  const state = useOverlayTriggerState({});
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const sidebarSetting = useSidebarPopupSetting();
  const selector = sidebarSetting
    ? sidebarSetting.left
      ? ".canvas-editor__left-pane"
      : ".canvas-editor__right-pane"
    : "body";
  const container = useQuerySelector(selector);

  const {
    triggerProps: { onPress, ...triggerProps },
    overlayProps,
  } = useOverlayTrigger({ type: "dialog" }, state, triggerRef);
  const { overlayProps: overlayPositionProps } = useOverlayPosition({
    targetRef: triggerRef,
    overlayRef,
    placement: "bottom",
    offset: 5,
    isOpen: state.isOpen,
    boundaryElement: container,
  });

  const dir: Orient = ["bottom", "top"].includes(prop) ? "vert" : "horiz";

  /**
   * Precondition: prop must currently be auto.  This is for *initializing*
   * the prop for the first time to non-auto (either click/drag).
   */
  const initDim = (e: React.MouseEvent) => {
    if (exp().get(prop) !== "auto") {
      return;
    }

    const existingUnit = maybe(
      parseCssNumericNew(exp().get(oppSide(prop))),
      ({ units }) => ensureUnit(units)
    );

    if (e.metaKey || e.ctrlKey) {
      // If clicked while holding down ctrl, will swap from setting
      // oppSide to this side
      exp().set(oppSide(prop), "auto");
    }
    manip.trySetUsingMeasured(existingUnit || "px");
  };

  const sc = mkStyleComponent(props);
  const indicator = sc.definedIndicator(prop);

  const rawValue = exp().get(prop);
  const maybeToken = tryParseTokenRef(rawValue, () =>
    siteFinalStyleTokensAllDeps(studioCtx.site)
  );

  return (
    <WithContextMenu overlay={props.menu}>
      <Tooltip title={getLabelForStyleName(prop)}>
        <Button
          type="seamless"
          {...(triggerProps as any)}
          ref={triggerRef}
          onMouseDown={() => {
            isDraggingRef.current = false;
          }}
          onClick={(e) => {
            if (isDraggingRef.current) {
              return;
            }

            spawn(
              studioCtx.changeUnsafe(() => {
                if (exp().get(prop) !== "auto") {
                  if (e.metaKey || e.ctrlKey) {
                    exp().set(prop, "auto");
                  } else {
                    state.open();
                  }
                  return;
                }

                initDim(e);
              })
            );
          }}
          data-plasmic-pos-trigger={prop}
        >
          <XDraggable
            onStart={async (e) => {
              isDraggingRef.current = true;
              studioCtx.startUnlogged();
              await studioCtx.changeUnsafe(() => initDim(e.mouseEvent as any));
              initValRef.current = exp().get(prop);
            }}
            onDrag={(e) => {
              const parsed = parseCssNumericNew(
                ensure(initValRef.current, `initValRef should be set`)
              );
              const { num, units } = parsed || {
                num: 0,
                units: "px",
              };
              const reverse = prop === "top" || prop === "left" ? 1 : -1;
              const delta = dir === "horiz" ? e.data.deltaX : e.data.deltaY;
              const unit = units || "px";
              const dimVal = roundDim(num + delta * reverse, unit);
              const newVal = `${dimVal}${unit}`;
              spawn(
                studioCtx.changeUnsafe(() => {
                  manip.setNum(newVal);
                })
              );
            }}
            onStop={() => {
              studioCtx.stopUnlogged();
            }}
          >
            <div
              className={cx({
                fg: isIndicatorExplicitlySet(indicator),
                "textbox--unset": !isIndicatorExplicitlySet(indicator),
                code: true,
                "ew-resize": ["left", "right"].includes(prop),
                "ns-resize": ["top", "bottom"].includes(prop),
                "no-select": true,
              })}
            >
              {maybeToken && (
                <Tooltip title={`Spacing token ${maybeToken.name}`}>
                  <div className="position-legend">{maybeToken.name}</div>
                </Tooltip>
              )}
              {!maybeToken && rawValue}
            </div>
          </XDraggable>
        </Button>
      </Tooltip>
      {state.isOpen &&
        container &&
        ReactDOM.createPortal(
          <OverlayProvider>
            <div className="right-pane__mask dim-spinner-popup-mask">
              <Popover
                {...overlayProps}
                {...overlayPositionProps}
                ref={overlayRef}
                aria-label={getLabelForStyleName(prop)}
                isOpen={state.isOpen}
                onClose={state.close}
                className="dim-spinner-popup"
                isOutsidePopover={(e) => {
                  return !$(e).parents().is(".dropdown-overlay");
                }}
              >
                <FullRow>
                  <DimTokenSpinner
                    value={exp().get(prop)}
                    onChange={(val, type) => {
                      spawn(
                        studioCtx.changeUnsafe(() => {
                          // we only close the popup when user select from the
                          // dropdown
                          if (type !== "spin") {
                            state.close();
                          }
                          exp().set(prop, val || "auto");
                        })
                      );
                    }}
                    extraOptions={["auto"]}
                    fieldAriaProps={{
                      "aria-label": getLabelForStyleName(prop),
                    }}
                    studioCtx={studioCtx}
                    tokenType={TokenType.Spacing}
                    autoFocus
                    minDropdownWidth={200}
                    styleType={["white"]}
                    onEscape={() => state.close()}
                    data-plasmic-prop={prop}
                    {...(dimOpts || {})}
                  />
                </FullRow>
              </Popover>
            </div>
          </OverlayProvider>,
          container
        )}
    </WithContextMenu>
  );
}

const MeasureControl = observer(MeasureControl_);

export const GenericPosPushButtons = observer(
  function GenericPosPushButtons(props: {
    expsProvider: ExpsProvider;
    directions: ReadonlyArray<Side | Corner | "cover">;
    zeroSides: (
      exp: IRuleSetHelpersX,
      sidesToZero: ReadonlyArray<Side>
    ) => void;
  }) {
    const { expsProvider, directions, zeroSides } = props;

    const sc = expsProvider.studioCtx;

    function push(part: Side | Corner | "cover") {
      spawn(
        sc.changeUnsafe(() => {
          const exp = expsProvider.mergedExp();
          for (const side of standardSides) {
            if (exp.get(side) !== "auto") {
              exp.set(side, "auto");
            }
          }
          // Pushing against an edge, like pushing against bottom, should also
          // expand horizontally, so adjacent sides are also zero'd.
          const sidesToZero = isStandardSide(part)
            ? sideToAdjacentSides(part)
            : isStandardCorner(part)
            ? cornerToSides(part)
            : standardSides;
          zeroSides(exp, sidesToZero);
        })
      );
    }
    return (
      <div className="flex flex-fill justify-between">
        {directions.map((dir) => (
          <Tooltip title={`Push to ${getLabelForStyleName(dir)}`}>
            <IconButton size="small" onClick={() => push(dir)}>
              {DIRECTION_ICONS[dir]}
            </IconButton>
          </Tooltip>
        ))}
      </div>
    );
  }
);

export const PosPushButtons = observer(function PosPushButtons(props: {
  expsProvider: ExpsProvider;
}) {
  const { expsProvider } = props;
  const directions = [...standardCorners, ...standardSides, "cover"] as const;

  function zeroSides(exp: IRuleSetHelpersX, sidesToZero: ReadonlyArray<Side>) {
    for (const side of sidesToZero) {
      exp.set(side, "0");
    }
    if (sidesToZero.includes("left") && sidesToZero.includes("right")) {
      exp.set("width", "auto");
    }
    if (sidesToZero.includes("top") && sidesToZero.includes("bottom")) {
      exp.set("height", "auto");
    }
  }

  return (
    <GenericPosPushButtons
      expsProvider={expsProvider}
      directions={directions}
      zeroSides={zeroSides}
    />
  );
});

const DIRECTION_ICONS = {
  "top-left": <Icon icon={PositionCornerIcon} />,
  "top-right": <Icon icon={PositionCornerIcon} className="flip-horiz" />,
  "bottom-right": <Icon icon={PositionCornerIcon} className="rotated-180" />,
  "bottom-left": <Icon icon={PositionCornerIcon} className="flip-vert" />,
  left: <Icon icon={PositionSideIcon} />,
  right: <Icon icon={PositionSideIcon} className="flip-horiz" />,
  top: <Icon icon={PositionSideIcon} className="rotated-90" />,
  bottom: <Icon icon={PositionSideIcon} className="rotated-270" />,
  cover: <Icon icon={PositionCoverIcon} />,
} as const;

export const PosControls2 = observer(function PosControls2(props: {
  expsProvider: ExpsProvider;
  posProp?: string;
  exp?: IRuleSetHelpers;
  dimOpts?: Partial<DimValueOpts>;
}) {
  const { expsProvider, posProp, dimOpts } = props;
  const exp = props.exp || expsProvider.mergedExp();
  return (
    <div className={styles.Nums}>
      {sidesAndCorners({
        side: (side) => {
          const cssIndicatorType = expsProvider.definedIndicator(
            posProp || side
          );
          // We only show cssIndicatorType for the defined side.
          const indicatorType =
            !posProp || exp.has(side)
              ? cssIndicatorType
              : { source: "none" as const };
          const manip = new DimManip(
            expsProvider.studioCtx,
            expsProvider.forDom(),
            () => exp,
            side
          );
          const sc = mkStyleComponent(props);
          const menu = () =>
            createStyleContextMenu(sc, [side], {
              initialMenuContent: manip.renderConvertMenuItems(),
            });
          const indicator = (
            <div
              className={
                indicatorType.source !== "none"
                  ? styles[`${L.capitalize(side)}Indicator`]
                  : ""
              }
            >
              <DefinedIndicator
                label={getLabelForStyleName(side)}
                type={indicatorType}
                menu={menu}
              />
            </div>
          );

          return (
            <div
              className={cx({
                "flex justify-between": true,
                "flex-col flex-hcenter": ["top", "bottom"].includes(side),
                "flex-vcenter": ["left", "right"].includes(side),
              })}
            >
              {side === "top" && <Icon icon={ArrowBottomIcon} />}
              {side === "left" && <Icon icon={ArrowRightIcon} />}
              {side === "right" && indicator}
              {side === "bottom" && indicator}
              <MeasureControl
                exp={exp}
                expsProvider={expsProvider}
                prop={side}
                manip={manip}
                menu={menu}
                dimOpts={dimOpts}
              />
              {side === "right" && <Icon icon={ArrowLeftIcon} />}
              {side === "bottom" && <Icon icon={ArrowTopIcon} />}
              {side === "top" && indicator}
              {side === "left" && indicator}
            </div>
          );
        },
        center: () => {
          return <div className={styles.CenterBlock} />;
        },
      })}
    </div>
  );
});

let nextId = 1;
const genPopoverId = () => {
  return nextId++;
};

const usePopoverId = () => {
  const [id] = React.useState(genPopoverId());
  return `__wab-pop-over-${id}`;
};

const Popover = React.forwardRef(function Popover(
  props: {
    onClose?: () => void;
    isOpen?: boolean;
    isOutsidePopover?: (e: HTMLElement) => boolean;
  } & React.ComponentProps<"div">,
  outerRef: React.Ref<HTMLDivElement>
) {
  const { children, onClose, isOpen, isOutsidePopover, ...rest } = props;
  const { ref, onRef } = useForwardedRef(outerRef);
  // Handle interacting outside the dialog and pressing
  // the Escape key to close the modal.
  const { overlayProps } = useOverlay(
    {
      onClose,
      isOpen,
      isDismissable: true,
      shouldCloseOnInteractOutside: (e) => {
        if (ref.current && ref.current.contains(e)) {
          return false;
        }
        return isOutsidePopover && e instanceof HTMLElement
          ? isOutsidePopover(e)
          : true;
      },
    },
    ref
  );

  // Hide content outside the modal from screen readers.
  useModal();

  // Get props for the dialog and its title
  const { dialogProps } = useDialog({ "aria-label": props["aria-label"] }, ref);

  return (
    <FocusScope restoreFocus autoFocus>
      <div {...mergeProps(overlayProps, dialogProps, rest)} ref={onRef}>
        {children}
        <DismissButton onDismiss={onClose} />
      </div>
    </FocusScope>
  );
});
