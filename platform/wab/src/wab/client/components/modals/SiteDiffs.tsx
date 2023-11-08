import L, { uniq } from "lodash";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { ensure, withoutNils, xSetDefault } from "../../../common";
import { MIXIN_CAP } from "../../../shared/Labels";
import type {
  ChangeLogEntry,
  SemVerSiteElement,
} from "../../../shared/site-diffs";
import { SplitType } from "../../../splits";
import CloseIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Close";
import ComponentIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Component";
import GlobeIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Globe";
import ImageBlockIcon from "../../plasmic/plasmic_kit/PlasmicIcon__ImageBlock";
import MixinIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Mixin";
import PencilIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Pencil";
import PlusIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import SlotIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Slot";
import ThemeIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Theme";
import TokenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Token";
import VariantGroupIcon from "../../plasmic/plasmic_kit/PlasmicIcon__VariantGroup";
import TextInputIcon from "../../plasmic/plasmic_kit_design_system/PlasmicIcon__TextInput";
import VariantIcon from "../../plasmic/plasmic_kit_design_system/PlasmicIcon__Variant";
import RocketsvgIcon from "../../plasmic/q_4_icons/icons/PlasmicIcon__Rocketsvg";
import { Icon } from "../widgets/Icon";
import sty from "./SiteDiffs.module.css";

React;

export const SiteDiffs = observer(function SideDiffs(props: {
  diffs: ChangeLogEntry[];
}) {
  const { diffs } = props;

  const parentNameByUuid = new Map<string, string>();
  const diffsByParent = new Map<string, ChangeLogEntry[]>();
  for (const diff of diffs) {
    xSetDefault(
      diffsByParent,
      diff.parentComponent === "global" ? "global" : diff.parentComponent.uuid,
      () => []
    ).push(diff);
    if (diff.parentComponent !== "global") {
      parentNameByUuid.set(
        diff.parentComponent.uuid,
        diff.parentComponent.name
      );
    }
  }

  const globalDiffs = diffsByParent.get("global") || [];

  return (
    <div>
      <ul>
        <ChangeSubSection diffs={globalDiffs} />
      </ul>
      <ul>
        {[...diffsByParent.entries()].map(([parent, subDiffs]) => {
          if (parent === "global") {
            return null;
          }
          const [patches, others] = L.partition(
            subDiffs,
            (d) => d.releaseType === "patch"
          );
          return (
            <li>
              <div className={sty.item}>
                <Icon icon={ComponentIcon} className="component-fg mr-sm" />
                Component{" "}
                <strong>
                  {ensure(
                    parentNameByUuid.get(parent),
                    "Unexpected missing parent element in diffs"
                  )}
                </strong>
              </div>
              <ul className="pl-xxlg">
                <ChangeSubSection diffs={others} />
                {patches.length > 0 && (
                  <li className={sty.item}>
                    <Icon icon={ThemeIcon} className="dimfg mr-sm" />
                    Styles and elements updated
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

export function objIcon(obj: SemVerSiteElement) {
  if (obj.type === "Variant group" || obj.type === "Global variant group") {
    return (
      <Icon
        className="variant-fg"
        icon={obj.type === "Variant group" ? VariantGroupIcon : GlobeIcon}
      />
    );
  } else if (obj.type === "Param") {
    return <Icon className="component-fg" icon={SlotIcon} />;
  } else if (obj.type === "Variant") {
    return <Icon className="variant-fg" icon={VariantIcon} />;
  } else if (obj.type === "Style token") {
    return <Icon className="token-fg" icon={TokenIcon} />;
  } else if (obj.type === "Mixin") {
    return <Icon className="mixin-fg" icon={MixinIcon} />;
  } else if (obj.type === "Component") {
    return <Icon className="component-fg" icon={ComponentIcon} />;
  } else if (obj.type === "Icon" || obj.type === "Image") {
    return <Icon className="tag-fg" icon={ImageBlockIcon} />;
  } else {
    // tpl node
    return (
      <span className="tag-fg">
        {/*
        TODO: Store the Icon info in `obj` since we can't compute it here
        createNodeIcon(
          obj,
          isTplVariantable(obj)
            ? new EffectiveVariantSetting(obj, [
                ensure(tryGetBaseVariantSetting(obj)),
              ])
            : undefined
        )*/}
      </span>
    );
  }
}

export const SplitStatusUpdateSection = observer(
  function SplitStatusUpdateSection(props: { diffs: ChangeLogEntry[] }) {
    const { diffs } = props;
    const splitStatusUpdate = diffs.filter(
      (f) => f.description === "split-status-update"
    );
    return (
      <>
        {splitStatusUpdate.length > 0 && (
          <li>
            <div className={sty.headerItem}>
              <Icon icon={RocketsvgIcon} className="dimfg mr-sm" />
              Split Status Updated
            </div>
            <ul className="pl-xxlg">
              {splitStatusUpdate.map((diff) => (
                <li className={sty.item}>
                  <SplitChangeEntity diff={diff} />
                </li>
              ))}
            </ul>
          </li>
        )}
      </>
    );
  }
);

export const SplitStatusUpdateSummarySection = observer(
  function SplitStatusUpdateSummarySection(props: { diffs: ChangeLogEntry[] }) {
    const { diffs } = props;
    const getTypeText = (type: string) => {
      switch (type) {
        case SplitType.Experiment: {
          return "A/B Tests";
        }
        case SplitType.Schedule: {
          return "Scheduled";
        }
        case SplitType.Segment: {
          return "Targeted";
        }
        default: {
          return "";
        }
      }
    };
    const splitTypesChanged = uniq(
      withoutNils(
        diffs.map((f) => {
          if (
            f.description === "split-status-update" &&
            f.newValue?.type === "Split Status"
          ) {
            return getTypeText(f.newValue.splitType);
          }
          return null;
        })
      )
    ).sort();
    if (splitTypesChanged.length === 0) {
      return null;
    }
    return (
      <div className={sty.headerItem}>
        {splitTypesChanged.map((val, idx) => {
          const separator =
            idx === splitTypesChanged.length - 2
              ? " and "
              : idx < splitTypesChanged.length - 2
              ? ", "
              : "";
          return `${val}${separator}`;
        })}{" "}
        content changed.
      </div>
    );
  }
);

const ChangeSubSection = observer(function ChangeSubSection(props: {
  diffs: ChangeLogEntry[];
}) {
  const { diffs } = props;
  const removeds = diffs.filter((f) => f.description === "removed");
  const addeds = diffs.filter((f) => f.description === "added");

  // We also ignore renaming of variants that are standalone, as renaming of the corresponding
  // variant group is sufficient
  const renameds = diffs.filter(
    (f) =>
      f.description === "renamed" &&
      (!(f.newValue?.type === "Variant") || !f.newValue.isStandalone)
  );
  const updateds = diffs.filter((f) => f.description === "updated");

  return (
    <>
      <SplitStatusUpdateSection diffs={diffs} />
      {removeds.length > 0 && (
        <li>
          <div className={sty.headerItem}>
            <Icon icon={CloseIcon} className="removed-fg mr-sm" />
            Removed
          </div>
          <ul className="pl-xxlg">
            {removeds.map((diff) => (
              <li className={sty.item}>
                <ChangeEntity diff={diff} />
              </li>
            ))}
          </ul>
        </li>
      )}
      {addeds.length > 0 && (
        <li>
          <div className={sty.headerItem}>
            <Icon icon={PlusIcon} className="added-fg mr-sm" />
            Added
          </div>
          <ul className="pl-xxlg">
            {addeds.map((diff) => (
              <li className={sty.item}>
                <ChangeEntity diff={diff} />
              </li>
            ))}
          </ul>
        </li>
      )}
      {renameds.length > 0 && (
        <li>
          <div className={sty.headerItem}>
            <Icon icon={TextInputIcon} className="dimfg mr-sm" />
            Renamed
          </div>
          <ul className="pl-xxlg">
            {renameds.map((diff) => (
              <li className={sty.item}>
                <ChangeRenamedEntity diff={diff} />
              </li>
            ))}
          </ul>
        </li>
      )}
      {updateds.length > 0 && (
        <li>
          <div className={sty.headerItem}>
            <Icon icon={PencilIcon} className="dimfg mr-sm" />
            Updated
          </div>
          <ul className="pl-xxlg">
            {updateds.map((diff) => (
              <li className={sty.item}>
                <ChangeEntity diff={diff} />
              </li>
            ))}
          </ul>
        </li>
      )}
    </>
  );
});

const ChangeEntity = observer(function ChangeEntity(props: {
  diff: ChangeLogEntry;
}) {
  const entity = props.diff.newValue ?? props.diff.oldValue;
  if (entity) {
    return (
      <>
        <span className="mr-sm">{objIcon(entity)}</span>
        {entity.type === "Mixin" ? MIXIN_CAP : entity.type}{" "}
        <strong>{entity.name}</strong>
      </>
    );
  }
  return null;
});

const SplitChangeEntity = observer(function SplitChangeEntity(props: {
  diff: ChangeLogEntry;
}) {
  const oldValue = props.diff.oldValue;
  const newValue = props.diff.newValue;
  if (oldValue?.type === "Split Status" && newValue?.type === "Split Status") {
    return (
      <>
        <span className="mr-sm">{objIcon(newValue)}</span>
        <strong>{newValue.name}</strong> from <strong>{oldValue.value}</strong>{" "}
        to <strong>{newValue.value}</strong>
      </>
    );
  }
  return null;
});

const ChangeRenamedEntity = observer(function ChangeRenamedEntity(props: {
  diff: ChangeLogEntry;
}) {
  const { diff } = props;
  const entity = ensure(
    diff.oldValue,
    "Unexpected rename diff element without oldValue"
  );
  if (entity) {
    return (
      <>
        <span className="mr-sm">{objIcon(entity)}</span>
        {entity.type} <strong>{entity.name}</strong> renamed to{" "}
        <strong>
          "
          {
            ensure(
              diff.newValue,
              "Unexpected Rename diff element without newValue"
            ).name
          }
          "
        </strong>
      </>
    );
  }
  return null;
});
