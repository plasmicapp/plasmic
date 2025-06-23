import { LabeledStyleItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import ColorSwatch from "@/wab/client/components/style-controls/ColorSwatch";
import { FilterEffectPanel } from "@/wab/client/components/style-controls/FilterEffectPanel";
import { ExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import {
  IconLinkButton,
  ListBox,
  ListBoxItem,
} from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { removeFromArray } from "@/wab/commons/collections";
import { derefTokenRefs, tryParseTokenRef } from "@/wab/commons/StyleToken";
import { arrayMoveIndex } from "@/wab/shared/collections";
import { cx, maybe, spawn, uniqueKey } from "@/wab/shared/common";
import {
  defaultFilterEffects,
  FilterEffect,
  fromFilterObjToString,
  fromFilterStringToObj,
} from "@/wab/shared/core/filter-effect-utils";
import { allColorTokens } from "@/wab/shared/core/sites";
import { joinCssValues, splitCssValue } from "@/wab/shared/css/parse";
import { capitalize } from "lodash";
import { observer } from "mobx-react";
import React, { useState } from "react";

const _GenericFilterEffectSection = (
  cssProp: string,
  title: string,
  label: string
) =>
  observer((props: { expsProvider: ExpsProvider }) => {
    const { expsProvider } = props;
    const { studioCtx } = expsProvider;
    const exp = expsProvider.mergedExp();

    const [inspect, setInspect] = useState<number | undefined>(undefined);

    const rawFilters =
      maybe(exp.getRaw(cssProp), (val) =>
        val === "none" ? [] : splitCssValue(cssProp, val)
      ) ?? [];
    const filters = rawFilters.map(fromFilterStringToObj);

    const setsProp = (prop: string, values: string[]) => {
      spawn(
        studioCtx.changeUnsafe(() => {
          // Use value.join() instead of showCssValue() so we don't
          // filter out the hidden# values.
          exp.set(prop, joinCssValues(prop, values));
        })
      );
    };

    const updateFilters = (newFilters: FilterEffect[]) => {
      if (newFilters.length === 0) {
        setsProp(cssProp, ["none"]);
        return;
      }
      const rawNewFilters = newFilters.map(fromFilterObjToString);
      setsProp(cssProp, rawNewFilters);
    };

    const hideFilter = (idx: number) => {
      filters[idx].visible = !filters[idx].visible;
      updateFilters(filters);
    };

    const addFilter = () => {
      updateFilters([defaultFilterEffects.blur, ...filters]);
      setInspect(0);
    };

    return (
      <div>
        <LabeledStyleItemRow
          label={label}
          styleName={cssProp}
          className="justify-between"
          alignment="center"
          labelSize="auto"
          contentAlignment="right"
        >
          <IconLinkButton onClick={addFilter}>
            <Icon icon={PlusIcon} />
          </IconLinkButton>
        </LabeledStyleItemRow>
        {inspect !== undefined && (
          <SidebarModal
            title={title}
            show
            onClose={() => setInspect(undefined)}
          >
            <div className="panel-content">
              <FilterEffectPanel
                studioCtx={studioCtx}
                filterEffect={filters[inspect]}
                onChange={(newFilterEffect: FilterEffect) => {
                  filters[inspect] = newFilterEffect;
                  updateFilters(filters);
                }}
              />
            </div>
          </SidebarModal>
        )}
        {filters.length > 0 && (
          <ListBox
            appendPrepend="append"
            onReorder={(from, to) => {
              const reordered = arrayMoveIndex(filters, from, to);
              updateFilters(reordered);
            }}
          >
            {filters.map((filter: FilterEffect, i: number) => {
              const isDropShadow = filter.type === "drop-shadow";

              const filterValue = filter.args.slice(-1)?.[0];
              const colorTokens = allColorTokens(studioCtx.site, {
                includeDeps: "all",
              });

              const color = isDropShadow
                ? derefTokenRefs(colorTokens, filterValue)
                : null;
              const token = isDropShadow
                ? tryParseTokenRef(filterValue, colorTokens)
                : null;

              return (
                <ListBoxItem
                  key={uniqueKey(filter)}
                  index={i}
                  onRemove={() => {
                    removeFromArray(filters, filter);
                    updateFilters(filters);
                  }}
                  onClick={() => setInspect(i)}
                  mainContent={
                    <div className="labeled-item labeled-item--horizontal--vcenter">
                      <div className="labeled-item__label labeled-item__label--horizontal">
                        {capitalize(filter.type).replace("-", " ")}
                      </div>
                      {color ? <ColorSwatch color={color} /> : null}
                      <code
                        className={cx([
                          {
                            dimfg: !filter.visible,
                          },
                        ])}
                      >
                        {token?.name || filterValue}
                      </code>
                    </div>
                  }
                  showHide
                  onToggleHide={() => hideFilter(i)}
                  isHidden={!filter.visible}
                />
              );
            })}
          </ListBox>
        )}
      </div>
    );
  });

export const FilterEffectSection = _GenericFilterEffectSection(
  "filter",
  "Filter",
  "Filter Effect"
);
export const BackdropFilterEffectSection = _GenericFilterEffectSection(
  "backdrop-filter",
  "Backdrop Filter",
  "Backdrop Effect"
);
