import { displayTokenValue } from "@/wab/client/components/sidebar-tabs/DataBinding/data-token-suggestions";
import { useSuggestDataTokens } from "@/wab/client/components/sidebar-tabs/DataBinding/useSuggestDataTokens";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon, SvgIcon } from "@/wab/client/components/widgets/Icon";
import { DataTokenIcon } from "@/wab/client/icons";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DataTokenRef } from "@/wab/commons/DataToken";
import { BetterAutoComplete } from "@/wab/commons/components/inputs/BetterAutoComplete";
import { isPageComponent } from "@/wab/shared/core/components";
import { codeLit, isPageHref } from "@/wab/shared/core/exprs";
import {
  Component,
  PageHref,
  isKnownComponent,
  isKnownPageHref,
} from "@/wab/shared/model/classes";
import { extractPathParamMetas } from "@/wab/shared/utils/url-utils";
import TextArea from "antd/lib/input/TextArea";
import { defer } from "lodash";
import React from "react";
import { useUnmount } from "react-use";

type HrefItem = Component | string | DataTokenRef;

function isDataTokenRef(item: HrefItem): item is DataTokenRef {
  return typeof item === "object" && "token" in item;
}

function ItemRow(props: {
  icon: SvgIcon;
  name: string;
  value?: string;
  matcher: Matcher;
}) {
  const { icon, name, value, matcher } = props;
  return (
    <span className="flex flex-vcenter gap-sm fill-width">
      <Icon icon={icon} className="dimfg" />
      <span className="nowrap overflow-hidden" style={{ flexShrink: 100 }}>
        {matcher.boldSnippets(name)}
      </span>
      {value && (
        <span className="dimfg text-ellipsis flex-push-right">
          {matcher.boldSnippets(value)}
        </span>
      )}
    </span>
  );
}

export function HrefEditor(props: {
  onChange: (value: PageHref | string) => void;
  value: PageHref | string;
  disabled: boolean;
  "data-plasmic-prop"?: string;
}) {
  const sc = useStudioCtx();
  const { suggestDataTokens, onSelectDataToken } =
    useSuggestDataTokens("string");

  const {
    value: draft,
    isDirty,
    push: setDraft,
    handleKeyDown,
    reset,
  } = useUndo(isPageHref(props.value) ? undefined : props.value);
  // Whenever the passed in props.value changes, we reset the state
  React.useEffect(() => {
    reset();
  }, [props.value]);
  const curValue =
    draft === undefined && !isPageHref(props.value) ? props.value : draft;

  const submitVal = (val: string | PageHref) => {
    if (val !== props.value) {
      props.onChange(val);
      reset(isPageHref(val) ? undefined : val);
    } else {
      reset();
    }
  };
  const submitDraft = () => {
    if (isDirty && draft !== undefined) {
      submitVal(draft);
      reset(draft);
    } else {
      reset();
    }
  };
  // Picking a token unmounts this editor; the draft must not clobber it.
  const pickedTokenRef = React.useRef(false);
  useUnmount(() => {
    if (pickedTokenRef.current) {
      return;
    }
    // Same behavior of `useUnmount` in `StringPropEditor`.
    defer(submitDraft);
  });

  const hrefStr = (page: Component) =>
    `${page.name} - ${page.pageMeta?.path || ""}`;

  // Autocomplete settings
  const searchText = draft || "";
  const matcher = new Matcher(searchText, { matchMiddleOfWord: true });
  const query = async (
    _qry: string,
    _cursorPosition?: number,
    _limit?: number
  ): Promise<HrefItem[]> => {
    const first: HrefItem[] = curValue ? [curValue] : [];
    const pages = sc.site.components
      .filter((c) => isPageComponent(c))
      .filter((c) => matcher.matches(hrefStr(c)));
    const tokens = suggestDataTokens?.(searchText) ?? [];
    return [...first, ...pages, ...tokens];
  };
  const render = (item: HrefItem) =>
    isKnownComponent(item) ? (
      <ItemRow
        icon={PageIcon}
        name={item.name}
        value={item.pageMeta?.path || undefined}
        matcher={matcher}
      />
    ) : isDataTokenRef(item) ? (
      <ItemRow
        icon={DataTokenIcon}
        name={item.token.name}
        value={displayTokenValue(item.token.value)}
        matcher={matcher}
      />
    ) : (
      <code>{item}</code>
    );
  const onSelect = (v: { item: HrefItem }) => {
    if (isDataTokenRef(v.item)) {
      pickedTokenRef.current = true;
      onSelectDataToken?.(v.item);
    } else if (isKnownComponent(v.item)) {
      const defaultParams = Object.fromEntries(
        v.item.pageMeta
          ? extractPathParamMetas(v.item.pageMeta).map((param) => [
              param.key,
              codeLit(param.previewValue),
            ])
          : []
      );
      submitVal(
        new PageHref({
          page: v.item,
          params: defaultParams,
          query: {},
          fragment: null,
          encode: true,
        })
      );
    } else {
      submitVal(v.item);
    }
  };

  return (
    <div className={"baseline-friendly-centered-block-container"}>
      <div className="flex flex-vcenter gap-m fill-width">
        {!curValue && isPageHref(props.value) && (
          <Icon icon={PageIcon} className="component-fg" />
        )}
        <BetterAutoComplete<HrefItem>
          className="property-editor form-control"
          onSelect={onSelect}
          openOnClick={true}
          itemToString={(item) =>
            item == null
              ? ""
              : isKnownComponent(item)
              ? `${item.uid}`
              : isDataTokenRef(item)
              ? item.token.uuid
              : `${item}`
          }
          source={{
            query,
            render,
          }}
        >
          <TextArea
            className={`text-left ${
              !isPageHref(props.value) || curValue ? "code" : "fg-placeholder"
            }`}
            disabled={props.disabled}
            value={`${curValue || ""}`}
            placeholder={
              isKnownPageHref(props.value)
                ? hrefStr(props.value.page)
                : "Enter value"
            }
            autoSize={{ minRows: 1, maxRows: 6 }}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              setDraft(e.currentTarget.value);
            }}
            onBlur={submitDraft}
            data-plasmic-prop={props["data-plasmic-prop"]}
          />
        </BetterAutoComplete>
      </div>
    </div>
  );
}
