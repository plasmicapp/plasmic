import { TplTag, Variant } from "@/wab/classes";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import { StyleVariantLabel } from "@/wab/client/components/VariantControls";
import { makeVariantMenu } from "@/wab/client/components/variants/variant-menu";
import VariantRow from "@/wab/client/components/variants/VariantRow";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import {
  IconLinkButton,
  useOnIFrameMouseDown,
} from "@/wab/client/components/widgets";
import { ElementStatesTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { spawn } from "@/wab/common";
import { getArbitraryCssSelectorsVariantsForTag } from "@/wab/shared/Variants";
import { Popover, RefSelectProps, Select } from "antd";
import { observer } from "mobx-react-lite";
import React from "react";

export const ArbitraryCssSelectorsPanel = observer(
  function ArbitraryCssSelectorsPanel(props: {
    tpl: TplTag;
    viewCtx: ViewCtx;
    studioCtx: StudioCtx;
  }) {
    const { tpl, studioCtx, viewCtx } = props;

    const component = viewCtx.currentTplComponent().component;
    const [editingVariant, setEditingVariant] = React.useState<
      Variant | undefined
    >(undefined);

    if (!viewCtx.valState().maybeValSysRoot()) {
      return null;
    }

    const vcontroller = makeVariantsController(studioCtx);
    if (!vcontroller) {
      return null;
    }

    const addCssSelector = (selector: string) =>
      studioCtx.changeUnsafe(() => {
        const variant = studioCtx
          .tplMgr()
          .createPrivateStyleVariant(component, tpl, [selector]);
        setEditingVariant(variant);
        vcontroller.onAddedVariant(variant);
      });

    const styleVariants = getArbitraryCssSelectorsVariantsForTag(
      component,
      tpl
    );
    const selectRef = React.useRef<RefSelectProps>(null);

    return (
      <SidebarSection
        key={String(styleVariants.length > 0)}
        zeroBodyPadding
        title={
          <div>
            <LabelWithDetailedTooltip tooltip={<ElementStatesTooltip />}>
              Arbitrary CSS Selectors
            </LabelWithDetailedTooltip>
          </div>
        }
        isHeaderActive={styleVariants.length > 0}
        controls={
          <AddCssSelectorButton
            onSelect={(selector) => addCssSelector(selector)}
          />
        }
      >
        {styleVariants.length > 0 ? (
          <div className="pass-through">
            {styleVariants.map((variant) => (
              <VariantRow
                key={variant.uuid}
                variant={variant}
                studioCtx={studioCtx}
                viewCtx={viewCtx}
                pinState={vcontroller.getPinState(variant)}
                onClick={() =>
                  studioCtx.changeUnsafe(() =>
                    vcontroller.onClickVariant(variant)
                  )
                }
                onToggle={() =>
                  studioCtx.changeUnsafe(() =>
                    vcontroller.onToggleVariant(variant)
                  )
                }
                onTarget={(target) =>
                  studioCtx.changeUnsafe(() =>
                    vcontroller.onTargetVariant(variant, target)
                  )
                }
                menu={makeVariantMenu({
                  variant,
                  component,
                  onRemove: () =>
                    spawn(
                      studioCtx.changeUnsafe(() =>
                        spawn(
                          studioCtx.siteOps().removeVariant(component, variant)
                        )
                      )
                    ),
                  onClone: () =>
                    spawn(
                      studioCtx.changeUnsafe(() =>
                        studioCtx.tplMgr().cloneVariant(component, variant)
                      )
                    ),
                  onCopyTo: (toVariant) =>
                    spawn(
                      studioCtx.changeUnsafe(() =>
                        studioCtx
                          .tplMgr()
                          .copyToVariant(component, variant, toVariant)
                      )
                    ),
                })}
                label={
                  <StyleVariantLabel
                    variant={variant}
                    forTag={tpl.tag}
                    forRoot={tpl === component.tplTree}
                    overrideSelectors={variant.selectors ?? []}
                    onSelectorsChange={(sels) =>
                      viewCtx.change(() => {
                        variant.selectors = sels;
                        setEditingVariant(undefined);
                      })
                    }
                    onBlur={() =>
                      studioCtx.changeUnsafe(() => {
                        studioCtx
                          .siteOps()
                          .removeStyleVariantIfEmptyAndUnused(
                            component,
                            variant
                          );
                        setEditingVariant(undefined);
                      })
                    }
                    defaultEditing={variant === editingVariant}
                  />
                }
              />
            ))}
          </div>
        ) : null}
      </SidebarSection>
    );
  }
);

function AddCssSelectorButton(props: { onSelect: (attr: string) => void }) {
  const { onSelect } = props;
  const [searchValue, setSearchValue] = React.useState<string | undefined>(
    undefined
  );
  const [showing, setShowing] = React.useState(false);
  const selectRef = React.useRef<RefSelectProps>(null);
  useOnIFrameMouseDown(() => {
    setShowing(false);
  });
  return (
    <Popover
      trigger={["click"]}
      onVisibleChange={(visible) => {
        setShowing(visible);
        setSearchValue(undefined);
        if (visible) {
          selectRef.current?.focus();
        }
      }}
      overlayClassName="ant-popover--tight"
      visible={showing}
      placement={"left"}
      destroyTooltipOnHide
      content={
        <Select
          showSearch={true}
          searchValue={searchValue}
          onSearch={(val) => setSearchValue(val)}
          onSelect={(val) => {
            onSelect(val as string);
            setShowing(false);
          }}
          onBlur={() => setShowing(false)}
          style={{
            width: 200,
          }}
          autoFocus
          bordered={false}
          ref={selectRef}
          placeholder="Search or enter any attribute"
          open
        >
          {searchValue && (
            <Select.Option key={"__custom__"} value={searchValue}>
              {searchValue}
            </Select.Option>
          )}
        </Select>
      }
    >
      <IconLinkButton data-test-id="add-css-selector">
        <Icon icon={PlusIcon} />
      </IconLinkButton>
    </Popover>
  );
}
