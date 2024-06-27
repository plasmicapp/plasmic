import { DataPickerEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/DataPickerEditor";
import styles from "@/wab/client/components/sidebar-tabs/ComponentProps/InvalidationEditor.module.scss";
import { MultiSelectEnumPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/MultiSelectEnumPropEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { LabeledItemRow } from "@/wab/client/components/sidebar/sidebar-helpers";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import Trash2SvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Trash2Svg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, notNil } from "@/wab/shared/common";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import {
  createExprForDataPickerValue,
  extractValueSavedFromDataPicker,
} from "@/wab/shared/core/exprs";
import {
  ALL_QUERIES,
  SHOW_INVALIDATION_KEYS,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  Component,
  QueryInvalidationExpr,
  QueryRef,
} from "@/wab/shared/model/classes";
import { Menu } from "antd";
import { isString } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

export const InvalidationEditor = observer(function InvalidationKeysEditor({
  value,
  onChange,
  data,
  schema,
  disabled,
  layout = "horizontal",
  component,
}: {
  value?: QueryInvalidationExpr;
  onChange: (value: QueryInvalidationExpr) => void;
  data?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  disabled?: boolean;
  layout?: "vertical" | "horizontal";
  component?: Component | null;
}) {
  const studioCtx = useStudioCtx();
  const firstRenderRef = React.useRef(true);
  React.useLayoutEffect(() => {
    if (!firstRenderRef.current) {
      return;
    }
    firstRenderRef.current = false;
  }, []);
  const { invalidationQueries, invalidationKeys } = value ?? {
    invalidationQueries: [ALL_QUERIES.value] as (string | QueryRef)[],
    invalidationKeys: undefined,
  };
  const [showKeysEditor, setShowKeysEditor] = React.useState(
    notNil(invalidationKeys)
  );
  const [isDataPickerVisible, setIsDataPickerVisible] = React.useState(false);
  const queries = React.useMemo(() => {
    const dataQueries = studioCtx.site.components.flatMap((c) => c.dataQueries);
    return dataQueries;
  }, [studioCtx.site.components]);

  const multiSelectValues = invalidationQueries
    ? invalidationQueries.find((query) => isString(query))
      ? [ALL_QUERIES.value]
      : invalidationQueries.map((query) =>
          isString(query) ? query : query.ref.uuid
        )
    : undefined;

  return (
    <>
      <MaybeWrap
        cond={layout === "horizontal"}
        wrapper={(children) => (
          <LabeledItemRow
            className="flex-vcenter-important"
            label={"Refresh queries"}
            key={"invalidationQueries"}
          >
            {children}
          </LabeledItemRow>
        )}
      >
        <MultiSelectEnumPropEditor
          value={multiSelectValues}
          onChange={(val) => {
            if (!val) {
              onChange(
                new QueryInvalidationExpr({
                  invalidationQueries: [],
                  invalidationKeys: invalidationKeys,
                })
              );
            } else if (val.find((v) => v === SHOW_INVALIDATION_KEYS.value)) {
              setShowKeysEditor(true);
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement?.blur();
              }
            } else if (
              !invalidationQueries.find((v) => v === ALL_QUERIES.value) &&
              val.find((v) => v === ALL_QUERIES.value)
            ) {
              onChange(
                new QueryInvalidationExpr({
                  invalidationQueries: [ALL_QUERIES.value],
                  invalidationKeys: invalidationKeys,
                })
              );
            } else {
              onChange(
                new QueryInvalidationExpr({
                  invalidationQueries: val
                    .filter(
                      (v) =>
                        v !== ALL_QUERIES.value &&
                        v !== SHOW_INVALIDATION_KEYS.value
                    )
                    .map((v) => {
                      return new QueryRef({
                        ref: ensure(
                          queries.find((query) => query.uuid === v),
                          "Selection must be a query ref"
                        ),
                      });
                    }),
                  invalidationKeys: invalidationKeys,
                })
              );
            }
          }}
          options={[
            ALL_QUERIES,
            ...queries.map((query) => ({
              value: query.uuid,
              label: query.name,
            })),
            ...(showKeysEditor ? [] : [SHOW_INVALIDATION_KEYS]),
          ]}
          disabled={disabled}
        />
      </MaybeWrap>
      {showKeysEditor && (
        <LabeledItemRow
          className={
            layout === "horizontal" ? "flex-vcenter-important" : undefined
          }
          label={"Refresh query groups"}
          key={"invalidationKeys"}
          layout={layout}
          menu={
            <Menu>
              <Menu.Item
                onClick={() => {
                  onChange(
                    new QueryInvalidationExpr({
                      invalidationQueries: invalidationQueries,
                      invalidationKeys: undefined,
                    })
                  );
                  setShowKeysEditor(false);
                }}
              >
                Remove query groups
              </Menu.Item>
            </Menu>
          }
          rightExtras={
            <IconButton
              className={styles[`rightTrashIcon--${layout}`]}
              onClick={() => {
                onChange(
                  new QueryInvalidationExpr({
                    invalidationQueries: invalidationQueries,
                    invalidationKeys: undefined,
                  })
                );
                setShowKeysEditor(false);
              }}
            >
              <Icon icon={Trash2SvgIcon} />
            </IconButton>
          }
        >
          <DataPickerEditor
            viewCtx={studioCtx.focusedViewCtx()}
            value={extractValueSavedFromDataPicker(invalidationKeys, {
              projectFlags: studioCtx.projectFlags(),
              component: component ?? null,
              inStudio: true,
            })}
            onChange={(val) => {
              if (!val) {
                return;
              }
              const newExpr = createExprForDataPickerValue(val);
              onChange(
                new QueryInvalidationExpr({
                  invalidationQueries: invalidationQueries,
                  invalidationKeys: newExpr,
                })
              );
            }}
            visible={isDataPickerVisible && showKeysEditor}
            setVisible={setIsDataPickerVisible}
            expectedValues="String or List of Strings"
            data={data}
            schema={schema}
          />
        </LabeledItemRow>
      )}
    </>
  );
});
