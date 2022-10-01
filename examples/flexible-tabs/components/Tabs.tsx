import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import constate from "constate";
import React, {
  cloneElement,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface TabsProviderProps {
  children?: ReactNode;
  initialKey?: string;
  previewKey?: string;
  previewAll?: boolean;
}

const DebugContext = createContext(false);

function useTabsData({ initialKey }: { initialKey?: string }) {
  const [tabKey, setTabKey] = useState<string | undefined>(initialKey);
  const [bbox, setBbox] = useState<{ left: number; width: number } | undefined>(
    undefined
  );
  return {
    tabKey,
    bbox,
    setTabKey,
    setBbox,
  };
}

const [TabsProvider, useTabsContextUnsafe] = constate(useTabsData);

function useTabsContext() {
  const result = useTabsContextUnsafe();
  return "setTabKey" in result ? result : undefined;
}

export function TabsContainer({
  children,
  initialKey,
  previewKey,
  previewAll = false,
}: TabsProviderProps) {
  const inEditor = !!usePlasmicCanvasContext();
  return (
    <TabsProvider initialKey={initialKey}>
      <DebugContext.Provider value={inEditor && previewAll}>
        <Helper previewKey={previewKey || initialKey}>{children}</Helper>
      </DebugContext.Provider>
    </TabsProvider>
  );
}

function ensure<T>(x: T | undefined | null) {
  if (!x) {
    throw new Error("unexpected nil");
  }
  return x;
}

function Helper({
  children,
  previewKey,
}: {
  previewKey?: string;
  children?: ReactNode;
}) {
  const inEditor = usePlasmicCanvasContext();
  const { tabKey } = ensure(useTabsContext());
  const effectiveKey = inEditor ? previewKey || tabKey : tabKey;
  return (
    <DataProvider name={"currentTabKey"} data={effectiveKey}>
      {children}
    </DataProvider>
  );
}

export interface TabUnderlineProps {
  className?: string;
}

export function TabUnderline({ className }: TabUnderlineProps) {
  const { bbox } = useTabsContext() ?? { bbox: undefined };
  return bbox ? (
    <div
      className={className}
      style={{
        ...JSON.parse(JSON.stringify(bbox)),
        top: undefined,
        bottom: 0,
        position: "absolute",
        transition: ".4s ease all",
      }}
    ></div>
  ) : null;
}

export interface TabButtonProps {
  className?: string;
  children?: ReactNode;
  tabKey?: string;
}

export function TabButton({ className, children, tabKey }: TabButtonProps) {
  const tabsContext = useTabsContext();
  const ref = useRef<HTMLDivElement>(null);
  const { tabKey: activeKey, setTabKey, bbox, setBbox } = tabsContext ?? {
    tabKey: undefined,
    setTabKey: () => {},
    bbox: undefined,
    setBbox: () => {},
  };
  useEffect(() => {
    if (tabKey === activeKey) {
      setBbox({
        width: ref.current!.offsetWidth,
        left: ref.current!.offsetLeft,
      });
    }
  }, [tabsContext, JSON.stringify(bbox), tabKey === activeKey]);
  return (
    <div className={className} ref={ref}>
      {cloneElement(React.Children.toArray(children)[0] as ReactElement, {
        isActive: tabKey && activeKey && activeKey === tabKey,
        onClick: () => {
          setTabKey(tabKey);
        },
      })}
    </div>
  );
}

export interface TabContentProps {
  children?: ReactNode;
  tabKey?: string;
}

export function TabContent({ children, tabKey }: TabContentProps) {
  const tabsContext = useTabsContext();
  const previewAll = useContext(DebugContext);
  const { tabKey: activeKey } = tabsContext ?? { tabKey: undefined };
  return (
    <>
      {tabsContext === undefined || activeKey === tabKey || previewAll
        ? children
        : null}
    </>
  );
}
