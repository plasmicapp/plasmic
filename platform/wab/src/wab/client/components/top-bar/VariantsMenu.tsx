import VariantRow from "@/wab/client/components/canvas/VariantsBar/VariantRow";
import styles from "@/wab/client/components/canvas/VariantsBar/VariantsDrawer.module.scss";
import VariantsGroupLabel from "@/wab/client/components/canvas/VariantsBar/VariantsGroupLabel";
import { PreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import { Matcher } from "@/wab/client/components/view-common";
import { useRefMap } from "@/wab/client/hooks/useRefMap";
import {
  DefaultVariantsMenuProps,
  PlasmicVariantsMenu,
} from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicVariantsMenu";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, mod, spawn } from "@/wab/shared/common";
import { VARIANTS_LOWER } from "@/wab/shared/Labels";
import {
  getAllVariantsForTpl,
  isBaseVariant,
  isScreenVariant,
  isStyleOrCodeComponentVariant,
} from "@/wab/shared/Variants";
import { observer } from "mobx-react";
import * as React from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import defer = setTimeout;

interface PreviewVariantData {
  name: string;
  uuid: string;
}

type VariantGroupData =
  | {
      name: string;
      type: "standalone";
      variants: PreviewVariantData[];
    }
  | {
      type: "single";
      name: string;
      variants: PreviewVariantData[];
    }
  | {
      type: "multi";
      name: string;
      variants: PreviewVariantData[];
    };

interface VariantsMenuProps extends DefaultVariantsMenuProps {
  searchInputRef?: React.RefObject<HTMLInputElement>;
  targetedVariants: Set<string>;
  variantGroupsData: VariantGroupData[];
  onDismiss: () => void;
  previewCtx: PreviewCtx;
  studioCtx: StudioCtx;
}

export const VariantsMenu = observer(VariantsMenu_);

function VariantsMenu_({
  searchInputRef,
  targetedVariants,
  variantGroupsData,
  onDismiss,
  previewCtx,
  studioCtx,
  ...props
}: VariantsMenuProps) {
  const searchInputRef_ = searchInputRef ?? useRef<HTMLInputElement>(null);
  const variantsListRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const matcher = new Matcher(query, { matchMiddleOfWord: true });

  const groupedVariants = variantGroupsData
    .map((g) => ({
      ...g,
      variants: g.variants.filter(
        (v) => matcher.matches(v.name) || matcher.matches(g.name)
      ),
    }))
    .filter((g) => g.variants.length !== 0);

  const getVariantRowRef = useRefMap<string, HTMLDivElement>();
  const lockMouseInteractionsRef = useRef(true);
  const preventDismissingRef = useRef(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const flattenedVariants = useMemo(
    () => groupedVariants.flatMap((it) => it.variants),
    [groupedVariants]
  );
  const groupByVariantUuid = useMemo(
    () =>
      new Map(
        groupedVariants.flatMap((g) =>
          g.variants.map((v) => [v.uuid, g] as const)
        )
      ),
    [groupedVariants]
  );
  const variantIndices = useMemo(
    () => new Map(flattenedVariants.map((it, index) => [it, index])),
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
    // if opening menu
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

    const variantRow =
      newSelectedVariant && getVariantRowRef(newSelectedVariant.uuid)?.current;

    variantRow?.scrollIntoView({
      block: "center",
    });
  };

  const updatePreviewVariantsByUuids = (uuids: string[]) => {
    if (previewCtx.component) {
      const uuidSet = new Set(uuids);
      const variantsInput = getAllVariantsForTpl({
        component: previewCtx.component,
        tpl: null,
        site: studioCtx.site,
      }).filter(
        (v) =>
          !isStyleOrCodeComponentVariant(v) &&
          !isScreenVariant(v) &&
          !isBaseVariant(v) &&
          uuidSet.has(v.uuid)
      );
      spawn(previewCtx.pushComponent(previewCtx.component, variantsInput));
    }
  };

  const onRemoveVariant = (uuid: string) => {
    updatePreviewVariantsByUuids(
      [...targetedVariants.keys()].filter((v) => v !== uuid)
    );
  };

  const onTargetVariant = (uuid: string) => {
    const group = groupByVariantUuid.get(uuid);
    const variantsToRemove = new Set<string>();
    if (group?.type !== "multi") {
      group?.variants.forEach((v) => variantsToRemove.add(v.uuid));
    }
    const otherVariants = [...targetedVariants.keys()].filter(
      (v) => !variantsToRemove.has(v)
    );
    updatePreviewVariantsByUuids([...otherVariants, uuid]);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
      case "Tab":
        handleDismiss();
        break;
      case "Enter":
      case "Space": {
        const currentHighlightedVariant = flattenedVariants[highlightIndex];
        if (currentHighlightedVariant) {
          (_e) => {
            targetedVariants.has(currentHighlightedVariant.uuid)
              ? onRemoveVariant(currentHighlightedVariant.uuid)
              : onTargetVariant(currentHighlightedVariant.uuid);
          };
        }
        setQuery("");
        break;
      }
      case "ArrowDown": {
        shiftHighlightIndex(+1);
        e.preventDefault();
        break;
      }
      case "ArrowUp":
        shiftHighlightIndex(-1);
        e.preventDefault();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const handleRowMouseEnter = (index: number) => () => {
    if (!lockMouseInteractionsRef.current) {
      setHighlightIndex(index);
    }
  };

  return (
    <PlasmicVariantsMenu
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
      {groupedVariants.map(({ variants, name }) => (
        <Fragment key={name}>
          <VariantsGroupLabel>{name}</VariantsGroupLabel>
          {variants.map((variant) => (
            <VariantRow
              ref={getVariantRowRef(variant.uuid)}
              isRecording={targetedVariants.has(variant.uuid)}
              highlight={flattenedVariants[highlightIndex] === variant}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                targetedVariants.has(variant.uuid)
                  ? onRemoveVariant(variant.uuid)
                  : onTargetVariant(variant.uuid);
              }}
              onMouseEnter={handleRowMouseEnter(
                ensure(
                  variantIndices.get(variant),
                  `missing variant ${variant.name}`
                )
              )}
              onMouseLeave={handleRowMouseEnter(-1)}
            >
              {matcher.boldSnippets(variant.name || "UnnamedVariant")}
            </VariantRow>
          ))}
        </Fragment>
      ))}

      {!groupedVariants.length && (
        <div className={styles.emptyResultsMessage}>
          No {VARIANTS_LOWER} matching <strong>{query}</strong>
        </div>
      )}
    </PlasmicVariantsMenu>
  );
}

export default VariantsMenu;
