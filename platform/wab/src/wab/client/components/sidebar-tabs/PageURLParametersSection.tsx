import {
  Component,
  ComponentDataQuery,
  isKnownObjectPath,
  isKnownTemplatedString,
} from "@/wab/classes";
import {
  useDataSourceOpExprBottomModal,
  useSource,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  IconLinkButton,
  useOnIFrameMouseDown,
} from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { PageQueryParamsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabeledListItem } from "@/wab/client/components/widgets/LabeledListItem";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, maybe, maybeFirst, swallow, unexpected } from "@/wab/common";
import { valueAsString } from "@/wab/commons/values";
import { extractParamsFromPagePath } from "@/wab/components";
import {
  getSingleDynExprFromTemplatedString,
  tryCoerceString,
} from "@/wab/exprs";
import { getDataSourceMeta } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  ensureDataSourceStandardQuery,
  extractFiltersFromDefaultDataSourceQueries,
} from "@/wab/shared/data-sources-meta/data-sources";
import { Input, InputRef, Menu, Popover, Tooltip } from "antd";
import { isEqual, size } from "lodash";
import { observer } from "mobx-react";
import React, { useMemo, useState } from "react";

const URLParameterRow = observer(
  (props: {
    type: "Path" | "URL Query";
    label: string;
    value: string;
    onChange: (key: string, value: string) => void;
    onDelete: (key: string) => void;
  }) => {
    const [value, setValue] = useState(props.value);

    const pushCurrentValueUp = React.useCallback(
      () => requestAnimationFrame(() => props.onChange(props.label, value)),
      [props.label, props.onChange, value]
    );

    const handleKeyUp = (e) => {
      if (e.keyCode === 13 /* RETURN | ENTER */) {
        pushCurrentValueUp();
      }
    };

    const handleChange = (e) => {
      const newValue = e.target.value;
      setValue(newValue);
    };

    const handleDeletionRequest = () => props.onDelete(props.label);

    React.useEffect(() => {
      setValue(props.value);
    }, [props.value]);

    return (
      <LabeledListItem
        data-test-id="page-param-name"
        subtitle={
          <Tooltip
            title={
              props.type === "URL Query" ? (
                <>
                  URL query parameters look like{" "}
                  <code>
                    ?search=pants&<strong>page=3</strong>
                  </code>
                  . They are optional, always contain text values, come after ?
                  and are separated by &.
                </>
              ) : props.type === "Path" ? (
                <>
                  Path parameters look like{" "}
                  <code>
                    /posts/<strong>42</strong>
                  </code>{" "}
                  or{" "}
                  <code>
                    /products/<strong>rainbow-sandals</strong>
                  </code>
                  . They are required, always contain text values, and must
                  occupy a whole path segment in between slashes.
                </>
              ) : (
                unexpected()
              )
            }
          >
            {props.type} param
          </Tooltip>
        }
        withSubtitle
        label={props.label}
        padding={"noContent"}
        menu={
          <Menu>
            <Menu.Item onClick={handleDeletionRequest}>
              Remove URL parameter
            </Menu.Item>
          </Menu>
        }
      >
        <Input
          className="transparent"
          onChange={handleChange}
          onBlur={pushCurrentValueUp}
          onKeyUp={handleKeyUp}
          value={value}
        />
      </LabeledListItem>
    );
  }
);

interface DetailsSpec {
  sourceId: string;
  tableId: string;
  pathParams: string[];
  query: ComponentDataQuery;
}

const PageURLParametersSection = observer(function PageQueryPanel(props: {
  page: Component;
}) {
  const { page } = props;
  const sc = useStudioCtx();

  const pageMeta = ensure(
    page.pageMeta,
    "Page components are expected to have pageMeta"
  );

  const pathParams = extractParamsFromPagePath(pageMeta.path);
  const urlSearchParams = Object.keys(pageMeta.query);
  const hasAnyParam = pathParams.length + urlSearchParams.length > 0;

  const onAdd = async (key: string) => {
    await sc.change(({ success }) => {
      pageMeta.query[key] = "REPLACEME";
      return success();
    });
  };

  const handleValueChange = React.useCallback(
    (source: { [key: string]: string }) => (key: string, newValue: string) => {
      void sc.change(({ success }) => {
        source[key] = newValue;
        return success();
      });
    },
    []
  );

  const handleParamDeletion = React.useCallback(
    (source: { [key: string]: string }) => (key: string) => {
      void sc.change(({ success }) => {
        delete source[key];
        return success();
      });
    },
    []
  );

  const handlePathParamValueChange = useMemo(
    () => handleValueChange(pageMeta.params),
    []
  );
  const handleSearchParamValueChange = React.useMemo(
    () => handleValueChange(pageMeta.query),
    []
  );
  const handlePathParamDeletion = React.useMemo(
    () => handleParamDeletion(pageMeta.params),
    []
  );
  const handleSearchParamDeletion = React.useMemo(
    () => handleParamDeletion(pageMeta.query),
    []
  );

  const [showPicker, setShowPicker] = useState(false);

  const mainDetailsSpec: DetailsSpec | undefined = maybeFirst(
    page.dataQueries.flatMap((query) => {
      const params = extractParamsFromPagePath(pageMeta.path);
      if (
        !(
          query.op &&
          ["getMany", "getList"].includes(query.op.opName) &&
          params.length > 0 &&
          query.op.templates.filters
        )
      ) {
        return [];
      }

      const filtersValue = query.op.templates.filters.value;
      const filtersBindings = query.op.templates.filters.bindings;
      const tableId = maybe(
        tryCoerceString(query.op.templates.resource.value),
        JSON.parse
      );
      if (
        !(
          tableId &&
          filtersBindings &&
          filtersValue &&
          size(filtersBindings) === size(params)
        )
      ) {
        return [];
      }
      const filters = extractFiltersFromDefaultDataSourceQueries(query.op);
      if (!filters) {
        return [];
      }
      const bindingKeys: string[] = [];
      for (const pathParam of params) {
        const pathParamBinding = Object.keys(filtersBindings).find(
          (bindingKey) => {
            const binding = filtersBindings[bindingKey];
            const dynExpr = swallow(() =>
              isKnownObjectPath(binding)
                ? binding
                : isKnownTemplatedString(binding)
                ? getSingleDynExprFromTemplatedString(binding)
                : undefined
            );
            return (
              dynExpr &&
              isKnownObjectPath(dynExpr) &&
              isEqual(dynExpr.path, ["$ctx", "params", pathParam])
            );
          }
        );
        if (!pathParamBinding || filters[pathParam] !== pathParamBinding) {
          return [];
        }
        bindingKeys.push(pathParamBinding);
      }

      return {
        sourceId: query.op.sourceId,
        tableId,
        pathParams: params,
        query,
      };
    })
  );

  const { data: source } = useSource(sc, mainDetailsSpec?.sourceId);
  const sourceMeta = React.useMemo(
    () => (source ? getDataSourceMeta(source.source) : undefined),
    [source]
  );

  const queryKey = React.useMemo(() => `view-record-${page.uuid}`, [page.uuid]);
  const { open, close } = useDataSourceOpExprBottomModal(queryKey);

  return (
    <SidebarSection
      id="sidebar-page-url-parameters"
      title={
        <LabelWithDetailedTooltip tooltip={<PageQueryParamsTooltip />}>
          URL parameters
        </LabelWithDetailedTooltip>
      }
      controls={<AddQueryParamButton onAdd={onAdd} />}
      zeroBodyPadding
      emptyBody={!hasAnyParam}
      isHeaderActive={true}
    >
      <div className="vlist-gap-m">
        {mainDetailsSpec && source && sourceMeta && (
          <>
            <SidebarSection noBorder noBottomPadding>
              <Button
                className="fill-width"
                onClick={() => {
                  open({
                    title: "View different record",
                    value: ensureDataSourceStandardQuery(sourceMeta, "getList")(
                      mainDetailsSpec.sourceId,
                      mainDetailsSpec.tableId
                    ),
                    onSave: () => {},
                    onCancel: () => close(),
                    isRowSelector: true,
                    onRowSelected: async (row) => {
                      await sc.changeUnsafe(() => {
                        for (const p of mainDetailsSpec.pathParams) {
                          // Make sure to convert these to strings, since query params are always strings.
                          pageMeta.params[p] = valueAsString(row[p]);
                        }
                      });
                      close();
                    },
                    livePreview: true,
                    selectedRowKey: mainDetailsSpec.pathParams
                      .map((p) => pageMeta.params[p])
                      .join("#"),
                    rowKey: mainDetailsSpec.pathParams,
                    exprCtx: {
                      projectFlags: sc.projectFlags(),
                      component: page,
                      inStudio: true,
                    },
                  });
                }}
              >
                View different record
              </Button>
            </SidebarSection>
          </>
        )}
        {pathParams.map((key) => (
          <URLParameterRow
            key={`path-${key}`}
            type={"Path"}
            label={key}
            value={pageMeta.params[key]}
            onChange={handlePathParamValueChange}
            onDelete={handlePathParamDeletion}
          />
        ))}
        {urlSearchParams.map((key) => (
          <URLParameterRow
            key={`search-${key}`}
            type={"URL Query"}
            label={key}
            value={pageMeta.query[key]}
            onChange={handleSearchParamValueChange}
            onDelete={handleSearchParamDeletion}
          />
        ))}
      </div>
    </SidebarSection>
  );
});

function AddQueryParamButton(props: { onAdd: (key: string) => void }) {
  const { onAdd } = props;
  const [value, setValue] = React.useState<string>("");
  const [showing, setShowing] = React.useState(false);
  const inputRef = React.useRef<InputRef>(null);
  useOnIFrameMouseDown(() => {
    setShowing(false);
  });
  return (
    <Popover
      trigger={["click"]}
      onVisibleChange={(visible) => {
        setShowing(visible);
        setValue("");
        if (visible) {
          inputRef.current?.focus();
        }
      }}
      overlayClassName="ant-popover--tight"
      visible={showing}
      placement={"left"}
      destroyTooltipOnHide
      content={
        <Input
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setValue(e.target.value);
          }}
          onBlur={() => setShowing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd(value);
              setShowing(false);
            }
          }}
          style={{
            width: 200,
          }}
          autoFocus
          bordered={false}
          ref={inputRef}
          placeholder="Enter key for new URL query param"
          value={value}
        />
      }
    >
      <IconLinkButton>
        <Icon icon={PlusIcon} />
      </IconLinkButton>
    </Popover>
  );
}

export default PageURLParametersSection;
