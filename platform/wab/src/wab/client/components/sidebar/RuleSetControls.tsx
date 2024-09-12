import { Matcher } from "@/wab/client/components/view-common";
import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import {
  getVariantMeta,
  mkCodeComponentVariantKey,
} from "@/wab/shared/code-components/variants";
import { ensure, filterFalsy } from "@/wab/shared/common";
import { CodeComponent } from "@/wab/shared/core/components";
import {
  getApplicableSelectors,
  getPseudoSelector,
  oppositeSelectorDisplayName,
} from "@/wab/shared/core/styles";
import { Tooltip } from "antd";
import L from "lodash";
import { default as React, useLayoutEffect, useState } from "react";

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
  codeComponent?: CodeComponent;
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
  codeComponent,
}: SelectorsInputProps) {
  const nativeOptions = !codeComponent
    ? getApplicableSelectors(
        forTag,
        forPrivateStyleVariant,
        forRoot ?? false
      ).map((op) => op.displayName)
    : [];

  const variantsMeta = codeComponent
    ? codeComponent.codeComponentMeta.variants
    : {};

  const codeComponentOptions = Object.values(variantsMeta).map(
    (e) => e.displayName
  );

  const codeComponentDisplayNameToKey = Object.entries(variantsMeta).reduce(
    (acc, [key, value]) => {
      acc[value.displayName] = mkCodeComponentVariantKey(key);
      return acc;
    },
    {} as Record<string, string>
  );

  const [text, setText] = useState("");
  const matcher = new Matcher(text);
  const dynOptions = filterFalsy([
    ...[...nativeOptions, ...codeComponentOptions]
      .filter(
        (opt) =>
          !selectors.includes(opt) &&
          !selectors.includes(oppositeSelectorDisplayName(opt))
      )
      .filter((opt) => matcher.matches(opt)),
  ]);

  const [keepOpen, setKeepOpen] = useState(false);

  useLayoutEffect(() => {
    setKeepOpen(true);
  }, []);

  function getSelectorKey(sel: string) {
    if (!codeComponent) {
      // If we are dealing with native options, we will just use the selector itself as the key
      return sel;
    }
    // If we are dealing with code component options, we will convert the display name to a key
    const key = ensure(
      codeComponentDisplayNameToKey[sel],
      `Expected to find an key for the selector ${sel} in the code component meta`
    );
    return key;
  }

  function ensureCodeComponentVariantMeta(selector: string) {
    return ensure(
      getVariantMeta(variantsMeta, selector),
      `Expected CC variant selector meta to selector="${selector}" in the code component ${codeComponent?.name}`
    );
  }

  function getCssSelector(selector: string) {
    if (!codeComponent) {
      return getPseudoSelector(selector).cssSelector;
    }
    return ensureCodeComponentVariantMeta(selector).cssSelector;
  }

  function getDisplayName(selector: string) {
    if (!codeComponent) {
      return selector;
    }

    return ensureCodeComponentVariantMeta(selector).displayName;
  }

  return (
    <XMultiSelect
      placeholder={"Enter CSS selectors"}
      autoFocus={autoFocus}
      selectedItems={selectors.map((sel) => getDisplayName(sel))}
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
      // eslint-disable-next-line @typescript-eslint/no-shadow
      onInputValueChange={(text) => setText(text)}
      className={className}
      focusedClassName={focusedClassName}
      renderOption={(sel) => (
        <Tooltip
          title={`This is the ${getCssSelector(
            getSelectorKey(sel)
          )} selector in CSS`}
        >
          {matcher.boldSnippets(sel)}
        </Tooltip>
      )}
      onSelect={(sel) => {
        onChange([...selectors, getSelectorKey(sel)]);
        return true;
      }}
      onUnselect={(sel) => onChange(L.without(selectors, getSelectorKey(sel)))}
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
