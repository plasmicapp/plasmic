import {
  LabeledStyleColorItemRow,
  LabeledStyleDimItem,
  LabeledStyleDimItemRow,
  LabeledToggleButtonGroupItemRow,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import styles from "@/wab/client/components/style-controls/BorderControls.module.sass";
import {
  ExpsProvider,
  MixinExpsProvider,
  StylePanelSection,
  TplExpsProvider,
} from "@/wab/client/components/style-controls/StyleComponent";
import StyleToggleButton from "@/wab/client/components/style-controls/StyleToggleButton";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { DimTokenSpinnerRef } from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import BorderAllIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderAll";
import BorderDashedIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderDashed";
import BorderDottedIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderDotted";
import BorderRadiusAllIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderRadiusAll";
import BorderRadiusSideIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderRadiusSide";
import BorderSideIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderSide";
import BorderSolidIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__BorderSolid";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import MinusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Minus";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { makeVariantedStylesHelperFromCurrentCtx } from "@/wab/client/utils/style-utils";
import { ensure, spawn, unanimousVal } from "@/wab/shared/common";
import { TokenType } from "@/wab/commons/StyleToken";
import { parseCssShorthand, showCssShorthand } from "@/wab/shared/css";
import { Corner, Side, standardCorners, standardSides } from "@/wab/shared/geom";
import { isKnownTplTag, TplNode } from "@/wab/shared/model/classes";
import cn from "classnames";
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect, useRef } from "react";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import defer = setTimeout;

enum BorderType {
  Line,
  Radius,
}
const borderLineStyles: ReadonlyArray<string> = ["color", "style", "width"];
const borderRadiusStyles: ReadonlyArray<string> = ["radius"];

const borderStyleProps = borderLineStyles.flatMap((prop) =>
  standardSides.map((side) => `border-${side}-${prop}`)
);

const borderRadiusStyleProps = standardCorners.map(
  (corner) => `border-${corner}-radius`
);

const isTplWithDefaultBorder = (tpl: TplNode | null | undefined) => {
  return (
    tpl &&
    isKnownTplTag(tpl) &&
    ["button", "textarea", "input"].includes(tpl.tag)
  );
};

export const BorderPanelSection = observer(BorderPanelSection_);
function BorderPanelSection_(props: {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
}) {
  const { expsProvider } = props;
  const studioCtx = useStudioCtx();

  const exp = expsProvider.mergedExp();
  const targetExp = expsProvider.maybeTargetExp();
  const [open, setOpen] = React.useState(false);

  const tpl =
    expsProvider instanceof TplExpsProvider ? expsProvider.tpl : undefined;

  const hasBorderProps =
    borderStyleProps.some((prop) => exp.has(prop)) ||
    isTplWithDefaultBorder(tpl);
  const hasBorderTargetProps = borderStyleProps.some((prop) =>
    targetExp?.has(prop)
  );

  const vsh = props.vsh ?? makeVariantedStylesHelperFromCurrentCtx(studioCtx);

  const clickOpenCloseButton = async () => {
    if (open || hasBorderTargetProps) {
      await studioCtx.changeUnsafe(() => {
        for (const prop of borderStyleProps) {
          if (exp.has(prop)) {
            exp.clear(prop);
          }
        }
      });
    }
    setOpen(!open);
  };

  const showHeaderControls = hasBorderTargetProps || !hasBorderProps;
  const shouldReactToHeaderClick =
    showHeaderControls && !open && !hasBorderTargetProps;

  return (
    <StylePanelSection
      key={String(open || hasBorderProps)}
      title="Border"
      expsProvider={expsProvider}
      styleProps={borderStyleProps}
      onHeaderClick={
        shouldReactToHeaderClick ? clickOpenCloseButton : undefined
      }
      controls={
        showHeaderControls && (
          <IconLinkButton onClick={clickOpenCloseButton}>
            <Icon icon={open || hasBorderTargetProps ? MinusIcon : PlusIcon} />
          </IconLinkButton>
        )
      }
    >
      {(open || hasBorderProps) && (
        <BorderControlsWrapper
          expsProvider={expsProvider}
          borderType={BorderType.Line}
          vsh={vsh}
        />
      )}
    </StylePanelSection>
  );
}

export const BorderRadiusSection = observer(BorderRadiusSection_);
function BorderRadiusSection_(props: {
  expsProvider: ExpsProvider;
  vsh?: VariantedStylesHelper;
}) {
  const { expsProvider } = props;
  const studioCtx = useStudioCtx();
  const inputRef = useRef<DimTokenSpinnerRef>(null);

  const exp = expsProvider.mergedExp();
  const targetExp = expsProvider.maybeTargetExp();
  const [open, setOpen] = React.useState(false);

  const hasBorderRadiusProps = borderRadiusStyleProps.some((prop) =>
    exp.has(prop)
  );
  const hasBorderRadiusTargetProps = borderRadiusStyleProps.some((prop) =>
    targetExp?.has(prop)
  );

  const vsh = props.vsh ?? makeVariantedStylesHelperFromCurrentCtx(studioCtx);

  const clickOpenCloseButton = async () => {
    if (open || hasBorderRadiusTargetProps) {
      await studioCtx.changeUnsafe(() => {
        for (const prop of borderRadiusStyleProps) {
          if (exp.has(prop)) {
            exp.clear(prop);
          }
        }
      });
      setOpen(false);
    } else {
      defer(() => inputRef.current?.focus());
      setOpen(true);
    }
  };

  useEffect(() => {
    setOpen(false);
  }, [studioCtx.focusedViewCtx()?.focusedSelectable()]);

  const showHeaderControls =
    hasBorderRadiusTargetProps || !hasBorderRadiusProps;

  const shouldReactToHeaderClick =
    showHeaderControls && !open && !hasBorderRadiusTargetProps;

  return (
    <StylePanelSection
      key={String(open || hasBorderRadiusProps)}
      title="Corner radius"
      expsProvider={expsProvider}
      styleProps={borderRadiusStyleProps}
      onHeaderClick={
        shouldReactToHeaderClick ? clickOpenCloseButton : undefined
      }
      controls={
        showHeaderControls && (
          <IconLinkButton onClick={clickOpenCloseButton}>
            <Icon
              icon={open || hasBorderRadiusTargetProps ? MinusIcon : PlusIcon}
            />
          </IconLinkButton>
        )
      }
    >
      {(open || hasBorderRadiusProps) && (
        <BorderControlsWrapper
          inputRef={inputRef}
          expsProvider={expsProvider}
          borderType={BorderType.Radius}
          vsh={vsh}
        />
      )}
    </StylePanelSection>
  );
}

function getInitialBorderPositions(
  expsProvider: ExpsProvider,
  borderStyles: ReadonlyArray<string>,
  standardPositions: readonly Side[] | readonly Corner[]
) {
  const selectedPositions: string[] = [];

  standardPositions.forEach((position) => {
    if (
      borderStyles.some((style) => {
        return expsProvider.mergedExp().has(`border-${position}-${style}`);
      })
    ) {
      selectedPositions.push(position);
    }
  });
  return selectedPositions.length !== standardPositions.length
    ? selectedPositions
    : [];
}

export const BorderControlsWrapper = observer(
  function BorderControlsWrapper(props: {
    expsProvider: ExpsProvider;
    borderType: BorderType;
    inputRef?: React.Ref<DimTokenSpinnerRef>;
    vsh: VariantedStylesHelper;
  }) {
    const { expsProvider, borderType, inputRef, vsh } = props;

    const initial = getInitialBorderPositions(
      props.expsProvider,
      borderType === BorderType.Line ? borderLineStyles : borderRadiusStyles,
      borderType === BorderType.Line ? standardSides : standardCorners
    );
    const key = JSON.stringify(
      expsProvider instanceof TplExpsProvider
        ? [
            expsProvider.tpl.uuid,
            ...expsProvider.targetVariantCombo.map((v) => v.uuid),
          ]
        : expsProvider instanceof MixinExpsProvider
        ? expsProvider.mixin.uuid
        : expsProvider.targetRs().uid
    );

    return props.borderType === BorderType.Line ? (
      <BorderLineControls
        expsProvider={expsProvider}
        initialBorderPositions={initial as Side[]}
        key={key}
        vsh={vsh}
      />
    ) : (
      <BorderRadiusControls
        expsProvider={expsProvider}
        inputRef={inputRef}
        initialBorderPositions={initial as Corner[]}
        key={key}
        vsh={vsh}
      />
    );
  }
);

const BorderLineControls = observer(function BorderLineControls(props: {
  expsProvider: ExpsProvider;
  initialBorderPositions: Side[];
  vsh: VariantedStylesHelper;
}) {
  const { expsProvider, initialBorderPositions, vsh } = props;
  const studioCtx = expsProvider.studioCtx;
  const [selectedSides, setSelectedSides] = React.useState<Side[]>(
    initialBorderPositions
  );

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const hasSetPropRef = React.useRef(false);

  const effectiveSides = () =>
    selectedSides.length > 0 ? selectedSides : standardSides;

  const getSideProp = (side: Side, prop: string) => {
    return expsProvider.mergedExp().get(`border-${side}-${prop}`);
  };

  const getUnanimousSelectedSidesProp = (prop: string) => {
    return unanimousVal(effectiveSides().map((s) => getSideProp(s, prop)));
  };

  const getSelectedSidesWidth = () => {
    if (selectedSides.length === 0) {
      return showCssShorthand(
        effectiveSides().map((side) => getSideProp(side, "width"))
      );
    } else {
      return getUnanimousSelectedSidesProp("width");
    }
  };

  const toggleSide = (side: Side) => {
    if (selectedSides.includes(side)) {
      setSelectedSides((prevSelectedSides) =>
        prevSelectedSides.filter((s) => s !== side)
      );
    } else if (hasSetPropRef.current) {
      // If we had already set a prop with the current set of selectedSides,
      // then we treat this side button click as toggling to that side,
      // instead of adding that side to the selection
      setSelectedSides([side]);
    } else {
      // Else the user is just clicking on multiple side buttons to set
      // styles for many of them at once
      setSelectedSides((prevSelectedSides) => [...prevSelectedSides, side]);
    }
    hasSetPropRef.current = false;
  };

  const changeProp = (prop: string, value: string) => {
    hasSetPropRef.current = true;
    const exp = expsProvider.mergedExp();
    for (const side of effectiveSides()) {
      exp.set(`border-${side}-${prop}`, value);
      const widthProp = `border-${side}-width`;
      if (!exp.has(widthProp)) {
        exp.set(widthProp, "1px");
      }
      const styleProp = `border-${side}-style`;
      if (!exp.has(styleProp)) {
        exp.set(styleProp, "solid");
      }
    }
  };

  const changeWidth = async (value: string) => {
    hasSetPropRef.current = true;
    return studioCtx.changeUnsafe(() => {
      const exp = expsProvider.mergedExp();
      if (selectedSides.length === 0) {
        const newVals = parseCssShorthand(value);
        [...standardSides].forEach((side, i) =>
          exp.set(`border-${side}-width`, newVals[i])
        );
      } else {
        changeProp("width", value);
      }
    });
  };

  const clearWidth = async () => {
    hasSetPropRef.current = true;
    return studioCtx.changeUnsafe(() => {
      const exp = expsProvider.mergedExp();
      effectiveSides().forEach((side) => exp.clear(`border-${side}-width`));
    });
  };

  return (
    <div className="flex flex-vcenter" ref={containerRef}>
      <div
        className="grid grid-cols-3 grid-rows-3 label-col"
        style={{ flexShrink: 0, marginLeft: -10 }}
      >
        <IconButton
          className="col-start-2"
          isActive={selectedSides.includes("top")}
          onClick={() => toggleSide("top")}
          tooltip="Top border"
        >
          <Icon icon={BorderSideIcon} style={{ transform: "rotate(90deg)" }} />
        </IconButton>
        <IconButton
          className="col-start-1"
          isActive={selectedSides.includes("left")}
          onClick={() => toggleSide("left")}
          tooltip="Left border"
        >
          <Icon icon={BorderSideIcon} />
        </IconButton>
        <IconButton
          isActive={selectedSides.length === 0}
          onClick={() => setSelectedSides([])}
          tooltip="All borders"
        >
          <Icon icon={BorderAllIcon} />
        </IconButton>
        <IconButton
          isActive={selectedSides.includes("right")}
          onClick={() => toggleSide("right")}
          tooltip="Right border"
        >
          <Icon icon={BorderSideIcon} style={{ transform: "rotate(180deg)" }} />
        </IconButton>
        <IconButton
          className="col-start-2"
          isActive={selectedSides.includes("bottom")}
          onClick={() => toggleSide("bottom")}
          tooltip="Bottom border"
        >
          <Icon icon={BorderSideIcon} style={{ transform: "rotate(-90deg)" }} />
        </IconButton>
      </div>
      <div className="ml-lg flex-fill">
        <LabeledStyleDimItemRow
          label="Width"
          styleName={effectiveSides().map((s) => `border-${s}-width`)}
          labelSize="small"
          displayStyleName="border-width"
          dimOpts={{
            value: getSelectedSidesWidth() || "--",
            onChange: (val) =>
              val === undefined ? spawn(clearWidth()) : spawn(changeWidth(val)),
            shorthand: selectedSides.length === 0,
            dragScale: "1",
            min: 0,
          }}
        />
        <LabeledToggleButtonGroupItemRow
          label="Style"
          styleName={effectiveSides().map((s) => `border-${s}-style`)}
          labelSize="small"
          value={getUnanimousSelectedSidesProp("style") || ""}
          onChange={async (val) =>
            studioCtx.changeUnsafe(() =>
              changeProp(
                "style",
                ensure(val, "Unexpected undefined value for prop")
              )
            )
          }
        >
          <StyleToggleButton
            className="panel-popup--no-min-width"
            value="none"
            stretched
          >
            <Icon icon={CloseIcon} />
          </StyleToggleButton>
          <StyleToggleButton
            className="panel-popup--no-min-width"
            value="dotted"
            stretched
          >
            <Icon icon={BorderDottedIcon} />
          </StyleToggleButton>
          <StyleToggleButton
            className="panel-popup--no-min-width"
            value="dashed"
            stretched
          >
            <Icon icon={BorderDashedIcon} />
          </StyleToggleButton>
          <StyleToggleButton
            className="panel-popup--no-min-width"
            value="solid"
            stretched
          >
            <Icon icon={BorderSolidIcon} />
          </StyleToggleButton>
        </LabeledToggleButtonGroupItemRow>
        <LabeledStyleColorItemRow
          label="Color"
          styleName={effectiveSides().map((s) => `border-${s}-color`)}
          labelSize="small"
          displayStyleName="border-color"
          colorOpts={{
            color: getUnanimousSelectedSidesProp("color"),
            onChange: async (color) =>
              studioCtx.changeUnsafe(() => changeProp("color", color)),
          }}
          vsh={vsh}
        />
      </div>
    </div>
  );
});

const BorderRadiusControls = observer(function BorderRadiusControls(props: {
  expsProvider: ExpsProvider;
  initialBorderPositions: Corner[];
  inputRef?: React.Ref<DimTokenSpinnerRef>;
  vsh: VariantedStylesHelper;
}) {
  const { expsProvider, initialBorderPositions } = props;
  const studioCtx = expsProvider.studioCtx;
  const [selectedCorners, setSelectedCorners] = React.useState<Corner[]>(
    initialBorderPositions
  );
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const hasSetPropRef = React.useRef(false);

  const isAll = selectedCorners.length === 0;

  const effectiveCorners = () => (isAll ? standardCorners : selectedCorners);

  const getCornerRadius = (corner: Corner) => {
    return expsProvider.mergedExp().get(`border-${corner}-radius`);
  };

  const getSelectedCornerRadius = () => {
    if (isAll) {
      return showCssShorthand(standardCorners.map((s) => getCornerRadius(s)));
    } else {
      return unanimousVal(effectiveCorners().map((s) => getCornerRadius(s)));
    }
  };

  const toggleCorner = (corner: Corner) => {
    if (selectedCorners.includes(corner)) {
      setSelectedCorners((prevSelectedCorners) =>
        prevSelectedCorners.filter((s) => s !== corner)
      );
    } else if (hasSetPropRef.current) {
      setSelectedCorners([corner]);
    } else {
      setSelectedCorners((prevSelectedCorners) => [
        ...prevSelectedCorners,
        corner,
      ]);
    }
    hasSetPropRef.current = false;
  };

  const changeRadius = async (value: string) => {
    hasSetPropRef.current = true;
    return studioCtx.changeUnsafe(() => {
      const exp = expsProvider.mergedExp();
      if (isAll) {
        const vals = parseCssShorthand(value);
        standardCorners.forEach((corner, i) =>
          exp.set(`border-${corner}-radius`, vals[i])
        );
      } else {
        effectiveCorners().forEach((corner, i) =>
          exp.set(`border-${corner}-radius`, value)
        );
      }
    });
  };

  const clearRadius = async () => {
    hasSetPropRef.current = true;
    return studioCtx.changeUnsafe(() => {
      const exp = expsProvider.mergedExp();
      effectiveCorners().forEach((corner) =>
        exp.clear(`border-${corner}-radius`)
      );
    });
  };

  return (
    <div className="flex flex-vcenter" ref={containerRef}>
      <div
        className="grid grid-cols-3 label-col"
        style={{
          flexShrink: 0,
          marginLeft: -10,
          gridTemplateRows: "15px 15px 15px",
        }}
      >
        <IconButton
          isActive={selectedCorners.includes("top-left")}
          onClick={() => toggleCorner("top-left")}
          tooltip="Top-left corner"
        >
          <Icon icon={BorderRadiusSideIcon} />
        </IconButton>
        <IconButton
          className="col-start-3"
          isActive={selectedCorners.includes("top-right")}
          onClick={() => toggleCorner("top-right")}
          tooltip="Top-right corner"
        >
          <Icon
            icon={BorderRadiusSideIcon}
            style={{ transform: "rotate(90deg)" }}
          />
        </IconButton>
        <IconButton
          className="col-start-2"
          isActive={selectedCorners.length === 0}
          onClick={() => setSelectedCorners([])}
          tooltip="All corners"
        >
          <Icon icon={BorderRadiusAllIcon} />
        </IconButton>
        <IconButton
          className="col-start-1"
          isActive={selectedCorners.includes("bottom-left")}
          onClick={() => toggleCorner("bottom-left")}
          tooltip="Bottom-left corner"
        >
          <Icon
            icon={BorderRadiusSideIcon}
            style={{ transform: "rotate(-90deg)" }}
          />
        </IconButton>
        <IconButton
          className="col-start-3"
          isActive={selectedCorners.includes("bottom-right")}
          onClick={() => toggleCorner("bottom-right")}
          tooltip="Bottom-right corner"
        >
          <Icon
            icon={BorderRadiusSideIcon}
            style={{ transform: "rotate(180deg)" }}
          />
        </IconButton>
      </div>
      <div className={cn("ml-lg", "flex-fill", styles.inputContainer)}>
        <LabeledStyleDimItem
          label="Radius"
          styleName={effectiveCorners().map((s) => `border-${s}-radius`)}
          labelSize="small"
          displayStyleName="border-radius"
          tokenType={TokenType.Spacing}
          dimOpts={{
            ref: props.inputRef,
            value: getSelectedCornerRadius() || "--",
            onChange: (val) =>
              val === undefined
                ? spawn(clearRadius())
                : spawn(changeRadius(val)),
            shorthand: isAll,
            dragScale: "1",
            min: 0,
          }}
        />
      </div>
    </div>
  );
});
