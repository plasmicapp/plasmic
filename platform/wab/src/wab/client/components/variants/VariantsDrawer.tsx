import { Variant, VariantGroup } from "@/wab/classes";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import VariantsDrawerHeader from "@/wab/client/components/variants/VariantsDrawerHeader";
import VariantsDrawerRow from "@/wab/client/components/variants/VariantsDrawerRow";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import BoltIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Bolt";
import GlobeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Globe";
import VariantGroupIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__VariantGroup";
import ScreenIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Screen";
import { PlasmicVariantsDrawer } from "@/wab/client/plasmic/plasmic_kit_variants/PlasmicVariantsDrawer";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, partitions, xGroupBy } from "@/wab/common";
import {
  getNamespacedComponentName,
  getSuperComponentVariantGroupToComponent,
} from "@/wab/components";
import {
  getAllVariantsForTpl,
  isComponentStyleVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isScreenVariantGroup,
  isStandaloneVariantGroup,
  isStyleVariant,
  makeVariantName,
} from "@/wab/shared/Variants";
import { isTplTag } from "@/wab/tpls";
import { useCombobox } from "downshift";
import { observer } from "mobx-react";
import * as React from "react";
import { useMemo } from "react";
import { FocusScope } from "react-aria";

const VariantsDrawer = observer(function VariantsDrawer(props: {
  viewCtx: ViewCtx;
}) {
  const { viewCtx } = props;
  const tpl = viewCtx.focusedTpl();
  const vcontroller = makeVariantsController(viewCtx.studioCtx);
  const inputRef = React.useRef<TextboxRef>(null);
  const component = viewCtx.currentComponent();
  const allVariants = getAllVariantsForTpl({
    component,
    tpl: viewCtx.focusedTpl(),
    site: viewCtx.site,
    includeSuperVariants: true,
  });

  const [query, setQuery] = React.useState("");
  const matcher = new Matcher(query);
  const filteredVariants = allVariants.filter((v) => {
    if (
      isScreenVariant(v) &&
      v.parent !== viewCtx.site.activeScreenVariantGroup
    ) {
      return false;
    } else if (isStyleVariant(v)) {
      return ensure(v.selectors).some((sel) => matcher.matches(sel));
    } else {
      return matcher.matches(v.name);
    }
  });

  const groupToSuperComp = getSuperComponentVariantGroupToComponent(component);

  const [
    privateStyleVariants,
    compStyleVariants,
    compVariants,
    globalVariants,
  ] = partitions(filteredVariants, [
    isPrivateStyleVariant,
    isComponentStyleVariant,
    (v) => !isGlobalVariant(v),
  ]);

  const makeGroupName = (group: VariantGroup) => {
    const superComp = ensure(groupToSuperComp.get(group));
    if (superComp) {
      return `${getNamespacedComponentName(superComp)} - ${
        group.param.variable.name
      }`;
    } else {
      return group.param.variable.name;
    }
  };

  const makeVariantRow = (variant: Variant) => (
    <li
      key={variant.uuid}
      {...getItemProps({
        item: variant,
        index: filteredVariants.indexOf(variant),
      })}
      aria-label={
        isPrivateStyleVariant(variant) && isTplTag(tpl)
          ? `Element state ${makeVariantName({
              variant: variant,
              focusedTag: tpl,
            })}`
          : isComponentStyleVariant(variant)
          ? `Component interaction ${makeVariantName({ variant })}`
          : `${ensure(variant.parent).param.variable.name} = ${makeVariantName({
              variant: variant,
            })}`
      }
      role="option"
    >
      <VariantsDrawerRow
        variant={variant}
        isFocused={filteredVariants[highlightedIndex] === variant}
        matcher={matcher}
        pinState={vcontroller?.getPinState(variant)}
        onTarget={(target) =>
          viewCtx.change(() => vcontroller?.onTargetVariant(variant, target))
        }
        onToggle={() =>
          viewCtx.change(() => vcontroller?.onToggleVariant(variant))
        }
        focusedTpl={viewCtx.focusedTpl() ?? undefined}
        superComp={
          variant.parent ? groupToSuperComp.get(variant.parent) : undefined
        }
      />
    </li>
  );

  const {
    highlightedIndex,
    getInputProps,
    getItemProps,
    getComboboxProps,
    getMenuProps,
    setHighlightedIndex,
  } = useCombobox({
    isOpen: true,
    defaultIsOpen: true,
    items: filteredVariants,
    selectedItem: null,
    itemToString: (variant) => variant?.uuid ?? "",
    onInputValueChange: ({ inputValue }) => {
      setQuery(inputValue ?? "");
    },
    onSelectedItemChange: ({ selectedItem }) => {
      viewCtx.change(() => {
        if (selectedItem) {
          vcontroller?.onClickVariant(selectedItem);
        }
        viewCtx.studioCtx.setShowVariantsDrawer(false);
      });
    },
  });

  const groupedCompVariants = useMemo(
    () => [...xGroupBy(compVariants, (v) => ensure(v.parent)).entries()],
    [compVariants]
  );

  return (
    <FocusScope contain restoreFocus>
      <PlasmicVariantsDrawer
        root={
          {
            onKeyDown: (e: React.KeyboardEvent) => {
              e.stopPropagation();

              // We install a key handler at root, to handle case where
              // focus has left the textbox, but we still want to
              // be able to keyboard-navigate around
              if (e.key === "ArrowDown") {
                if (highlightedIndex >= 0) {
                  setHighlightedIndex(highlightedIndex + 1);
                } else {
                  setHighlightedIndex(0);
                }
                inputRef.current && inputRef.current.focus();
              } else if (e.key === "ArrowUp") {
                if (highlightedIndex >= 0) {
                  setHighlightedIndex(highlightedIndex - 1);
                } else {
                  setHighlightedIndex(0);
                }
                inputRef.current && inputRef.current.focus();
              } else if (e.key.length === 1) {
                inputRef.current && inputRef.current.focus();
              }
            },
            "data-test-id": "variants-drawer",
          } as any
        }
        searchContainer={{
          ...getComboboxProps(),
        }}
        searchbox={{
          ...getInputProps({
            placeholder: "Select a variant",
            autoFocus: true,
            refKey: "ref",
            onBlur: (e) => {
              (e.nativeEvent as any).preventDownshiftDefault = true;
            },
            value: query,
            ref: inputRef as any,
          }),
        }}
        optionsContainer={{
          ...getMenuProps({
            "aria-label": "Select variant",
          }),

          style: {
            maxHeight: 400,
          },

          // Make the drawer focusable (but not in the tab order), so that
          // clicking on an option here will not blurWithin, closing the
          // popup.
          tabIndex: -1,
          className: "overflow-scroll-y",
        }}
      >
        {compStyleVariants.length > 0 && (
          <>
            <VariantsDrawerHeader icon={<Icon icon={BoltIcon} />}>
              Component Interactions
            </VariantsDrawerHeader>
            {compStyleVariants.map(makeVariantRow)}
          </>
        )}

        {privateStyleVariants.length > 0 && (
          <>
            <VariantsDrawerHeader icon={<Icon icon={BoltIcon} />}>
              Element States
            </VariantsDrawerHeader>
            {privateStyleVariants.map(makeVariantRow)}
          </>
        )}

        {compVariants.length > 0 &&
          groupedCompVariants.map(([group, variants]) => (
            <React.Fragment key={group.uuid}>
              {!isStandaloneVariantGroup(group) && (
                <VariantsDrawerHeader icon={<Icon icon={VariantGroupIcon} />}>
                  {makeGroupName(group)}
                </VariantsDrawerHeader>
              )}

              {variants.map(makeVariantRow)}
            </React.Fragment>
          ))}

        {globalVariants.length > 0 &&
          [...xGroupBy(globalVariants, (v) => ensure(v.parent)).entries()].map(
            ([group, variants]) => (
              <React.Fragment key={group.uuid}>
                <VariantsDrawerHeader
                  icon={
                    <Icon
                      icon={
                        isScreenVariantGroup(group) ? ScreenIcon : GlobeIcon
                      }
                    />
                  }
                >
                  {group.param.variable.name}
                </VariantsDrawerHeader>
                {variants.map(makeVariantRow)}
              </React.Fragment>
            )
          )}
      </PlasmicVariantsDrawer>
    </FocusScope>
  );
});

export default VariantsDrawer;
