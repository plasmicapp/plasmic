import {
  useDataSourceOpExprBottomModal,
  useSource,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { SidebarSection } from "@/wab/client/components/sidebar/SidebarSection";
import {
  IconLinkButton,
  PopupFocuser,
  useOnIFrameMouseDown,
} from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { PageQueryParamsTooltip } from "@/wab/client/components/widgets/DetailedTooltips";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { LabeledListItem } from "@/wab/client/components/widgets/LabeledListItem";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { UiActionsOverlay } from "@/wab/client/studio-ctx/ui/studio-ui-actions";
import { mkSectionUiId } from "@/wab/client/studio-ctx/ui/studio-ui-ids";
import { valueAsString } from "@/wab/commons/values";
import {
  ensure,
  maybe,
  maybeFirst,
  swallow,
  unexpected,
} from "@/wab/shared/common";
import {
  getSingleDynExprFromTemplatedString,
  tryCoerceString,
} from "@/wab/shared/core/exprs";
import { getDataSourceMeta } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  ensureDataSourceStandardQuery,
  extractFiltersFromDefaultDataSourceQueries,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  Component,
  ComponentDataQuery,
  isKnownObjectPath,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import {
  extractParamsFromPagePath,
  extractPathParamMetas,
  extractQueryParamMetas,
} from "@/wab/shared/utils/url-utils";
import { Input, InputRef, Menu, Popover, Tooltip } from "antd";
import { defer, isEqual, size } from "lodash";
import { observer } from "mobx-react";
import { ok } from "neverthrow";
import React from "react";

type URLParamType = "Path" | "Query" | "Fragment";

export function URLParamTooltip(props: { type: URLParamType }) {
  const { type } = props;
  const text = type === "Fragment" ? type : `${type} param`;
  return (
    <Tooltip
      title={
        type === "Query" ? (
          <>
            URL query parameters look like{" "}
            <code>
              ?search=pants&<strong>page=3</strong>
            </code>
            . They are optional, always contain text values, come after ? and
            are separated by &.
          </>
        ) : type === "Path" ? (
          <>
            Path parameters look like{" "}
            <code>
              /posts/<strong>42</strong>
            </code>{" "}
            or{" "}
            <code>
              /products/<strong>rainbow-sandals</strong>
            </code>
            . They are required, always contain text values, and must occupy a
            whole path segment in between slashes.
          </>
        ) : type === "Fragment" ? (
          <>
            A fragment looks like{" "}
            <code>
              /posts#<strong>42</strong>
            </code>
            . It is optional, always contain text values, and come after # at
            the end of the URL.
          </>
        ) : (
          unexpected()
        )
      }
    >
      {text}
    </Tooltip>
  );
}

function URLParameterRow(props: {
  type: URLParamType;
  label: string;
  value: string;
  onCommit: (value: string) => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = React.useState(props.value);
  React.useEffect(() => setDraft(props.value), [props.value]);
  const commit = () => defer(() => props.onCommit(draft));

  return (
    <LabeledListItem
      subtitle={<URLParamTooltip type={props.type} />}
      withSubtitle
      label={props.label}
      padding={"noContent"}
      menu={
        props.onRemove && (
          <Menu>
            <Menu.Item onClick={props.onRemove}>Remove URL parameter</Menu.Item>
          </Menu>
        )
      }
    >
      <Input
        className="transparent"
        placeholder={"Preview value"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            commit();
          }
        }}
      />
    </LabeledListItem>
  );
}

interface DetailsSpec {
  sourceId: string;
  tableId: string;
  pathParams: string[];
  query: ComponentDataQuery;
}

export const PageURLParametersSection = observer(
  function PageQueryPanel(props: { page: Component }) {
    const { page } = props;
    const sc = useStudioCtx();

    const pageMeta = ensure(
      page.pageMeta,
      "Page components are expected to have pageMeta"
    );

    const paramMetas = [
      ...extractPathParamMetas(pageMeta),
      ...extractQueryParamMetas(pageMeta),
    ];

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

    const queryKey = React.useMemo(
      () => `view-record-${page.uuid}`,
      [page.uuid]
    );
    const { open, close } = useDataSourceOpExprBottomModal(queryKey);

    return (
      <SidebarSection
        id="sidebar-page-url-parameters"
        title={
          <LabelWithDetailedTooltip tooltip={<PageQueryParamsTooltip />}>
            URL parameters
          </LabelWithDetailedTooltip>
        }
        controls={
          <AddQueryParamButton
            onAdd={(key) =>
              void sc.change(() => {
                pageMeta.query[key] = "value";
                return ok();
              })
            }
          >
            <IconLinkButton>
              <Icon icon={PlusIcon} />
            </IconLinkButton>
          </AddQueryParamButton>
        }
        zeroBodyPadding
        emptyBody={paramMetas.length === 0}
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
                      value: ensureDataSourceStandardQuery(
                        sourceMeta,
                        "getList"
                      )(mainDetailsSpec.sourceId, mainDetailsSpec.tableId),
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
          {paramMetas.map((param) => (
            <URLParameterRow
              key={`${param.type}-${param.key}`}
              type={param.type}
              label={param.key}
              value={param.previewValue}
              onCommit={(value) =>
                void sc.change(() => {
                  const previewValues =
                    param.type === "Path" ? pageMeta.params : pageMeta.query;
                  previewValues[param.key] = value;
                  return ok();
                })
              }
              onRemove={
                param.type === "Query"
                  ? () =>
                      void sc.change(() => {
                        delete pageMeta.query[param.key];
                        return ok();
                      })
                  : undefined
              }
            />
          ))}
        </div>
        <UiActionsOverlay uiId={mkSectionUiId("PageMetaUrlParams")} />
      </SidebarSection>
    );
  }
);

interface AddQueryParamButtonProps {
  children: React.ReactNode;
  onAdd: (key: string) => void;
}

export function AddQueryParamButton({
  children,
  onAdd,
}: AddQueryParamButtonProps) {
  const [value, setValue] = React.useState<string>("");
  const [showing, setShowing] = React.useState(false);
  const inputRef = React.useRef<InputRef>(null);
  useOnIFrameMouseDown(() => {
    setShowing(false);
  });
  return (
    <Popover
      trigger={["click"]}
      onOpenChange={(visible) => {
        setShowing(visible);
        setValue("");
      }}
      overlayClassName="ant-popover--tight"
      open={showing}
      placement={"left"}
      destroyTooltipOnHide
      content={
        <>
          <PopupFocuser targetId="url-query-param-input" targetRef={inputRef} />
          <Input
            id="url-query-param-input"
            ref={inputRef}
            value={value}
            placeholder="Enter key for new URL query param"
            bordered={false}
            autoFocus
            style={{ width: 200 }}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setShowing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAdd(value);
                setShowing(false);
              }
            }}
          />
        </>
      }
    >
      {children}
    </Popover>
  );
}
