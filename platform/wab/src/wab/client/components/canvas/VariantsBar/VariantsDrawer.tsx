import VariantRow from "@/wab/client/components/canvas/VariantsBar/VariantRow";
import styles from "@/wab/client/components/canvas/VariantsBar/VariantsDrawer.module.scss";
import VariantsGroupLabel from "@/wab/client/components/canvas/VariantsBar/VariantsGroupLabel";
import VariantsSectionDivider from "@/wab/client/components/canvas/VariantsBar/VariantsSectionDivider";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useRefMap } from "@/wab/client/hooks/useRefMap";
import PlasmicIcon__Bolt from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Bolt";
import {
  DefaultVariantsDrawerProps,
  PlasmicVariantsDrawer,
} from "@/wab/client/plasmic/plasmic_kit_variants_bar/PlasmicVariantsDrawer";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { mod, partitions, spawn, xGroupBy } from "@/wab/shared/common";
import { isTplTag } from "@/wab/shared/core/tpls";
import { VARIANTS_LOWER } from "@/wab/shared/Labels";
import { Component, isKnownVariant, Variant } from "@/wab/shared/model/classes";
import {
  getAllVariantsForTpl,
  isCodeComponentVariant,
  isComponentStyleVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isStandaloneVariantGroup,
  isStyleVariant,
  makeVariantName,
} from "@/wab/shared/Variants";
import { observer } from "mobx-react";
import * as React from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import defer = setTimeout;

const elementInteractionsLabel = "Element Interactions";
const styleVariantsLabel = "Component Interactions";
const codeComponentVariantsLabel = "Registered Variants";
const baseLabel = "Base";

interface VariantsDrawerProps extends DefaultVariantsDrawerProps {
  searchInputRef?: React.RefObject<HTMLInputElement>;
  targetedVariants: Variant[];
  hideBase?: boolean;
  hideInteractions?: boolean;
  hideScreen?: boolean;
  onDismiss: () => void;
  onClearVariants?: () => void;
  onTargetVariant?: (variant: Variant) => void;
  onRemoveVariant?: (variant: Variant) => void;
  component?: Component;
}

export const VariantsDrawer = observer(VariantsDrawer_);

function VariantsDrawer_({
  searchInputRef,
  targetedVariants,
  onDismiss,
  onClearVariants,
  onTargetVariant,
  onRemoveVariant,
  hideBase,
  hideInteractions,
  hideScreen,
  component,
  ...props
}: VariantsDrawerProps) {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedViewCtx();
  const focusedTpl = viewCtx?.focusedTpl();

  const targetedVariantsSet = new Set(targetedVariants);
  const searchInputRef_ = searchInputRef ?? useRef<HTMLInputElement>(null);
  const variantsListRef = useRef<HTMLDivElement>(null);

  const allVariants = getAllVariantsForTpl({
    component: component!,
    tpl: focusedTpl,
    site: studioCtx.site,
  });

  const [query, setQuery] = useState("");
  const matcher = new Matcher(query, { matchMiddleOfWord: true });
  const filteredVariants = allVariants.filter((v) => {
    if (
      isScreenVariant(v) &&
      v.parent !== studioCtx.site.activeScreenVariantGroup
    ) {
      return false;
    } else if (isCodeComponentVariant(v)) {
      return v.codeComponentVariantKeys?.some(
        (key) =>
          matcher.matches(key) || matcher.matches(codeComponentVariantsLabel)
      );
    } else if (isStyleVariant(v)) {
      return v.selectors?.some(
        (sel) =>
          matcher.matches(sel) ||
          (isPrivateStyleVariant(v) &&
            matcher.matches(elementInteractionsLabel)) ||
          matcher.matches(styleVariantsLabel)
      );
    } else {
      return (
        matcher.matches(v.name) ||
        (v.parent && matcher.matches(v.parent.param.variable.name))
      );
    }
  });

  const shouldShowBase = !hideBase && (!query || matcher.matches(baseLabel));
  const getVariantRowRef = useRefMap<Variant, HTMLDivElement>();
  const lockMouseInteractionsRef = useRef(true);
  const baseVariantRef = useRef<HTMLDivElement>(null);
  const preventDismissingRef = useRef(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const groupedVariants = useGroupedVariants(
    filteredVariants,
    shouldShowBase,
    !hideInteractions,
    !hideScreen
  );

  const flattenedVariants: (string | Variant | undefined)[] = useMemo(
    () => groupedVariants.flatMap((it) => (it.isBase ? "base" : it.variants)),
    [groupedVariants, shouldShowBase]
  );
  const variantIndices = useMemo(
    () => new Map(flattenedVariants.map((v, index) => [v, index])),
    [flattenedVariants]
  );

  const handleDismiss = () => {
    if (!preventDismissingRef.current) {
      onDismiss?.();
      defer(() => {
        setQuery("");
        lockMouseInteractionsRef.current = true;
      });
    } else {
      searchInputRef_.current?.focus();
    }
  };

  const handleSearchInputFocus = () => {
    // if opening drawer
    if (!preventDismissingRef.current) {
      variantsListRef.current?.scrollTo(0, 0);
      setHighlightIndex(0);
    }
  };

  const shiftHighlightIndex = (step: 1 | -1) => {
    lockMouseInteractionsRef.current = true;

    const newIndex = mod(highlightIndex + step, flattenedVariants.length);
    const newSelectedVariant = flattenedVariants[newIndex];

    setHighlightIndex(newIndex);

    const variantRow = isKnownVariant(newSelectedVariant)
      ? getVariantRowRef(newSelectedVariant as Variant)?.current
      : baseVariantRef.current;

    variantRow?.scrollIntoView({
      block: "center",
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
      case "Tab": {
        handleDismiss();
        break;
      }
      case "Enter":
      case "Space": {
        const currentHighlightedVariant = flattenedVariants[highlightIndex] as
          | Variant
          | string
          | undefined;
        if (currentHighlightedVariant) {
          handleVariantClick(currentHighlightedVariant)();
        }
        setQuery("");
        break;
      }
      case "ArrowDown": {
        shiftHighlightIndex(+1);
        e.preventDefault();
        break;
      }
      case "ArrowUp": {
        shiftHighlightIndex(-1);
        e.preventDefault();
        break;
      }
      default: {
        break;
      }
    }
  };

  const handleVariantClick = (variant: Variant | string | undefined) => {
    return (e?: React.MouseEvent) => {
      e?.preventDefault();

      spawn(
        studioCtx.changeUnsafe(() => {
          if (isKnownVariant(variant)) {
            targetedVariantsSet.has(variant)
              ? onRemoveVariant?.(variant)
              : onTargetVariant?.(variant);
          } else {
            onClearVariants?.();
          }
        })
      );
      if (!variant) {
        handleDismiss();
      }
    };
  };

  const getVariantName = (variant: Variant) =>
    makeVariantName({
      variant,
      ...(isTplTag(focusedTpl) && { focusedTag: focusedTpl }),
      site: studioCtx.site,
    })!;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const handleRowMouseEnter = (index: number) => () => {
    if (!lockMouseInteractionsRef.current) {
      setHighlightIndex(index);
    }
  };

  return (
    <PlasmicVariantsDrawer
      root={{
        onMouseMove: () => (lockMouseInteractionsRef.current = false),
      }}
      searchInput={{
        ref: searchInputRef_,
        onKeyDown: handleSearchKeyDown,
        onBlur: handleDismiss,
        onFocus: handleSearchInputFocus,
        onChange: (e) => setQuery(e.target.value),
        placeholder: `Search ${VARIANTS_LOWER}`,
        value: query,
      }}
      variantsList={{ ref: variantsListRef }}
      {...props}
    >
      {groupedVariants.map(
        ({ variants, key, isBase, groupLabel, withDivider }) => (
          <Fragment key={key}>
            <VariantsGroupLabel>{groupLabel}</VariantsGroupLabel>
            {isBase ? (
              <VariantRow
                ref={baseVariantRef}
                isBase
                highlight={highlightIndex === 0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleVariantClick(undefined)}
                onMouseEnter={handleRowMouseEnter(0)}
                onMouseLeave={handleRowMouseEnter(-1)}
              >
                {baseLabel}
              </VariantRow>
            ) : (
              variants?.map((variant) => (
                <VariantRow
                  key={variant.uuid}
                  ref={getVariantRowRef(variant)}
                  isRecording={targetedVariantsSet.has(variant)}
                  highlight={flattenedVariants[highlightIndex] === variant}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleVariantClick(variant)}
                  onMouseEnter={handleRowMouseEnter(
                    variantIndices.get(variant)!
                  )}
                  onMouseLeave={handleRowMouseEnter(-1)}
                >
                  {matcher.boldSnippets(getVariantName(variant))}
                </VariantRow>
              ))
            )}
            {withDivider && (
              <VariantsSectionDivider className={styles.sectionDivider} />
            )}
          </Fragment>
        )
      )}

      {!shouldShowBase && !groupedVariants.length && (
        <div className={styles.emptyResultsMessage}>
          No {VARIANTS_LOWER} matching <strong>{query}</strong>
        </div>
      )}
    </PlasmicVariantsDrawer>
  );
}

function useGroupedVariants(
  filteredVariants: Variant[],
  shouldShowBase: boolean,
  shouldShowInteractions: boolean,
  shouldShowScreen: boolean
) {
  const [
    privateStyleVariants,
    codeComponentVariants,
    compStyleVariants,
    compVariants,
    globalVariants,
  ] = partitions(filteredVariants, [
    isPrivateStyleVariant,
    isCodeComponentVariant,
    isComponentStyleVariant,
    (v) => !isGlobalVariant(v),
  ]);

  const groupedVariants = useMemo<
    {
      isBase?: boolean;
      key: string;
      withDivider?: boolean;
      groupLabel?: React.ReactNode;
      variants?: Variant[];
    }[]
  >(
    () =>
      [
        {
          show: shouldShowBase,
          key: "base",
          get withDivider() {
            return groupedVariants.length > 1;
          },
          isBase: true,
        },
        {
          withDivider: true,
          key: elementInteractionsLabel,
          groupLabel: (
            <>
              {elementInteractionsLabel}
              <Icon icon={PlasmicIcon__Bolt} />
            </>
          ),
          variants: shouldShowInteractions ? privateStyleVariants : [],
        },
        {
          withDivider: true,
          key: codeComponentVariantsLabel,
          groupLabel: (
            <>
              {codeComponentVariantsLabel}
              <Icon icon={PlasmicIcon__Bolt} />
            </>
          ),
          variants: codeComponentVariants,
        },
        {
          withDivider: true,
          key: styleVariantsLabel,
          groupLabel: (
            <>
              {styleVariantsLabel}
              <Icon icon={PlasmicIcon__Bolt} />
            </>
          ),
          variants: shouldShowInteractions ? compStyleVariants : [],
        },
        {
          key: "standalone variant groups",
          variants: compVariants.filter((it) =>
            isStandaloneVariantGroup(it.parent)
          ),
        },
        ...[
          ...xGroupBy(
            compVariants.filter((it) => !isStandaloneVariantGroup(it.parent)),
            (v) => v.parent!
          ).entries(),
          ...xGroupBy(
            globalVariants.filter(
              (v) => shouldShowScreen || !isScreenVariant(v)
            ),
            (v) => v.parent!
          ).entries(),
        ].map(([group, variants]) => ({
          key: group.param.variable.name,
          groupLabel: group.param.variable.name,
          variants: variants as Variant[],
        })),
      ].filter((it: any) => it.show || it.variants?.length),
    [
      privateStyleVariants,
      codeComponentVariants,
      compStyleVariants,
      compVariants,
      globalVariants,
      shouldShowBase,
      shouldShowInteractions,
      shouldShowScreen,
    ]
  );

  return groupedVariants;
}

export default VariantsDrawer;
