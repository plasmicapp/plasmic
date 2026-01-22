import { DataProvider, usePlasmicCanvasContext } from '@plasmicapp/host';
import { CodeComponentMeta } from '@plasmicapp/host/registerComponent';
import constate from 'constate';
import React, {
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const noop = () => {
  // noop
};

function defaultButtonChildren(label: string) {
  return {
    type: 'default-component',
    kind: 'button',
    props: {
      children: {
        type: 'text',
        value: label,
      },
    },
  } as const;
}
export interface TabsProviderProps {
  children?: ReactNode;
  initialKey?: string;
  previewKey?: string;
  previewAll?: boolean;
}

const DebugContext = createContext(false);

export type MountMode = 'mountOneAtATime' | 'mountAllEagerly' | 'mountLazily';

function useTabsData({
  initialKey,
  previewKey,
  mountMode = 'mountOneAtATime',
}: {
  initialKey?: string;
  previewKey?: string;
  mountMode?: MountMode;
}) {
  const [tabKey, setTabKey] = useState<string | undefined>(initialKey);
  const [bbox, setBbox] = useState<{ left: number; width: number } | undefined>(
    undefined
  );
  const inEditor = usePlasmicCanvasContext();
  return {
    tabKey: inEditor ? previewKey || tabKey : tabKey,
    bbox,
    setTabKey,
    setBbox,
    mountMode,
  };
}

const [TabsProvider, useTabsContextUnsafe] = constate(useTabsData);

function useTabsContext() {
  const result = useTabsContextUnsafe();
  return 'setTabKey' in result ? result : undefined;
}
const modulePath = '@plasmicpkgs/plasmic-tabs';

export const TabsContainerMeta: CodeComponentMeta<TabsProviderProps> = {
  name: 'hostless-tabs-container',
  displayName: 'Tabs Container',
  importName: 'TabsContainer',
  styleSections: false,
  importPath: modulePath,
  providesData: true,
  description:
    'Create bespoke/advanced tab-like UIs. [See example project](https://docs.plasmic.app/learn/tabs-components/)',
  defaultStyles: {
    width: 'stretch',
    padding: '8px',
  },
  props: {
    initialKey: {
      type: 'string',
      description: 'Key of the initially selected tab',
      defaultValue: 'tab1',
    },
    previewKey: {
      type: 'string',
      description: 'Show this key while editing in Plasmic Studio',
    },
    previewAll: {
      type: 'boolean',
      description: 'Reveal all tab contents while editing in Plasmic Studio',
    },
    mountMode: {
      advanced: true,
      description: 'How to render/mount tab content.',
      type: 'choice',
      options: [
        {
          label: 'Mount one at a time, unmount on hide',
          value: 'mountOneAtATime',
        },
        {
          label: 'Mount all up-front, do not unmount',
          value: 'mountAllEagerly',
        },
        {
          label: 'Mount on-demand/lazily, do not unmount',
          value: 'mountLazily',
        },
      ],
      defaultValueHint: 'mountOneAtATime',
    },
    children: {
      type: 'slot',
      defaultValue: {
        type: 'vbox',
        children: [
          {
            type: 'hbox',
            children: [
              {
                type: 'component',
                name: 'hostless-tab-button',
                props: {
                  tabKey: 'tab1',
                  children: defaultButtonChildren('Tab 1'),
                },
              },
              {
                type: 'component',
                name: 'hostless-tab-button',
                props: {
                  tabKey: 'tab2',
                  children: defaultButtonChildren('Tab 2'),
                },
              },
              {
                type: 'component',
                name: 'hostless-tab-underline',
              },
            ],
          },
          {
            type: 'vbox',
            children: [
              {
                type: 'component',
                name: 'hostless-tab-content',
                props: {
                  tabKey: 'tab1',
                  children: [
                    {
                      type: 'vbox',
                      children: ['Some content for tab 1'],
                    },
                  ],
                },
              },
              {
                type: 'component',
                name: 'hostless-tab-content',
                props: {
                  tabKey: 'tab2',
                  children: [
                    {
                      type: 'vbox',
                      children: ['Some content for tab 2'],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  },
};

export function TabsContainer({
  children,
  initialKey,
  previewKey,
  previewAll = false,
}: TabsProviderProps) {
  const inEditor = !!usePlasmicCanvasContext();
  return (
    <TabsProvider initialKey={initialKey} previewKey={previewKey}>
      <DebugContext.Provider value={inEditor && previewAll}>
        <Helper previewKey={previewKey || initialKey}>{children}</Helper>
      </DebugContext.Provider>
    </TabsProvider>
  );
}

function ensure<T>(x: T | undefined | null) {
  if (!x) {
    throw new Error('unexpected nil');
  }
  return x;
}

function Helper({
  children,
}: // previewKey,
{
  previewKey?: string;
  children?: ReactNode;
}) {
  const { tabKey } = ensure(useTabsContext());
  return (
    <DataProvider name={'currentTabKey'} data={tabKey}>
      {children}
    </DataProvider>
  );
}

export interface TabUnderlineProps {
  className?: string;
}

export const TabUnderlineMeta: CodeComponentMeta<TabUnderlineProps> = {
  name: 'hostless-tab-underline',
  displayName: 'Tab Underline',
  importName: 'TabUnderline',
  importPath: modulePath,
  props: {},
  defaultStyles: {
    background: '#7777ff',
    height: '2px',
  },
};

export function TabUnderline({ className }: TabUnderlineProps) {
  const { bbox } = useTabsContext() ?? { bbox: undefined };
  return bbox ? (
    <div
      className={className}
      style={{
        ...JSON.parse(JSON.stringify(bbox)),
        top: undefined,
        bottom: 0,
        position: 'absolute',
        transition: '.4s ease all',
      }}
    ></div>
  ) : null;
}

export interface TabButtonProps {
  className?: string;
  children?: ReactNode;
  tabKey?: string;
}

export const TabButtonMeta: CodeComponentMeta<TabButtonProps> = {
  name: 'hostless-tab-button',
  isAttachment: true,
  displayName: 'Tab Button',
  importName: 'TabButton',
  importPath: modulePath,
  props: {
    tabKey: {
      type: 'string',
      description: 'The answer value selecting this choice sets',
    },
    children: {
      type: 'slot',
      defaultValue: defaultButtonChildren('Some tab'),
    },
  },
  defaultStyles: {
    width: 'hug',
  },
};

export function TabButton({ className, children, tabKey }: TabButtonProps) {
  const tabsContext = useTabsContext();
  const ref = useRef<HTMLDivElement>(null);
  const {
    tabKey: activeKey,
    setTabKey,
    bbox,
    setBbox,
  } = tabsContext ?? {
    tabKey: undefined,
    setTabKey: noop,
    bbox: undefined,
    setBbox: noop,
  };
  useEffect(() => {
    if (tabKey === activeKey) {
      setBbox({
        width: ref.current!.offsetWidth,
        left: ref.current!.offsetLeft,
      });
    }
  }, [ref.current, setBbox, JSON.stringify(bbox), tabKey, activeKey]);
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
  className?: string;
}

export const TabContentMeta: CodeComponentMeta<TabContentProps> = {
  name: 'hostless-tab-content',
  isAttachment: true,
  displayName: 'Tab Content',
  importName: 'TabContent',
  importPath: modulePath,
  props: {
    tabKey: {
      type: 'string',
      description: 'The answer value selecting this choice sets',
    },
    children: {
      type: 'slot',
      defaultValue: {
        type: 'vbox',
        children: {
          type: 'text',
          value: 'This is some tab content',
        },
      },
    },
  },
};

export function TabContent({
  children,
  className,
  tabKey,
}: TabContentProps): ReactElement {
  const tabsContext = useTabsContext();
  const previewAll = useContext(DebugContext);
  const { tabKey: activeKey, mountMode } = tabsContext ?? {
    tabKey: undefined,
    mountMode: 'mountOneAtATime',
  };
  const show = tabsContext === undefined || activeKey === tabKey || previewAll;
  const [everMounted, setEverMounted] = useState(false);
  useEffect(() => {
    if (show) {
      setEverMounted(true);
    }
  }, [show]);
  const divContent = (
    <div className={className} style={show ? {} : { display: 'none' }}>
      {children}
    </div>
  );
  switch (mountMode) {
    case 'mountOneAtATime':
      return <>{show ? divContent : null}</>;
    case 'mountAllEagerly':
      return divContent;
    case 'mountLazily':
      return <>{everMounted && divContent}</>;
  }
  throw new Error(`Unexpected mount mode ${mountMode}`);
}
