import { WithContextMenu } from "@/wab/client/components/ContextMenu";
import styles from "@/wab/client/components/sidebar/SidebarSection.module.scss";
import { Icon } from "@/wab/client/components/widgets/Icon";
import LabeledListItem from "@/wab/client/components/widgets/LabeledListItem";
import ChevronDownsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg";
import ChevronUpsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronUpSvg";
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

export const SidebarSectionContext = React.createContext<{
  isExpanded: boolean;
}>({
  isExpanded: false,
});

export const useSidebarSection = () => React.useContext(SidebarSectionContext);

export type MaybeCollapsibleRow = { collapsible: boolean; content: ReactNode };

type CollapsingOptions = {
  alwaysVisible?: boolean;
};

export type MaybeCollapsibleRowsRenderer = (
  rows: (MaybeCollapsibleRow | undefined | null | false)[],
  options?: CollapsingOptions
) => React.ReactNode[];

function ChevronToggle(props: {
  expanded: boolean;
  onClick: () => void;
  sticky?: boolean;
  noBorder?: boolean;
  fullyCollapsedBody?: boolean;
}) {
  const { expanded, onClick, sticky, noBorder, fullyCollapsedBody } = props;
  return (
    <div
      data-show-extra-content={String(expanded)}
      data-test-id="show-extra-content"
      className={cn({
        [styles.collapsingToggle]: true,
        [styles.collapsingToggle_sticky]: sticky,
        [styles.fullyCollapsedBody]: fullyCollapsedBody,
      })}
      style={!noBorder ? { borderBottom: "1px solid #eee" } : {}}
    >
      <button
        className={cn(styles.collapsingToggleLabel, {
          [styles.collapsingToggleLabel_expanded]: expanded,
        })}
        onClick={onClick}
        data-test-id="collapse"
      >
        <Icon icon={expanded ? ChevronUpsvgIcon : ChevronDownsvgIcon} />
      </button>
    </div>
  );
}

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

  const handleToggle = useCallback(() => {
    const next = !showMore;
    setShowMore(next);
    if (next) {
      onExpanded?.();
    } else {
      onCollapsed?.();
    }
  }, [showMore, onExpanded, onCollapsed]);

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
          <React.Fragment key="showMore">
            <ChevronToggle
              expanded={showMore}
              onClick={handleToggle}
              sticky={sticky}
              noBorder={noBorder}
              fullyCollapsedBody={
                isFullyCollapsed.current && fullyCollapsibleBody
              }
            />
          </React.Fragment>
        ),
      ];
    },
    [showMore, fullyCollapsibleBody, handleToggle, sticky, noBorder]
  );

  return {
    showMore,
    toggleExpansion: () => setShowMore(!showMore),
    expand: () => setShowMore(true),
    collapse: () => setShowMore(false),
    handleToggle,
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
  zeroHeaderPadding?: boolean;
  noBottomPadding?: boolean;
  maxHeight?: number;
  style?: CSSProperties;
  noBorder?: boolean;
  hasExtraContent?: boolean;
  scrollable?: boolean;
  defaultExpanded?: boolean;
  fullyCollapsible?: boolean;
  hasCollapsibleContent?: boolean;
  definedIndicator?: ReactNode;
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
    zeroHeaderPadding,
    noBottomPadding,
    scrollable,
    maxHeight,
    style,
    noBorder,
    // onCollapsed,
    onExtraContentCollapsed,
    onExtraContentExpanded,
    defaultExpanded,
    defaultExtraContentExpanded,
    definedIndicator,
    // dataExpandTestId,
    isHeaderActive,
    makeHeaderMenu,
    hasExtraContent,
    hasCollapsibleContent,
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
    showMore,
    handleToggle,
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
              SidebarSection__Header__ZeroHPadding: zeroHeaderPadding,
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
          <SidebarSectionContext.Provider value={{ isExpanded: showMore }}>
            <Observer>{() => <>{renderableChildren}</>}</Observer>
            {hasCollapsibleContent && (
              <ChevronToggle
                expanded={showMore}
                onClick={handleToggle}
                sticky={scrollable}
                noBorder={noBorder}
              />
            )}
          </SidebarSectionContext.Provider>
        </div>
      )}
    </div>
  );
}
