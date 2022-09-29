import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import constate from "constate";
import React, {
  cloneElement,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export interface TabsProviderProps {
  children?: ReactNode;
  initialKey?: string;
  previewKey?: string;
}

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

const [TabsProvider, useTabsContext] = constate(useTabsData);

export function TabsContainer({
  children,
  initialKey,
  previewKey,
}: TabsProviderProps) {
  return (
    <TabsProvider initialKey={initialKey}>
      <Helper previewKey={previewKey || initialKey}>{children}</Helper>
    </TabsProvider>
  );
}

function Helper({
  children,
  previewKey,
}: {
  previewKey?: string;
  children?: ReactNode;
}) {
  const { tabKey } = useTabsContext();
  const inEditor = usePlasmicCanvasContext();
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
  const { bbox } = useTabsContext();
  console.log(bbox);
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
  const { tabKey: activeKey, setTabKey, bbox, setBbox } = useTabsContext();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tabKey === activeKey) {
      setBbox({
        width: ref.current!.offsetWidth,
        left: ref.current!.offsetLeft,
      });
    }
  }, [JSON.stringify(bbox), tabKey === activeKey]);
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
