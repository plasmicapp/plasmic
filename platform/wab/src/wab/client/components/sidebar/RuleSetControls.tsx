import { Tooltip } from "antd";
import L from "lodash";
import { default as React, useLayoutEffect, useState } from "react";
import { filterFalsy } from "../../../common";
import { DEVFLAGS } from "../../../devflags";
import {
  getApplicableSelectors,
  getPseudoSelector,
  oppositeSelectorDisplayName,
} from "../../../styles";
import { Matcher } from "../view-common";
import { XMultiSelect } from "../XMultiSelect";

export interface SelectorsInputProps {
  selectors: string[];
  onChange?: (selectors: string[]) => void;
  onBlur?: (x: any) => void;
  onClick?: (e: React.MouseEvent) => void;
  onOuterClick?: () => void;
  autoFocus?: boolean;
  forPrivateStyleVariant: boolean;
  forTag: string;
  className?: string;
  focusedClassName?: string;
  forRoot?: boolean;
}

export function SelectorsInput({
  selectors,
  onBlur,
  onClick,
  onOuterClick,
  onChange = () => {},
  autoFocus,
  forPrivateStyleVariant,
  forTag,
  className,
  focusedClassName,
  forRoot,
}: SelectorsInputProps) {
  const nativeOptions = getApplicableSelectors(
    forTag,
    forPrivateStyleVariant,
    forRoot ?? false
  ).map((op) => op.displayName);

  const [text, setText] = useState("");
  const matcher = new Matcher(text);
  const dynOptions = filterFalsy([
    ...nativeOptions
      .filter(
        (opt) =>
          !selectors.includes(opt) &&
          !selectors.includes(oppositeSelectorDisplayName(opt))
      )
      .filter((opt) => matcher.matches(opt)),
    DEVFLAGS.demo ? !nativeOptions.includes(text) && text : undefined,
  ]);

  const [keepOpen, setKeepOpen] = useState(false);

  useLayoutEffect(() => {
    setKeepOpen(true);
  }, []);

  return (
    <XMultiSelect
      placeholder={"Enter CSS selectors"}
      autoFocus={autoFocus}
      selectedItems={selectors}
      options={dynOptions}
      downshiftProps={{
        isOpen: keepOpen,
      }}
      onOuterClick={onOuterClick}
      onClick={(e) => {
        setKeepOpen(true);
        onClick?.(e);
      }}
      onBlur={(e: FocusEvent) => {
        setKeepOpen(false);
        onBlur?.(e);
      }}
      onInputValueChange={(text) => setText(text)}
      className={className}
      focusedClassName={focusedClassName}
      renderOption={(sel) =>
        nativeOptions.includes(sel) ? (
          <Tooltip
            title={`This is the ${
              getPseudoSelector(sel).cssSelector
            } selector in CSS`}
          >
            {matcher.boldSnippets(sel)}
          </Tooltip>
        ) : (
          <>
            {matcher.boldSnippets(sel)}{" "}
            <span className={"SelectorsControl__CustomOptionLabel"}>
              custom selector
            </span>
          </>
        )
      }
      onSelect={(sel) => {
        onChange([...selectors, sel]);
        return true;
      }}
      onUnselect={(sel) => onChange(L.without(selectors, sel))}
      filterOptions={(options, input) =>
        !input
          ? options
          : options.filter((sel) =>
              sel.toLowerCase().includes(input.toLowerCase())
            )
      }
    />
  );
}

export function SelectorTags(props: { selectors: string[] }) {
  const { selectors } = props;
  const pills = selectors;
  if (pills.length === 0) {
    return (
      <div key={"no-selector"} className={"no-selector-placeholder"}>
        Double click to enter CSS selectors
      </div>
    );
  }
  return (
    <>
      {pills.map((sel) => (
        <div key={sel} className={"dropdown-pill dropdown-pill--tight"}>
          <div className={"dropdown-pill__contents"}>{sel}</div>
        </div>
      ))}
    </>
  );
}
