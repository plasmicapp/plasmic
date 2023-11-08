import { Tooltip } from "antd";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { useEffect } from "react";
import { ArenaFrame, isKnownArenaFrame, TplSlot } from "../../../classes";
import { cx, ensure, spawn } from "../../../common";
import { InlineEdit } from "../../../commons/components/InlineEdit";
import { OnClickAway } from "../../../commons/components/OnClickAway";
import * as Tpls from "../../../tpls";
import { isTplNamable, isTplSlot } from "../../../tpls";
import RepeatingsvgIcon from "../../plasmic/plasmic_kit_icons/icons/PlasmicIcon__Repeatingsvg";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { Icon } from "../widgets/Icon";
import { Textbox } from "../widgets/Textbox";
import styles from "./EditableNodeLabel.module.sass";

export const EditableNodeLabel = observer(function EditableNodeLabel_(props: {
  studioCtx: StudioCtx;
  viewCtx?: ViewCtx;
  className?: string;
  displayName: string;
  icon?: React.ReactNode;
  isRepeated?: boolean;
  nameable?: ArenaFrame | Tpls.TplNamable | TplSlot;
  onChangeEditing?: (editing: boolean) => void;
}) {
  const {
    studioCtx,
    viewCtx,
    className,
    displayName,
    icon,
    isRepeated,
    nameable,
  } = props;

  const isRenamingFocused = studioCtx.renamingFocused();

  return (
    <InlineEdit
      render={({ editing, onStart, onDone }) => {
        useEffect(() => props.onChangeEditing?.(editing), [editing]);

        useEffect(() => {
          if (isRenamingFocused && !editing) {
            if (nameable) {
              onStart();
            }
            studioCtx.endRenamingFocused();
          }
        }, [isRenamingFocused]);

        return editing ? (
          <div className={className}>
            {nameable && (
              <OnClickAway onDone={onDone}>
                <div>
                  <Textbox
                    // We specify a key here to re-mount the Textbox when we
                    // switch to a different node. That makes sure that our
                    // onEdit handler will fire, and the current node is renamed.
                    key={nameable.uid}
                    styleType={["seamless", "inverted", "autoheight"]}
                    defaultValue={
                      isTplSlot(nameable)
                        ? nameable.param.variable.name
                        : isKnownArenaFrame(nameable)
                        ? nameable.container.component.name
                        : nameable.name || ""
                    }
                    wrapperProps={{
                      style: {
                        minWidth: 75,
                      },
                    }}
                    selectAllOnAutoFocus
                    autoFocus
                    onBlur={onDone}
                    onEnter={onDone}
                    onEscape={onDone}
                    skipEditOnEnter={true}
                    onEdit={(name) => {
                      spawn(
                        studioCtx.changeUnsafe(() => {
                          if (isTplNamable(nameable)) {
                            ensure(viewCtx, "viewCtx is undefined")
                              .getViewOps()
                              .renameTpl(name, nameable);
                          } else if (isTplSlot(nameable)) {
                            ensure(viewCtx, "viewCtx is undefined")
                              .getViewOps()
                              .tryRenameParam(name, nameable.param);
                          } else {
                            ensure(viewCtx, "viewCtx is undefined")
                              .getViewOps()
                              .renameNode(nameable, name);
                          }
                          onDone();
                        })
                      );
                    }}
                  />
                </div>
              </OnClickAway>
            )}
          </div>
        ) : (
          <div
            className={cx(className, styles.container)}
            onDoubleClick={nameable ? onStart : undefined}
          >
            <>
              {icon && <div className="InlineIcon mr-sm">{icon}</div>}
              {displayName}
              {isRepeated && (
                <Tooltip title="Repeated element" mouseEnterDelay={0.5}>
                  <Icon
                    className={styles.repeatedElementIcon}
                    icon={RepeatingsvgIcon}
                  />
                </Tooltip>
              )}
            </>
          </div>
        );
      }}
    />
  );
});
