import TextArea from "antd/lib/input/TextArea";
import { defer } from "lodash";
import React from "react";
import { useUnmount } from "react-use";
import {
  Component,
  isKnownComponent,
  isKnownPageHref,
  PageHref,
} from "../../../../classes";
import { BetterAutoComplete } from "../../../../commons/components/inputs/BetterAutoComplete";
import { isPageComponent } from "../../../../components";
import { codeLit, isPageHref } from "../../../../exprs";
import PageIcon from "../../../plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { useUndo } from "../../../shortcuts/studio/useUndo";
import { useStudioCtx } from "../../../studio-ctx/StudioCtx";
import { Matcher } from "../../view-common";
import { Icon } from "../../widgets/Icon";

export function HrefEditor(props: {
  onChange: (value: PageHref | string) => void;
  value: PageHref | string;
  disabled: boolean;
  "data-plasmic-prop"?: string;
}) {
  const sc = useStudioCtx();

  const {
    value: draft,
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
    if (draft !== undefined) {
      submitVal(draft);
      reset(draft);
    } else {
      reset();
    }
  };
  useUnmount(() => {
    // Same behavior of `useUnmount` in `StringPropEditor`.
    defer(submitDraft);
  });

  const hrefStr = (page: Component) =>
    `${page.name} - ${page.pageMeta?.path || ""}`;

  // Autocomplete settings
  const matcher = new Matcher(draft || "", { matchMiddleOfWord: true });
  const query = async (
    _qry: string,
    _cursorPosition?: number,
    _limit?: number
  ): Promise<Array<Component | string>> => {
    const first: Array<Component | string> = curValue ? [curValue] : [];
    return first.concat(
      sc.site.components
        .filter((c) => isPageComponent(c))
        .filter((c) => matcher.matches(hrefStr(c)))
    );
  };
  const render = (item: Component | string) =>
    isKnownComponent(item) ? (
      <span>
        <Icon icon={PageIcon} className="component-fg" />{" "}
        {matcher.boldSnippets(hrefStr(item))}
      </span>
    ) : (
      <code>{item}</code>
    );
  const onSelect = (v: { item: Component | string }) => {
    if (isKnownComponent(v.item)) {
      const defaultParams = Object.fromEntries(
        Object.entries(v.item.pageMeta?.params ?? {}).map(([k, str]) => [
          k,
          codeLit(""),
        ])
      );
      submitVal(new PageHref({ page: v.item, params: defaultParams }));
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
        <BetterAutoComplete
          className="property-editor form-control"
          onSelect={onSelect}
          openOnClick={true}
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
