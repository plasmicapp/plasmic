import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import styles from "@/wab/client/components/sidebar/SidebarSection.module.scss";
import { Icon } from "@/wab/client/components/widgets/Icon";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import ChevronDownsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__ChevronDownsvg";
import ChevronUpsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__ChevronUpsvg";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import { isEmptyReactNode } from "@/wab/commons/ViewUtil";
import cn from "classnames";
import { observer, Observer } from "mobx-react";
import React, {
  CSSProperties,
  forwardRef,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type MaybeCollapsibleRow = { collapsible: boolean; content: ReactNode };

type CollapsingOptions = {
  alwaysVisible?: boolean;
};

export type MaybeCollapsibleRowsRenderer = (
  rows: (MaybeCollapsibleRow | undefined | null | false)[],
  options?: CollapsingOptions
) => React.ReactNode[];

export function useMaybeCollapsibleRows({
  fullyCollapsibleBody = false,
  defaultExpanded = false,
  onCollapsed,
  onExpanded,
  sticky,
  noBorder = false,
}: {
  fullyCollapsibleBody?: boolean;
  defaultExpanded?: boolean;
  sticky?: boolean;
  onCollapsed?: () => void;
  onExpanded?: () => void;
  noBorder?: boolean;
} = {}) {
  const [showMore, setShowMore] = useState(defaultExpanded);
  const isFullyCollapsed = useRef(false);

  const renderMaybeCollapsibleRows = useCallback<MaybeCollapsibleRowsRenderer>(
    (
      _rows: (MaybeCollapsibleRow | undefined | null | false)[],
      opts?: CollapsingOptions
    ) => {
      const rows = _rows.filter((x) => !!x) as MaybeCollapsibleRow[];
      const showExpansionHandle = rows.some(
        (it) => it.content && it.collapsible
      );

      const renderableRows = rows.filter(
        (it) => it.content && (showMore || !it.collapsible)
      );

      if (!showMore && renderableRows.length === 0) {
        isFullyCollapsed.current = true;
      }

      if ((!showExpansionHandle && !showMore) || renderableRows.length) {
        isFullyCollapsed.current = false;
      }

      return [
        ...renderableRows.map((it, i) =>
          React.cloneElement(it.content as ReactElement, { key: i })
        ),
        showExpansionHandle && (
          <div
            key="showMore"
            data-show-extra-content={String(showMore)}
            data-test-id="show-extra-content"
            className={cn({
              [styles.collapsingToggle]: true,
              [styles.collapsingToggle_sticky]: sticky,
              [styles.fullyCollapsedBody]:
                isFullyCollapsed.current && fullyCollapsibleBody,
              [styles.collapsingToggleAlwaysVisible]: opts?.alwaysVisible,
            })}
            style={!noBorder ? { borderBottom: "1px solid #eee" } : {}}
          >
            <button
              className={cn(styles.collapsingToggleLabel, {
                [styles.collapsingToggleLabel_expanded]: showMore,
              })}
              onClick={() => {
                const nextShowMore = !showMore;
                setShowMore(nextShowMore);

                if (nextShowMore) {
                  onExpanded?.();
                } else {
                  onCollapsed?.();
                }
              }}
              data-test-id="collapse"
            >
              <Icon icon={showMore ? ChevronUpsvgIcon : ChevronDownsvgIcon} />
            </button>
          </div>
        ),
      ];
    },
    [showMore, fullyCollapsibleBody]
  );

  return {
    showMore,
    toggleExpansion: () => setShowMore(!showMore),
    expand: () => setShowMore(true),
    collapse: () => setShowMore(false),
    isFullyCollapsed,
    renderMaybeCollapsibleRows,
  };
}

interface SidebarSectionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  className?: string;
  title?: ReactNode;
  controls?: ReactNode;
  children?:
    | ReactNode
    | ((renderMaybeCollapsibleRows: MaybeCollapsibleRowsRenderer) => ReactNode);
  tooltip?: ReactNode;
  emptyBody?: boolean;
  zeroBodyPadding?: boolean;
  noBottomPadding?: boolean;
  maxHeight?: number;
  style?: CSSProperties;
  headerClass?: string;
  noBorder?: boolean;
  hasExtraContent?: boolean;
  scrollable?: boolean;
  defaultExpanded?: boolean;
  fullyCollapsible?: boolean;
  definedIndicator?: ReactNode;
  onExpanded?: () => void;
  onHeaderClick?: MouseEventHandler;
  onExtraContentExpanded?: () => void;
  onCollapsed?: () => void;
  onExtraContentCollapsed?: () => void;
  dataExpandTestId?: string;
  isHeaderActive?: boolean;
  defaultExtraContentExpanded?: boolean;
  oneLiner?: boolean;
  makeHeaderMenu?: () => React.ReactElement;
}

export type SidebarSectionHandle = {
  expand(): void;
  collapse(): void;
};

export const SidebarSection = observer(forwardRef(SidebarSection_));

export function SidebarSection_(
  {
    className,
    title,
    // tooltip,
    controls,
    children,
    emptyBody = false,
    zeroBodyPadding,
    noBottomPadding,
    scrollable,
    maxHeight,
    style,
    // headerClass,
    noBorder,
    // onCollapsed,
    // onExpanded,
    onExtraContentCollapsed,
    onExtraContentExpanded,
    defaultExpanded,
    defaultExtraContentExpanded,
    definedIndicator,
    // dataExpandTestId,
    isHeaderActive,
    makeHeaderMenu,
    hasExtraContent,
    oneLiner,
    fullyCollapsible,
    onHeaderClick,
    ...otherProps
  }: SidebarSectionProps,
  ref: React.Ref<SidebarSectionHandle>
) {
  const hasHeader = title || controls;
  const [expanded, setExpanded] = React.useState(defaultExpanded ?? true);
  const hasBodyContent = !isEmptyReactNode(children as any) && !emptyBody;
  const showBodyContent = expanded && hasBodyContent;

  useEffect(() => {
    // If hasBodyContent is changed to true or false, then expand / collapse
    // to show / hide the content
    setExpanded(hasBodyContent);
  }, [hasBodyContent]);

  const {
    isFullyCollapsed,
    toggleExpansion,
    renderMaybeCollapsibleRows,
    ...maybeCollapsibleRows
  } = useMaybeCollapsibleRows({
    defaultExpanded: defaultExtraContentExpanded,
    fullyCollapsibleBody: fullyCollapsible,
    sticky: scrollable,
    onCollapsed: onExtraContentCollapsed,
    onExpanded: onExtraContentExpanded,
    noBorder,
  });

  useImperativeHandle(
    ref,
    () => ({
      expand: () => {
        maybeCollapsibleRows.expand();
        setExpanded(true);
      },
      collapse: () => {
        maybeCollapsibleRows.collapse();
        setExpanded(false);
      },
    }),
    []
  );

  const renderableChildren =
    typeof children === "function"
      ? children(renderMaybeCollapsibleRows)
      : children;

  return (
    <div
      className={cn(className, {
        [styles.root]: true,
        [styles.root_scrollable]: scrollable,
        [styles.root_fullyCollapsible]: fullyCollapsible,
        SidebarSection__Container: true,
        "SidebarSection__Container--NoHeader": !hasHeader,
        "SidebarSection__Container--NoBorder": noBorder,
      })}
      style={style}
      {...otherProps}
    >
      {hasHeader && (
        <MaybeWrap
          cond={!!makeHeaderMenu}
          wrapper={(x) => (
            <WithContextMenu overlay={makeHeaderMenu!}>{x}</WithContextMenu>
          )}
        >
          <div
            className={cn(styles.headerRoot, {
              [styles["headerRoot--grid"]]: oneLiner,
            })}
            onClick={(e) => {
              if (onHeaderClick) {
                onHeaderClick(e);
              } else {
                toggleExpansion();
              }
            }}
          >
            <LabeledListItem
              indicator={definedIndicator}
              menu={makeHeaderMenu}
              padding={["noHorizontal", "noContent"]}
              labelSize="auto"
              alignment="center"
              label={
                <div
                  className={cn(styles.headerTitle, {
                    [styles.headerTitleActive]: isHeaderActive,
                  })}
                >
                  {title}
                </div>
              }
              contentAlignment="right"
            >
              <div
                className={styles.headerControls}
                onClick={(e) => e.stopPropagation()}
              >
                {controls}
              </div>
            </LabeledListItem>
          </div>
        </MaybeWrap>
      )}
      {showBodyContent && (
        <div
          className={cn({
            SidebarSection__Body: true,
            [styles.bodyScrollable]: scrollable,
            SidebarSection__Body__EmptyBody: emptyBody,
            SidebarSection__Body__ZeroBodyPadding: zeroBodyPadding,
            SidebarSection__Body__NoBottomPadding:
              noBottomPadding ||
              (fullyCollapsible && hasExtraContent && isFullyCollapsed.current),
          })}
          style={{
            maxHeight,
            overflowY: maxHeight === undefined ? undefined : "auto",
          }}
        >
          <Observer>{() => <>{renderableChildren}</>}</Observer>
        </div>
      )}
    </div>
  );
}
