import { DataProvider, repeatedElement } from "@plasmicapp/host";
import { SuggestionProps } from "@tiptap/suggestion";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

type MentionListProps = SuggestionProps<any> & {
  suggestionItem: React.ReactNode;
  searchField: string;
  popupClassName: string;
  itemClassName: string;
  selectedItemClassName: string;
};

export default forwardRef(
  (
    props: MentionListProps,
    ref: React.ForwardedRef<{ onKeyDown: (e: KeyboardEvent) => boolean }>
  ) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const {
      items = [],
      suggestionItem,
      searchField,
      popupClassName,
      itemClassName,
      selectedItemClassName,
    } = props;

    const selectItem = (index: number) => {
      const item = items[index];

      if (item) {
        props.command?.({ id: item[searchField] });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items?.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    // bare minimum styles that can easily be overridden.
    const css = `
    .SuggestionsList {
        background: #eee;
        position: relative;
        border-radius: 0.5rem;

      & .item {
        display: block;
        width: 100%;

        & .is-selected {
          color: purple;
        }
      }
    }

    `;

    const hasSuggestionItemSlot = (suggestionItem as any)?.props.children;
    return (
      <div className={`SuggestionsList`}>
        <div className={popupClassName}>
          {props.items.length ? (
            props.items.map((item, index: number) => (
              <div
                role="button"
                className={`item`}
                key={index}
                onClick={() => selectItem(index)}
              >
                <DataProvider
                  key={item[searchField]}
                  name={"suggestionItem"}
                  data={item}
                >
                  <div
                    className={`${itemClassName} ${
                      index === selectedIndex ? "is-selected" : ""
                    }`}
                  >
                    <div
                      /**
                       * override styles from is-selected.
                       * Reason: The styles added by Plasmic user via the Design tab in the studio have low-proiorty selectors
                       * compared to the default styles defined above. And we do not have a choice on the selector either, so its not possible to increase its selector priority
                       * What we do here though is add a child div with the className that should be able to overWrite the default styles instead.
                       */
                      className={
                        index === selectedIndex ? selectedItemClassName : ""
                      }
                    >
                      {hasSuggestionItemSlot
                        ? repeatedElement(index === 0, suggestionItem)
                        : item[searchField]}
                    </div>
                  </div>
                </DataProvider>
              </div>
            ))
          ) : (
            <div className="item">No result</div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </div>
    );
  }
);
