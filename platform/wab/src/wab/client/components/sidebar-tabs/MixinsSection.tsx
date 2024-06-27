import { MixinPopup } from "@/wab/client/components/sidebar/MixinControls";
import {
  SidebarSection,
  SidebarSectionHandle,
} from "@/wab/client/components/sidebar/SidebarSection";
import { IconLinkButton } from "@/wab/client/components/widgets";
import { ApplyMixinsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { XMultiSelect } from "@/wab/client/components/XMultiSelect";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure, removeAt } from "@/wab/shared/common";
import { insertAt } from "@/wab/commons/collections";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { MIXIN_CAP, MIXINS_CAP } from "@/wab/shared/Labels";
import {
  ensureKnownMixin,
  isKnownMixin,
  Mixin,
  TplNode,
} from "@/wab/shared/model/classes";
import { tryGetVariantSetting } from "@/wab/shared/Variants";
import { allMixins, isEditable } from "@/wab/shared/core/sites";
import { Tooltip } from "antd";
import L from "lodash";
import { observer } from "mobx-react";
import React, { useEffect, useRef, useState } from "react";

interface CreateOption {
  type: "create";
  text: string;
}

export const MixinsSection = observer(function (props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
}) {
  const { tpl, viewCtx } = props;

  const sectionRef = useRef<SidebarSectionHandle>(null);

  const vtm = viewCtx.variantTplMgr();
  const activeVariants = [...vtm.getActivatedVariantsForNode(tpl)];
  const targetCombo = vtm.getTargetVariantComboForNode(tpl);
  const effectiveVs = vtm.effectiveVariantSetting(tpl, activeVariants);
  const targetVs = tryGetVariantSetting(tpl, targetCombo);
  const [editMixin, setEditMixin] = React.useState<Mixin | undefined>(
    undefined
  );
  const [revealed, setRevealed] = useState(false);

  const reveal = () => {
    setRevealed(true);
    sectionRef.current?.expand();
  };

  const onMixinEdited = () => {
    viewCtx.change(() => {
      vtm.applyMixin(
        tpl,
        ensure(editMixin, "Unexpected undefined editMixin"),
        targetCombo
      );
      setEditMixin(undefined);
    });
  };

  useEffect(() => {
    if (targetVs?.rs.mixins.length) {
      sectionRef.current?.expand();
    }
  }, [targetVs?.rs.mixins.length]);

  if (!targetVs) {
    return null;
  }

  const fixedMixins = L.difference(effectiveVs.rs.mixins, targetVs.rs.mixins);
  const mixinOptions: (Mixin | CreateOption)[] = [
    ...L.difference(
      allMixins(viewCtx.studioCtx.site, { includeDeps: "direct" }),
      [...targetVs.rs.mixins, ...fixedMixins]
    ),
    { type: "create", text: "" } as CreateOption,
  ];

  const itemsLength = targetVs.rs.mixins.length + fixedMixins.length;

  return (
    <SidebarSection
      ref={sectionRef}
      title={
        <LabelWithDetailedTooltip tooltip={<ApplyMixinsTooltip />}>
          {MIXINS_CAP}
        </LabelWithDetailedTooltip>
      }
      onExpanded={() => reveal()}
      defaultExpanded={itemsLength > 0}
      isHeaderActive={itemsLength > 0}
      onHeaderClick={itemsLength === 0 ? reveal : undefined}
      controls={
        <IconLinkButton onClick={reveal}>
          <Icon icon={PlusIcon} />
        </IconLinkButton>
      }
    >
      {fixedMixins.length > 0 && (
        <div className={"fixed-mixins-container flex"}>
          <Tooltip title={<>Applied Mixins from other variants</>}>
            {fixedMixins.map((mixin, index) => (
              <div key={mixin.uuid} className={"fixed-mixins-pill"}>
                <span className={"fixed-mixins-pill__contents"}>
                  <div>{mixin.name}</div>
                </span>
              </div>
            ))}
          </Tooltip>
        </div>
      )}
      {(revealed || itemsLength > 0) && (
        <XMultiSelect<Mixin | CreateOption>
          autoFocus={revealed}
          onOuterClick={() => {
            if (itemsLength === 0) {
              setRevealed(false);
            }
          }}
          options={mixinOptions}
          renderOption={(mixin) => {
            if (isKnownMixin(mixin)) {
              return mixin.name;
            } else {
              return (
                <>
                  Create new {MIXIN_CAP}{" "}
                  {mixin.text && (
                    <strong>
                      <code>{mixin.text}</code>
                    </strong>
                  )}
                </>
              );
            }
          }}
          itemKey={(item) =>
            isKnownMixin(item) ? item.uuid : item ? "(create)" : ""
          }
          renderSelectedItem={(mixin) => (
            <MaybeWrap
              cond={
                isKnownMixin(mixin) && isEditable(viewCtx.studioCtx.site, mixin)
              }
              wrapper={(x) => (
                <Tooltip title={<>Click to edit {MIXIN_CAP}</>}>
                  {x as React.ReactElement}
                </Tooltip>
              )}
            >
              <div>{ensureKnownMixin(mixin).name}</div>
            </MaybeWrap>
          )}
          onSelect={(item) => {
            if (isKnownMixin(item)) {
              viewCtx.change(() => vtm.applyMixin(tpl, item, targetCombo));
              return false;
            } else {
              viewCtx.change(() => {
                const mixin = viewCtx.studioCtx.tplMgr().addMixin(item.text);
                setEditMixin(mixin);
              });
              return true;
            }
          }}
          onUnselect={(item) =>
            viewCtx.change(() =>
              vtm.removeMixin(tpl, ensureKnownMixin(item), targetCombo)
            )
          }
          focusedItem={editMixin ? editMixin : undefined}
          onFocusItem={(item) => setEditMixin(ensureKnownMixin(item))}
          onReorder={(fromIndex, toIndex) => {
            viewCtx.change(() => {
              const moved = removeAt(targetVs.rs.mixins, fromIndex);
              insertAt(
                targetVs.rs.mixins,
                moved,
                toIndex < fromIndex ? toIndex : toIndex
              );
            });
          }}
          selectedItems={[...targetVs.rs.mixins]}
          pillClassName="code mixin-bg"
          pillSelectedClassName="mixin-strongbg"
          filterOptions={(options, input) => {
            if (!input) {
              return options;
            }
            return [
              ...options.filter(
                (option) =>
                  isKnownMixin(option) &&
                  option.name.toLowerCase().includes(input.toLowerCase())
              ),
              { type: "create", text: input },
            ];
          }}
          onBlur={() => {
            setRevealed(false);
          }}
        />
      )}
      {editMixin && isEditable(viewCtx.studioCtx.site, editMixin) && (
        <MixinPopup
          mixin={editMixin}
          show={true}
          onClose={onMixinEdited}
          studioCtx={viewCtx.studioCtx}
        />
      )}
    </SidebarSection>
  );
});
