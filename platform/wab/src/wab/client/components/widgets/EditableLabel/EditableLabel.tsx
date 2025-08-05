import styles from "@/wab/client/components/widgets/EditableLabel/EditableLabel.module.scss";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import Tooltip from "antd/lib/tooltip";
import cn from "classnames";
import L from "lodash";
import * as React from "react";
import {
  forwardRef,
  ForwardRefRenderFunction,
  ReactElement,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type EditableLabelProps = {
  onEdit?: (val: string) => boolean | void | Promise<void>;
  value: string;
  programmaticallyTriggered?: boolean;
  inputBoxPlaceholder?: string;
  inputBoxFactory?: (props: React.ComponentProps<"input">) => ReactElement;
  inputBoxClassName?: string;
  labelFactory?: <
    T extends {
      value: string;
      children: React.ReactNode;
      onClick: React.MouseEventHandler<any>;
      className: string;
    }
  >(
    props: T
  ) => ReactElement;
  disabled?: boolean;
  doubleClickToEdit?: boolean;
  defaultEditing?: boolean;
  editing?: boolean;
  // Shrinks label width to content when not editing
  shrinkLabel?: boolean;
  children?: React.ReactNode;
  onAbort?: () => void;
  allowEmptyString?: boolean;
  isTextSelectable?: boolean;
  isMultiline?: boolean;
  cols?: number;
  rows?: number;
};

export type EditableLabelHandles = { setEditing(editing: boolean): void };

const createInputBoxFactory = (
  props: Omit<React.ComponentProps<"input">, "ref"> &
    Omit<React.ComponentProps<"textarea">, "ref"> & {
      isMultiline: boolean;
    },
  ref: React.Ref<HTMLInputElement | HTMLTextAreaElement>
) => {
  const { isMultiline, cols, rows, ...rest } = props;
  if (isMultiline) {
    return (
      <textarea
        cols={cols}
        rows={rows}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        {...rest}
      />
    );
  }
  return <input {...rest} ref={ref as React.Ref<HTMLInputElement>} />;
};

const EditableLabel_: ForwardRefRenderFunction<
  EditableLabelHandles,
  EditableLabelProps
> = (props, ref) => {
  const labelRef = React.useRef<HTMLSpanElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    inputBoxPlaceholder = "",
    value,
    inputBoxFactory = createInputBoxFactory,
    labelFactory = ({ value: _value, ...labelProps }) => (
      <MaybeWrap
        cond={showTooltip}
        wrapper={(content) => (
          <Tooltip title={value} placement="topLeft">
            {content}
          </Tooltip>
        )}
      >
        <span {...labelProps} ref={labelRef} />
      </MaybeWrap>
    ),
    disabled = false,
    onEdit = L.noop,
    doubleClickToEdit = false,
    programmaticallyTriggered = false,
    defaultEditing = false,
    editing = false,
    shrinkLabel = false,
    onAbort,
    children,
    inputBoxClassName,
    allowEmptyString,
    isTextSelectable = false,
    isMultiline = false,
    cols,
    rows,
    ...restProps
  } = props;

  React.useLayoutEffect(() => {
    if (!labelRef.current) {
      return;
    }
    setShowTooltip(
      (labelRef.current as HTMLSpanElement).scrollWidth >
        (labelRef.current as HTMLSpanElement).offsetWidth
    );
  }, [value, labelRef.current]);

  const [_editing, _setEditing] = useState(defaultEditing);
  const [_value, _setValue] = useState(value);
  const inputBoxRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const labelBoxRef = useRef<HTMLElement>(null);

  useImperativeHandle(ref, () => ({
    setEditing: (e) => {
      _setEditing(e);
    },
  }));

  const tryFinish = useCallback(
    (val: /*TWZ*/ string) => {
      // @ts-expect-error
      if (onEdit!(val.trim()) !== false) {
        onAbort?.();
        return _setEditing(false);
      }
    },
    [onEdit, _setEditing, onAbort]
  );

  const abort = useCallback(() => {
    _setEditing(false);
    onAbort?.();
  }, [onAbort, _setEditing]);

  const finish = useCallback(() => {
    onEdit?.(_value.trim());
    _setEditing(false);
  }, [onEdit, _value, _setEditing]);

  const doEditing = useCallback(() => {
    if (!disabled) {
      _setEditing(true);
      _setValue(value);
    }
  }, [value, _setValue, _setEditing, disabled]);

  const handleDebouncedClick = useCallback(
    L.debounce(
      (target: EventTarget, e: MouseEvent) => {
        target.dispatchEvent(e);
      },
      300,
      {
        leading: true,
        trailing: false,
      }
    ),
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (programmaticallyTriggered) {
        return;
      }
      if ((e.nativeEvent as any).__plasmicDelayed) {
        // A delayed click, so we let it propagate
        return;
      } else if (doubleClickToEdit) {
        // When user double-clicks, two click events are first fired.  Here,
        // we fire the first event immediately, but avoid firing the second click.
        // Still not ideal, but feels very unresponsive if we wait to fire the
        // first click if the user is intending to single-click.
        e.stopPropagation();
        const target = e.target;
        const clonedEvent = new MouseEvent("click", e.nativeEvent);
        (clonedEvent as any).__plasmicDelayed = true;
        handleDebouncedClick(target, clonedEvent);
      } else {
        e.stopPropagation();
        doEditing();
      }
    },
    [doEditing, handleDebouncedClick]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (doubleClickToEdit) {
        e.stopPropagation();
        handleDebouncedClick.cancel();
        doEditing();
      }
    },
    [handleDebouncedClick, doEditing]
  );

  React.useEffect(() => {
    if (_editing && inputBoxRef.current) {
      inputBoxRef.current.focus({ preventScroll: true });
      inputBoxRef.current.select();
    }
  }, [_editing]);

  React.useEffect(() => {
    if (editing) {
      doEditing();
    }
  }, [editing]);

  return labelFactory({
    ...restProps,
    value,
    className: cn(
      (_editing || !shrinkLabel) && "flex-fill",
      "text-ellipsis-wrappable",
      _editing && styles.fullWidthLabelEditing,
      { "selectable-text": isTextSelectable }
    ),
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    ref: labelBoxRef,
    children: _editing ? (
      <OnClickAway onDone={finish}>
        {inputBoxFactory(
          {
            isMultiline,
            cols,
            rows,
            onBlur: finish,
            placeholder: inputBoxPlaceholder,
            value: _value,
            className: cn("flex-fill", styles.inputBox, inputBoxClassName),
            onChange: (e) => {
              _setValue(e.target.value ?? e.target.textContent ?? "");
            },
            onKeyDown: (e) => {
              if (e.key === "Escape") {
                abort();
              }
              const content = e.currentTarget.value;
              if (
                !isMultiline &&
                e.key === "Enter" &&
                (allowEmptyString || content)
              ) {
                tryFinish(content);
              }
            },
            onClick: (e) => e.stopPropagation(),
            tabIndex: 1,
            ...(labelBoxRef.current && {
              style: {
                width: labelBoxRef.current.offsetWidth,
              },
            }),
          },
          inputBoxRef
        )}
      </OnClickAway>
    ) : (
      children || value
    ),
  });
};

export const EditableLabel = forwardRef(EditableLabel_);
