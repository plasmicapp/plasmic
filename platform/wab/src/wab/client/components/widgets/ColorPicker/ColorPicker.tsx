import {
  ColorTokenPopup,
  newTokenValueAllowed,
} from "@/wab/client/components/sidebar/token-controls";
import { ColorSwatch } from "@/wab/client/components/style-controls/ColorSwatch";
import { UnloggedDragCatcher } from "@/wab/client/components/style-controls/UnloggedDragCatcher";
import Button from "@/wab/client/components/widgets/Button";
import "@/wab/client/components/widgets/ColorPicker/Pickr.overrides.scss";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import {
  ColorMode,
  getColorAlpha,
  getColorComponents,
  getFullColorRepresentation,
  getShortColorHex,
  getShortenedColor,
  getShortenedHSL,
} from "@/wab/client/components/widgets/ColorPicker/colorPickerUtils";
import { ColorTokenSelector } from "@/wab/client/components/widgets/ColorTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import { ensureNumber, nudgeIntoRange } from "@/wab/client/number-utils";
import { CloseIcon } from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  FinalStyleToken,
  MutableStyleToken,
  OverrideableStyleToken,
  TokenType,
  derefTokenRefs,
  isStyleTokenEditable,
  mkTokenRef,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { ensure } from "@/wab/shared/common";
import {
  TokenValueResolver,
  siteFinalColorTokens,
  siteFinalStyleTokensAllDeps,
} from "@/wab/shared/core/site-style-tokens";
import { StyleToken } from "@/wab/shared/model/classes";
import { canCreateAlias } from "@/wab/shared/ui-config-utils";
import { Chroma } from "@/wab/shared/utils/color-utils";
import Pickr from "@simonwep/pickr";
import "@simonwep/pickr/dist/themes/nano.min.css";
import { Input, InputRef, Select, Tooltip } from "antd";
import { sortBy } from "lodash";
import debounce from "lodash/debounce";
import defer from "lodash/defer";
import { observer } from "mobx-react";
import * as React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function tryGetRealColor(
  color: string,
  sc: StudioCtx,
  resolver: TokenValueResolver,
  vsh: VariantedStylesHelper = new VariantedStylesHelper(),
  maybeColorTokens?: FinalStyleToken[]
) {
  const colorTokens = maybeColorTokens
    ? maybeColorTokens
    : sortBy(
        siteFinalColorTokens(sc.site, { includeDeps: "direct" }),
        (t) => t.name
      );

  // Currently-applied token, if `color` is a token reference
  const appliedToken = color ? tryParseTokenRef(color, colorTokens) : undefined;

  // The actual hex value
  const realColor = appliedToken ? resolver(appliedToken, vsh) : color;

  return { colorTokens, appliedToken, realColor };
}

interface ColorPickerProps {
  color: string;
  onChange: (colorOrToken: string) => void;
  autoFocus?: boolean;
  hideTokenPicker?: boolean;
  derefToken?: boolean;
  colorTokens?: FinalStyleToken[];
  vsh?: VariantedStylesHelper;
}

export const ColorPicker = observer(ColorPicker_);

function ColorPicker_({
  autoFocus = false,
  hideTokenPicker,
  derefToken,
  color,
  onChange,
  colorTokens: maybeColorTokens,
  vsh = new VariantedStylesHelper(),
}: ColorPickerProps) {
  const sc = useStudioCtx();
  const uiConfig = sc.getCurrentUiConfig();
  const canCreateToken = canCreateAlias(uiConfig, "token");

  const justAddedRef = React.useRef<StyleToken | undefined>(undefined);
  const justAddedValue = justAddedRef.current;

  const resolver = useClientTokenResolver();

  const {
    colorTokens,
    realColor: maybeRealColor,
    appliedToken,
  } = tryGetRealColor(color, sc, resolver, vsh, maybeColorTokens);

  const [editToken, setEditToken] = React.useState<
    MutableStyleToken | OverrideableStyleToken | undefined
  >(undefined);

  if (maybeRealColor === undefined) {
    console.log(`Invalid token - hopefully caused by undo`, color);
    return null;
  }

  const realColor =
    color === ""
      ? "#FFFFFF"
      : ensure(maybeRealColor, "Unexpected empty real color");
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [pickr, setPickr] = useState<Pickr | null>(null);
  const [mode, setMode] = useState(ColorMode.hex);
  const initialColor = getShortenedColor(realColor, mode);
  const initialAlpha = getColorAlpha(realColor);
  const {
    value: colorInputValue,
    push: setColorInputValue,
    handleKeyDown: handleColorUndoKeyDown,
    reset: resetColorInputValue,
  } = useUndo(initialColor);
  const {
    value: alphaInputValue,
    push: setAlphaInputValue,
    handleKeyDown: handleAlphaUndoKeyDown,
    reset: resetAlphaInputValue,
  } = useUndo(initialAlpha);
  useEffect(() => {
    resetColorInputValue(initialColor);
    resetAlphaInputValue(initialAlpha);
  }, [initialColor, initialAlpha]);
  const colorInputRef = useRef<InputRef>(null);

  // Store hsl-to-hex conversions to make it possible
  // to return to the same hex/rgb when coming back from
  // hsl rounded values
  const hslToHex = useMemo(() => new Map<string, string>(), []);

  const propagateChangesToParent = useCallback(
    debounce(
      (v) =>
        window.requestAnimationFrame(() =>
          onChange(/#0{8}/i.test(v) ? "transparent" : v)
        ),
      50,
      {
        maxWait: 150,
      }
    ),
    []
  );

  const controlledHexColor =
    !realColor || Chroma.isLiteralTransparent(realColor)
      ? "#00000000"
      : Chroma.isLiteralUnpickedColor(realColor) || !Chroma.valid(realColor)
      ? "#000000"
      : realColor;

  useLayoutEffect(() => {
    if (appliedToken) {
      return;
    }

    const show = () => {
      if (autoFocus) {
        colorInputRef.current?.focus();
        colorInputRef.current?.select();
      }
    };

    const change = (v: Pickr.HSVaColor, source) => {
      if (source !== "slider") {
        return;
      }

      const newHexaColor = v.toHEXA().toString();
      propagateChangesToParent(newHexaColor);
    };

    const _pickr = Pickr.create({
      el: colorPickerRef.current!,
      container: colorPickerRef.current!,
      showAlways: true,
      inline: true,
      theme: "nano",
      default: controlledHexColor,
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          clear: false,
          save: false,
          input: true,
          hex: false,
          rgba: false,
          hsla: false,
        },
      },
    })
      .on("show", show)
      .on("change", change);

    setPickr(_pickr);

    return () => {
      _pickr.off("show", show);
      _pickr.off("change", change);
      _pickr.destroy();
    };
  }, [appliedToken]);

  useLayoutEffect(() => {
    if (
      pickr &&
      !appliedToken &&
      pickr.getColor().toHEXA().toString() !== controlledHexColor
    ) {
      pickr.setColor(controlledHexColor);
    }
  }, [pickr, controlledHexColor, appliedToken]);

  const getPickrHSVA = () => Array.from(pickr!.getColor().toHSVA());

  const applyColor = (newColor: string) => {
    if (Chroma.isLiteralUnpickedColor(newColor)) {
      pickr?.setHSVA(0, 0, 0, 1);
      applyAlpha(100);
      return;
    }

    const isChangingToTransparent = Chroma.isLiteralTransparent(newColor);
    if (isChangingToTransparent) {
      newColor = "black";
      applyAlpha(0);
    }

    const fullColorRep = getFullColorRepresentation(newColor, mode);

    if (Chroma.valid(fullColorRep)) {
      pickr?.setColor(fullColorRep);
      const [h, s, v] = getPickrHSVA();
      pickr?.setHSVA(h, s, v, alphaInputValue / 100);
      propagateChangesToParent(pickr?.getColor().toHEXA().toString());
    }
  };

  const applyAlpha = (newAlpha: number) => {
    if (isNaN(newAlpha)) {
      return;
    }

    window.requestAnimationFrame(() => {
      const [h, s, v] = getPickrHSVA();
      pickr?.setHSVA(h, s, v, newAlpha / 100);
      propagateChangesToParent(pickr?.getColor().toHEXA().toString());
    });
  };

  const selectColorComponent = (target: HTMLInputElement) => {
    // To make sure we get the caret on the right position
    // we defer the execution to next tick
    defer(() => {
      const editingComponent = getColorComponents(
        target.value,
        target.selectionStart ?? -1
      ).find((it) => it.editing);

      if (editingComponent) {
        window.requestAnimationFrame(() => {
          target.setSelectionRange(
            editingComponent?.start,
            editingComponent?.end,
            "backward"
          );
        });
      }
    });
  };

  const handleModeChange = (newMode: ColorMode) => {
    const currentColorRestored = getFullColorRepresentation(
      colorInputValue,
      mode
    );
    const formattedColorInNewMode = getShortenedColor(
      hslToHex.get(currentColorRestored) || currentColorRestored,
      newMode
    );

    setMode(newMode);

    if (newMode === ColorMode.hsl && !hslToHex.has(formattedColorInNewMode)) {
      hslToHex.set(
        getFullColorRepresentation(formattedColorInNewMode, newMode),
        getShortColorHex(currentColorRestored)
      );
    }
  };

  const handleColorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (handleColorUndoKeyDown(e)) {
      return;
    }

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        e.stopPropagation();

        applyColor(colorInputValue);

        break;

      case "ArrowUp":
      case "ArrowDown": {
        if (mode === ColorMode.hex) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const target = e.currentTarget!;
        const selectionStart = target.selectionStart ?? -1;

        const colorComponents = getColorComponents(
          target.value,
          selectionStart
        ).map((it, i) => {
          const step = e.key === "ArrowDown" ? -1 : +1;
          const newValue = it.editing ? it.value + step : it.value;
          const maxValue = mode === ColorMode.hsl ? (i === 0 ? 360 : 100) : 255;

          return {
            ...it,
            value: nudgeIntoRange(newValue, { min: 0, max: maxValue }),
            end: it.start + newValue.toString().length,
          };
        });

        const modifiedColorRaw = getFullColorRepresentation(
          colorComponents.map((it) => it.value).join(","),
          mode
        );

        const modifiedColorFormatted =
          mode === ColorMode.hsl
            ? getShortenedHSL.call(
                null,
                ...colorComponents.map((it) => it.value)
              )
            : getShortenedColor(modifiedColorRaw, mode);

        const editingComponent = getColorComponents(modifiedColorFormatted)[
          colorComponents.findIndex((it) => it.editing)
        ];

        if (editingComponent) {
          // Normally we would just use applyColor to change the color,
          // but since we are trying to setSelectionRange, we need to make sure
          // colorInputValue is updated on the next render to work.
          const newColorInputValue = getShortenedColor(modifiedColorRaw, mode);
          setColorInputValue(newColorInputValue);

          applyColor(modifiedColorFormatted);
          window.requestAnimationFrame(() => {
            target.setSelectionRange(
              editingComponent?.start,
              editingComponent?.end,
              "backward"
            );
          });
        }
      }
    }
  };

  const handleAlphaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (handleAlphaUndoKeyDown(e)) {
      return;
    }

    switch (e.key) {
      case "ArrowUp":
      case "ArrowDown": {
        e.preventDefault();
        e.stopPropagation();

        const step = e.key === "ArrowUp" ? +1 : -1;
        const newAlphaValue = nudgeIntoRange(alphaInputValue + step, {
          min: 0,
          max: 100,
        });
        applyAlpha(newAlphaValue);
        break;
      }

      case "Enter": {
        e.preventDefault();
        e.stopPropagation();

        applyAlpha(alphaInputValue);
        break;
      }
    }
  };

  const isEditable = appliedToken && isStyleTokenEditable(appliedToken, vsh);

  return (
    <div>
      {!appliedToken && (
        <>
          <UnloggedDragCatcher sc={sc}>
            <div ref={colorPickerRef} />
          </UnloggedDragCatcher>
          <Input.Group compact>
            <Select
              dropdownStyle={{ zIndex: 10000 }}
              style={{ width: "27%" }}
              value={mode}
              onChange={handleModeChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                }
              }}
            >
              <Select.Option value={ColorMode.hex}>Hex</Select.Option>
              <Select.Option value={ColorMode.rgb}>RGB</Select.Option>
              <Select.Option value={ColorMode.hsl}>HSL</Select.Option>
            </Select>
            <Input
              ref={colorInputRef}
              style={{ width: "48%" }}
              onFocus={(e) =>
                mode === ColorMode.hex
                  ? e.target.select()
                  : selectColorComponent(e.currentTarget)
              }
              onClick={(e) =>
                mode !== ColorMode.hex && selectColorComponent(e.currentTarget)
              }
              data-test-id={`${TokenType.Color}-input`}
              value={colorInputValue}
              onChange={(e) => setColorInputValue(e.target.value)}
              onKeyDown={handleColorKeyDown}
              onBlur={() => applyColor(colorInputValue)}
            />
            <Input
              style={{ width: "25%" }}
              disabled={Chroma.isLiteralUnpickedColor(colorInputValue)}
              onFocus={(e) => e.target.select()}
              value={alphaInputValue}
              suffix="%"
              onChange={(e) =>
                setAlphaInputValue(
                  nudgeIntoRange(ensureNumber(e.target.value), {
                    min: 0,
                    max: 100,
                  })
                )
              }
              onKeyDown={handleAlphaKeyDown}
              onBlur={() => applyAlpha(alphaInputValue)}
            />
          </Input.Group>
        </>
      )}
      {!hideTokenPicker && (
        <div className={"mt-m"}>
          {appliedToken && (
            <div className="flex flex-vcenter mb-sm">
              <MaybeWrap
                cond={!!isEditable}
                wrapper={(x) => (
                  <Tooltip title="Edit color token">
                    {x as React.ReactElement}
                  </Tooltip>
                )}
              >
                <Button
                  type="chip"
                  onClick={
                    isEditable ? () => setEditToken(appliedToken) : undefined
                  }
                  startIcon={
                    <ColorSwatch
                      color={realColor}
                      tooltip={Chroma.stringify(realColor)}
                    />
                  }
                  endIcon={
                    <IconButton
                      type="seamless"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Ensure we don't reuse the old alpha value when the color picker was mounted
                        resetAlphaInputValue(getColorAlpha(realColor));
                        onChange(realColor);
                      }}
                      tooltip="Remove token"
                    >
                      <Icon icon={CloseIcon} />
                    </IconButton>
                  }
                  withIcons={["startIcon", "endIcon"]}
                >
                  <Tooltip title={appliedToken.name} mouseEnterDelay={0.5}>
                    <div className="fill-width text-ellipsis">
                      {appliedToken.name}
                    </div>
                  </Tooltip>
                </Button>
              </MaybeWrap>
            </div>
          )}
          <ColorTokenSelector
            tokens={colorTokens.filter((token) => token !== appliedToken)}
            onSelect={async (token) => {
              if (derefToken) {
                onChange(
                  derefTokenRefs(
                    siteFinalStyleTokensAllDeps(sc.site),
                    vsh.getActiveTokenValue(token),
                    vsh
                  )
                );
              } else if (appliedToken && editToken) {
                const value = mkTokenRef(token.base);
                if (newTokenValueAllowed(appliedToken, sc.site, value, vsh)) {
                  await sc.changeUnsafe(() =>
                    vsh.updateToken(appliedToken, mkTokenRef(token.base))
                  );
                }
              } else {
                onChange(mkTokenRef(token.base));
              }
            }}
            selectedToken={appliedToken}
            hideAddToken={!canCreateToken}
            onAddToken={async () => {
              return sc.changeUnsafe(() => {
                const newToken = sc.tplMgr().addToken({
                  tokenType: TokenType.Color,
                  value: realColor,
                });
                justAddedRef.current = newToken;
                onChange(mkTokenRef(newToken));
                setEditToken(new MutableStyleToken(newToken));
              });
            }}
            resolver={resolver}
            autoFocusSearch={!!appliedToken}
            maxRows={appliedToken ? 5 : 3}
            vsh={vsh}
          />
        </div>
      )}
      {editToken && (
        <ColorTokenPopup
          token={editToken}
          studioCtx={sc}
          show={true}
          onClose={() => {
            setEditToken(undefined);
            justAddedRef.current = undefined;
          }}
          autoFocusName={justAddedValue === editToken.base}
          vsh={vsh}
        />
      )}
    </div>
  );
}
