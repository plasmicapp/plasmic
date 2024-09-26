import { Matcher } from "@/wab/client/components/view-common";
import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import { siteCCVariantsToInfos } from "@/wab/shared/cached-selectors";
import { CodeComponent } from "@/wab/shared/core/components";
import {
  getApplicableSelectors,
  getPseudoSelector,
  PseudoSelectorOption,
} from "@/wab/shared/core/styles";
import { Site } from "@/wab/shared/model/classes";
import { StyleVariant } from "@/wab/shared/Variants";
import { Tooltip } from "antd";
import { default as React, useLayoutEffect, useState } from "react";
import type { TaggedUnion } from "type-fest";

export type Selector = TaggedUnion<
  "type",
  {
    CodeComponentSelector: {
      componentUuid: string;
      componentName: string;
      key: string;
      displayName: string;
    };
    CssSelector: {
      cssSelector: string;
      preset?: PseudoSelectorOption;
    };
  }
>;

function selectorToReactKey(selector: Selector): string {
  return `${selector.type}-${selectorToVariantSelector(selector)}`;
}

function selectorToDisplayName(
  selector: Selector,
  preferCssSelector = false
): string {
  switch (selector.type) {
    case "CodeComponentSelector":
      return selector.displayName;
    case "CssSelector":
      return preferCssSelector
        ? selector.cssSelector
        : selector.preset?.displayName ?? selector.cssSelector;
  }
}

/** Maps Selector to what should be stored in the Variant.selectors field. */
function selectorToVariantSelector(selector: Selector): string {
  switch (selector.type) {
    case "CodeComponentSelector":
      return selector.key;
    case "CssSelector":
      return selector.cssSelector;
  }
}

/** Maps Selectors to what should be stored in the Variant.selectors field. */
export function selectorsToVariantSelectors(selectors: Selector[]) {
  return selectors.map(selectorToVariantSelector);
}

function areSelectorsEqual(a: Selector, b: Selector) {
  if (
    a.type === "CodeComponentSelector" &&
    b.type === "CodeComponentSelector"
  ) {
    return a.componentUuid === b.componentUuid && a.key === b.key;
  } else if (a.type === "CssSelector" && b.type === "CssSelector") {
    return a.cssSelector === b.cssSelector;
  } else {
    return false;
  }
}

/**
 * StyleVariant.selectors currently stores:
 * - for code components: display name
 * - for preset selectors in src/wab/shared/core/styles.ts: display name
 * - for custom selectors: selector
 * TODO: write migration so code components use key, presets use selector
 */
export function styleVariantToSelectors(
  variant: StyleVariant,
  site: Site
): Selector[] {
  const info = siteCCVariantsToInfos(site).get(variant);
  if (info) {
    return [...info.selectorsKeysToMetas.entries()].map(([key, meta]) => ({
      type: "CodeComponentSelector",
      componentUuid: info.component.uuid,
      componentName: info.component.name,
      key,
      displayName: meta.displayName,
    }));
  }

  return variant.selectors.map<Selector>((cssSelector) => {
    const preset = getPseudoSelector(cssSelector);
    return {
      type: "CssSelector",
      cssSelector,
      preset,
    };
  });
}

export interface SelectorsInputProps {
  selectors: Selector[];
  onChange?: (selectors: Selector[]) => void;
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
  const [text, setText] = useState("");
  const matcher = new Matcher(text);
  const isTypingPseudoSelector = text.startsWith(":");

  // Get all applicable selectors to the current element
  const applicableSelectors: Selector[] = codeComponent
    ? getCodeComponentSelectors(codeComponent)
    : [
        ...(isTypingPseudoSelector
          ? [
              {
                type: "CssSelector" as const,
                cssSelector: text,
                preset: getPseudoSelector(text),
              },
            ]
          : []),
        ...getApplicableSelectors(
          forTag,
          forPrivateStyleVariant,
          forRoot ?? false
        ).map((preset) => ({
          type: "CssSelector" as const,
          cssSelector: preset.cssSelector,
          preset,
        })),
      ];
  const availableSelectors = applicableSelectors.filter((applicable) =>
    selectors.every((used) => {
      // Filter out selectors that were already used
      if (areSelectorsEqual(applicable, used)) {
        return false;
      }

      // Filter out the opposites of the preset options selectors
      if (
        applicable.type === "CssSelector" &&
        used.type === "CssSelector" &&
        used.preset?.opposite &&
        applicable.cssSelector === used.preset.opposite.cssSelector
      ) {
        return false;
      }

      return true;
    })
  );

  const [keepOpen, setKeepOpen] = useState(false);

  useLayoutEffect(() => {
    setKeepOpen(true);
  }, []);

  return (
    <XMultiSelect
      placeholder={"e.g. :hover, :focus, :nth-child(odd)"}
      autoFocus={autoFocus}
      selectedItems={selectors}
      itemKey={(selector: Selector | null) =>
        selector ? selectorToReactKey(selector) : ""
      }
      renderSelectedItem={(selector: Selector) =>
        selectorToDisplayName(selector, isTypingPseudoSelector)
      }
      options={availableSelectors}
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
      renderOption={(selector: Selector) => (
        <Tooltip
          title={((): string => {
            switch (selector.type) {
              case "CodeComponentSelector":
                return `This is the "${selector.displayName}" registered variant in the "${selector.componentName}" code component.`;
              case "CssSelector":
                return `This is the "${selector.cssSelector}" selector in CSS.`;
            }
          })()}
        >
          {matcher.boldSnippets(
            selectorToDisplayName(selector, isTypingPseudoSelector)
          )}
        </Tooltip>
      )}
      onSelect={(newSelector: Selector) => {
        onChange([...selectors, newSelector]);
        console.log("SelectorsInput.onChange", [...selectors, newSelector]);
        return true;
      }}
      onUnselect={(oldSelector: Selector) =>
        onChange(selectors.filter((s) => !areSelectorsEqual(s, oldSelector)))
      }
      filterOptions={(options, input) => {
        if (!input) {
          return options;
        }

        const inputLower = input.toLowerCase();
        return options.filter(
          (selector: Selector) =>
            selectorToDisplayName(selector)
              .toLowerCase()
              .includes(inputLower) ||
            selectorToVariantSelector(selector)
              .toLowerCase()
              .includes(inputLower)
        );
      }}
    />
  );
}

export function SelectorTags(props: { selectors: Selector[] }) {
  const { selectors } = props;
  if (selectors.length === 0) {
    return (
      <div key={"no-selector"} className={"no-selector-placeholder"}>
        Double click to enter CSS selectors
      </div>
    );
  }
  return (
    <>
      {selectors.map((sel) => {
        return (
          <div
            key={selectorToReactKey(sel)}
            className={"dropdown-pill dropdown-pill--tight"}
          >
            <div className={"dropdown-pill__contents"}>
              {selectorToDisplayName(sel)}
            </div>
          </div>
        );
      })}
    </>
  );
}

function getCodeComponentSelectors(codeComponent: CodeComponent): Selector[] {
  return Object.entries(codeComponent.codeComponentMeta.variants).map(
    ([key, variantMeta]) => ({
      type: "CodeComponentSelector",
      componentUuid: codeComponent.uuid,
      componentName: codeComponent.name,
      key,
      displayName: variantMeta.displayName,
    })
  );
}
