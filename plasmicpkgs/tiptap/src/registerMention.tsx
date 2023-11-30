import {
  DataProvider,
  repeatedElement,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import TiptapMention, { MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import React, { useEffect, useMemo, useRef } from "react";
import tippy, { GetReferenceClientRect, Instance, Props } from "tippy.js";
import MentionList from "./components/MentionList";
import { useTiptapContext } from "./contexts";
import { TIPTAP_COMPONENT_NAME } from "./registerTiptap";
import { Registerable, registerComponentHelper } from "./utils";

export type QueryResult = {
  data?: { response: any[] };
  error?: Error;
  isLoading?: boolean;
};

export type MentionProps = Omit<MentionOptions, "HTMLAttributes"> & {
  className: string;
  dataStatic?: any[];
  hasDataDynamic?: boolean;
  dataDynamic?: QueryResult;
  suggestionItem: React.ReactNode;
  searchField?: string;
  popupClassName?: string;
  itemClassName?: string;
  selectedItemClassName?: string;
  mentionClassName?: string;
  maxSuggestionCount?: number;
};

export function Mention(props: MentionProps) {
  const {
    dataStatic = [],
    dataDynamic,
    hasDataDynamic,
    suggestionItem,
    searchField = "id",
    popupClassName,
    itemClassName,
    selectedItemClassName,
    mentionClassName,
    maxSuggestionCount = 5,
  } = props;

  /**
   * Although refs should be sparingly used, we need all these refs here due to the way tiptap works:
   *
   * It needs to be passed the async function that returns the suggestion items, when the extension is initialized (ie. in the .configure() call). Whenever there is a need for new suggestions, the same async callback is called. Without refs, that callback would always use stale data. That is why we absolutely need these here.
   */
  const dataDynamicRef = useRef(dataDynamic);
  const hasDataDynamicRef = useRef(hasDataDynamic);
  const maxSuggestionCountRef = useRef(maxSuggestionCount);
  dataDynamicRef.current = dataDynamic;
  hasDataDynamicRef.current = hasDataDynamic;
  maxSuggestionCountRef.current = maxSuggestionCount;

  const { setMention } = useTiptapContext();
  useEffect(() => {
    setMention(
      TiptapMention.configure({
        HTMLAttributes: {
          class: mentionClassName,
        },
        renderLabel: ({ options, node }) => {
          return `${options.suggestion.char}${node.attrs.id}`;
        },
        suggestion: {
          /**
           * This function below only does static filtering. It can't give query parameters to the Plasmic query for filtering at the server side to avoid some complexities.
           *
           * Before we move on to the issues, lets first explain how it could have supported server-side filtering via query params:
           * - The user creates a plasmic query to fetch the suggestions. These suggestions are filtered by some query parameter. The value of the query parameter is bound to the currentMention state.
           *
           * - When the user types `@abc` for example, the following async function `items` is triggered. It knows the query and returns the new set of suggestions. The returned array is rendered in the suggestions popup
           *
           * Issues:
           * 1. Stale Query issue:
           * The same async function is responsible for setting the currentMention state, and also return the new suggestion results. We can't await the Plasmic query after it is triggered by the currentMention state change. So query results it has are stale.
           *
           * Solution: We poll the Plasmic query's isLoading field (indefinitely)
           *
           * For simplicity, therefore, we are just supporting static filtering for now, and may consider the approach highlighted above for filtering via query params.
           *
           * 2. The async function is provided at the time of extension initialization. That async function only knows the state/props in its render cycle, so these props are outdated at the time the async function is triggered.
           *
           * We can't put all of them in the useEffect dependencies array, because change in any of them will cause the Mention extension to be removed/re-added, resulting in a flicker on every keystroke + lost input focus (which causes the suggestion popup to never show)
           *
           * Solution: Use refs
           *
           * @param param0
           * @returns
           */
          items: ({ query }: { query: string }) => {
            if (!query) return [];

            if (!hasDataDynamicRef.current) {
              // for static data, just filter the static array and return results
              const res =
                dataStatic
                  ?.filter((item) =>
                    item[searchField]
                      .toLowerCase?.()
                      ?.includes(query.toLowerCase())
                  )
                  .slice(0, maxSuggestionCountRef.current) || [];
              return res;
            }

            if (!dataDynamicRef.current) return [];

            if (dataDynamicRef.current?.isLoading === false) {
              const data = dataDynamicRef.current.data?.response;
              if (!Array.isArray(data)) return [];
              return (
                data
                  ?.filter((item) =>
                    item[searchField]
                      .toLowerCase?.()
                      ?.includes(query.toLowerCase())
                  )
                  .slice(0, maxSuggestionCountRef.current) || []
              );
            }

            return [];
          },
          render: () => {
            let component: ReactRenderer<
              { onKeyDown: (e: KeyboardEvent) => boolean },
              typeof MentionList
            >;
            let popup: Instance<Props>[];
            const otherProps = {
              suggestionItem,
              searchField,
              popupClassName,
              itemClassName,
              selectedItemClassName,
            };

            return {
              // eslint-disable-next-line no-shadow
              onStart: (props) => {
                component = new ReactRenderer<any, any>(MentionList, {
                  props: {
                    ...props,
                    ...otherProps,
                  },
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy("body", {
                  getReferenceClientRect:
                    props.clientRect as GetReferenceClientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },

              // eslint-disable-next-line no-shadow
              onUpdate(props) {
                component.updateProps({
                  ...props,
                  ...otherProps,
                });

                if (!props.clientRect) {
                  return;
                }

                popup?.[0]?.setProps({
                  getReferenceClientRect:
                    props.clientRect as GetReferenceClientRect,
                });
              },

              // eslint-disable-next-line no-shadow
              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();

                  return true;
                }

                return component.ref?.onKeyDown(props.event) || false;
              },

              onExit() {
                popup?.[0]?.destroy();
                component.destroy();
              },
            };
          },
        },
      })
    );
    return () => {
      setMention(undefined);
    };
    // add only those dependencies that are OK to trigger a flicker in the tiptap editor, while it re-initializes. ie. changes that are one-time (or not frequent / not per keystroke)
  }, [
    searchField,
    mentionClassName,
    popupClassName,
    itemClassName,
    selectedItemClassName,
  ]);

  const inCanvas = !!usePlasmicCanvasContext();

  const providerData = useMemo(() => {
    const noData = [{ [searchField]: "No data" }];
    let data = inCanvas ? noData : [];
    if (!hasDataDynamic) {
      if (dataStatic?.length && Array.isArray(dataStatic)) {
        data = [...dataStatic];
      }
      return data;
    }

    if (!dataDynamic || dataDynamic.isLoading) return noData;
    data = dataDynamic.data?.response ?? noData;
    if (!Array.isArray(data)) return noData;
    return data.slice(0, maxSuggestionCount);
  }, [
    dataDynamic,
    searchField,
    hasDataDynamic,
    maxSuggestionCount,
    dataStatic,
  ]);

  return (
    <div
      style={{
        // ...(showSuggestionItem ? {} : { display: "none" }),
        ...{
          // bare minimum styles (that need not be overridden)
          // We just want to make the dataProvider data available to the MentionList component (<DataProvider> is needed to be returned from the returned JSX). It should not be shown in the UI, hence the display: none
          display: "none",
          position: "absolute",
          top: 0,
          background: "white",
        },
      }}
    >
      {providerData?.slice(0, maxSuggestionCount).map((item, index) => (
        // Data provider needs to be in the returned JSX (the actual use of the "suggestionItem" data is in the MentionList component.)
        <DataProvider key={item.id} name={"suggestionItem"} data={item}>
          {repeatedElement(index === 0, suggestionItem) ?? item[searchField]}
        </DataProvider>
      ))}
    </div>
  );
  // return null;
}
Mention.displayName = "Mention";

export function registerMention(loader?: Registerable) {
  registerComponentHelper(loader, Mention, {
    name: `${TIPTAP_COMPONENT_NAME}-extension-mention`,
    displayName: "Tiptap Mention",
    providesData: true,
    props: {
      dataDynamic: {
        type: "dataSourceOpData" as any,
        description: "Filtered suggestions",
        disableDynamicValue: true, // we don't want the users to temper with the Plasmic's default query type.
        hidden: (ps) => !ps.hasDataDynamic,
      },
      searchField: {
        type: "string",
        defaultValueHint: "id",
      },
      maxSuggestionCount: {
        type: "number",
        defaultValueHint: 5,
        description:
          "Limits the number of suggestions that appear in the suggestions popup",
      },
      dataStatic: {
        type: "array",
        hidden: (ps) => Boolean(ps.hasDataDynamic),
        itemType: {
          type: "object",
          nameFunc: (item) => item.label,
          fields: {
            id: "string",
            label: "string",
          },
        },
        defaultValue: [
          {
            id: "thomasEd1",
            label: "Thomas Edison",
          },
          {
            id: "sherlock221b",
            label: "Sherlock Holmes",
          },
          {
            id: "eliot_thomas",
            label: "T.S Eliot",
          },
          {
            id: "shakespeare74",
            label: "William Shakespeare",
          },
        ],
      },
      hasDataDynamic: {
        type: "boolean",
      },
      mentionClassName: {
        type: "class",
        displayName: "Mention label",
      },
      popupClassName: {
        type: "class",
        displayName: "Suggestion Popup",
      },
      itemClassName: {
        type: "class",
        displayName: "Suggestion Item",
      },
      selectedItemClassName: {
        type: "class",
        displayName: "Selected Item",
      },
      suggestionItem: {
        type: "slot",
      },
      currentMention: {
        type: "string",
        hidden: () => true,
      },
    },
    importName: "Mention",
    importPath: "@plasmicpkgs/tiptap/skinny/registerMention",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
