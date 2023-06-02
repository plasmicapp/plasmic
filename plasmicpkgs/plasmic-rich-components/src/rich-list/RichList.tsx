import { ActionType } from "@ant-design/pro-components";
import type { GetRowKey } from "antd/es/table/interface";
import React, { ReactNode, useRef } from "react";
import {
  BaseColumnConfig,
  deriveFieldConfigs,
  FieldfulProps,
  RowFunc,
} from "../field-mappings";
import { normalizeData, NormalizedData } from "../queries";
import { maybeRenderString, multiRenderValue } from "../formatting";
import { Card, Input, List, Tag } from "antd";
import classNames from "classnames";
import {
  ensure,
  ensureArray,
  isInteractable,
  isLikeImage,
  maybe,
  mkShortId,
} from "../utils";
import groupBy from "lodash/groupBy";
import {
  deriveKeyOfRow,
  deriveRowKey,
  renderActions,
  useSortedFilteredData,
} from "../field-react-utils";

// Avoid csv-stringify, it doesn't directly work in browser without Buffer polyfill.

export interface Action {
  type: "edit" | "view" | "delete" | "custom";
  label?: string;
  moreMenu?: boolean;
}

interface RowActionItem {
  type: "item";
  label: string;
  onClick: (rowKey: string, row: any) => void;
}

interface RowActionMenu {
  type: "menu";
  label: string;
  children?: RowActionItem[];
}

type RowAction = RowActionItem | RowActionMenu;

export interface RichListProps extends FieldfulProps<ListColumnConfig> {
  // Pass through
  size?: "default" | "large" | "small";
  header?: ReactNode;
  footer?: ReactNode;

  bordered?: boolean;
  pagination?: boolean;

  rowKey?: string | GetRowKey<any>;
  rowActions?: RowAction[];
  onRowClick?: (rowKey: string, row: any, event: React.MouseEvent) => void;

  pageSize?: number;

  hideSearch?: boolean;

  linkTo?: ListColumnConfig;
  image?: ListColumnConfig;
  title?: ListColumnConfig[];
  subtitle?: ListColumnConfig[];
  beforeTitle?: ListColumnConfig[];
  afterTitle?: ListColumnConfig[];
  content?: ListColumnConfig[];

  type?: "grid" | "list";
}

// Should really be using token colorFillTertiary instead of #8881.
const listCss = `
.plasmic-list--grid .ant-list-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.plasmic-list-search {
  /* Matches RichTable search. */
  max-width: 200px;
  margin-bottom: 8px;
}

.plasmic-list-item-content--unbordered {
  padding-left: 8px;
  padding-right: 8px;
}

.plasmic-list-item--clickable:hover {
  background-color: #8881;
}

.plasmic-list-item-image {
  max-width: 80px;
  max-height: 80px;
  aspect-ratio: 1/1;
  object-fit: cover;
  border-radius: 8px;
}

/* Unsure why needed, but cards otherwise can be much narrower. */
.plasmic-list-item-card {
  width: 100%;
}

.plasmic-list-item-card-cover {
  max-height: 300px;
  aspect-ratio: 1/1;
  object-fit: cover;
}
`;

export function RichList(props: RichListProps) {
  const {
    data: rawData = {
      data: [],
      schema: {
        id: "inferred",
        fields: [
          {
            id: "id",
            type: "string",
            readOnly: false,
          },
        ],
      },
    },
    type = "list",
    bordered = true,

    className,
    size,
    header,
    footer,

    rowActions = [],
    title,
    pageSize = 10,
    hideSearch,
    rowKey,
    pagination,
    onRowClick,
    ...rest
  } = props;

  const data = normalizeData(rawData);

  const { normalized, finalRoles: roleConfigs } = useRoleDefinitions(
    data,
    props
  );

  const actionRef = useRef<ActionType>();

  const { finalData, search, setSearch, setSortState } = useSortedFilteredData(
    data,
    normalized
  );

  const actuallyBordered = type === "list" ? bordered : false;
  return (
    <div className={className}>
      <style>{listCss}</style>
      {!hideSearch && (
        <Input.Search
          className={"plasmic-list-search"}
          onChange={(e) => setSearch(e.target.value)}
          value={search}
          placeholder={"Search"}
        />
      )}
      <List
        className={classNames({
          // We use CSS grid instead of the built-in Ant grid which can only define fixed # columns, and only at screen (and not container) breakpoints.
          "plasmic-list--grid": type === "grid",
        })}
        size={size}
        header={header}
        footer={footer}
        dataSource={finalData}
        itemLayout={"horizontal"}
        bordered={actuallyBordered}
        pagination={
          pagination
            ? {
                pageSize: pageSize,
                showSizeChanger: false,
              }
            : false
        }
        renderItem={(record, index) => {
          // Currently, actions are nested inside the list item / card, so can't have both linkTo and actions or else hydration error.
          // Eventually can fork the Ant components to make the main linkTo area and actions not nest.
          const actions = renderActions(rowActions, record, data, rowKey);
          // actions={[
          //   <SettingOutlined key="setting" />,
          //   <EditOutlined key="edit" />,
          //   <EllipsisOutlined key="ellipsis" />,
          // ]}
          const image = maybe(
            maybeRenderString(record, roleConfigs.image?.[0]),
            (src) => (
              <img
                src={src}
                className={
                  type === "list"
                    ? "plasmic-list-item-image"
                    : "plasmic-list-item-card-cover"
                }
              />
            )
          );
          const content = (
            <ListItemContent
              bordered={actuallyBordered}
              image={type === "list" ? image : undefined}
              title={multiRenderValue(record, roleConfigs.title)}
              subtitle={multiRenderValue(record, roleConfigs.subtitle)}
              beforeTitle={multiRenderValue(record, roleConfigs.beforeTitle)}
              afterTitle={multiRenderValue(record, roleConfigs.afterTitle)}
              content={multiRenderValue(record, roleConfigs.content)}
            />
          );

          function makeLinkWrapper() {
            if ((actions ?? []).length > 0) return undefined;
            const href = maybeRenderString(record, roleConfigs.linkTo?.[0]);
            if (!href && !onRowClick) return undefined;
            const _linkWrapper = (x: ReactNode) => (
              <a
                href={href}
                onClick={(event) => {
                  const key = deriveKeyOfRow(
                    record,
                    deriveRowKey(data, rowKey)
                  );
                  if (
                    key != null &&
                    !isInteractable(event.target as HTMLElement)
                  ) {
                    onRowClick?.(key, record, event);
                  }
                }}
              >
                {x}
              </a>
            );
            return _linkWrapper;
          }

          const linkWrapper = makeLinkWrapper();

          const hasLink = !!linkWrapper;

          function maybeLink(x: ReactNode) {
            return linkWrapper?.(x) ?? x;
          }

          return type === "grid" ? (
            <List.Item>
              {maybeLink(
                <Card
                  className={"plasmic-list-item-card"}
                  size={"small"}
                  cover={image}
                  hoverable={hasLink}
                  actions={actions}
                >
                  {content}
                </Card>
              )}
            </List.Item>
          ) : (
            maybeLink(
              <List.Item
                actions={actions}
                className={classNames({
                  "plasmic-list-item--clickable": hasLink,
                })}
              >
                {content}
              </List.Item>
            )
          );
        }}
      />
    </div>
  );
}

function ListItemContent({
  className,
  title,
  subtitle,
  image,
  beforeTitle,
  afterTitle,
  content,
  bordered,
  ...others
}: {
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  image?: ReactNode;
  beforeTitle?: ReactNode;
  afterTitle?: ReactNode;
  content?: ReactNode;
  bordered?: boolean;
}) {
  const prefixCls = "ant-list";
  const classString = classNames(`${prefixCls}-item-meta`, className);

  return (
    <div
      {...others}
      className={classNames(
        {
          "plasmic-list-item-content--unbordered": !bordered,
        },
        classString
      )}
    >
      {image && <div className={`${prefixCls}-item-meta-avatar`}>{image}</div>}
      <div
        className={`${prefixCls}-item-meta-content`}
        style={{ display: "flex", flexDirection: "column", gap: 4 }}
      >
        {beforeTitle && (
          <div>
            <Tag>{beforeTitle}</Tag>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {title && (
            <h4
              className={`${prefixCls}-item-meta-title`}
              style={{ margin: 0 }}
            >
              {title}
            </h4>
          )}
          {afterTitle && (
            <div className={`${prefixCls}-item-meta-description`}>
              {afterTitle}
            </div>
          )}
        </div>
        {subtitle && (
          <div className={`${prefixCls}-item-meta-description`}>{subtitle}</div>
        )}
        {content && <div>{content}</div>}
      </div>
    </div>
  );
}

interface StyleConfig {
  styles: Record<string, any>;
  align: "left" | "center" | "right";
  freeze: "off" | "left" | "right";
}

const defaultColumnConfig = (): ListColumnConfig =>
  ({
    key: mkShortId(),
    isEditableExpr: () => false,
    disableSorting: false,
    sortByExpr: undefined,
    isHidden: false,
    formatting: {
      styles: {},
      align: "left",
      freeze: "off",
    },
    dataType: "auto" as const,
    role: undefined,
  } as const);

const roles = [
  "linkTo",
  "content",
  "title",
  "subtitle",
  "beforeTitle",
  "afterTitle",
  "image",
  "unset",
] as const;

export type Role = typeof roles[number];

export type ListColumnConfig = BaseColumnConfig & {
  isEditableExpr: RowFunc<boolean>;
  disableSorting: boolean;
  sortByExpr?: RowFunc<any>;
  formatting: StyleConfig;

  /**
   * The default inferred role, not the actual user-set role.
   */
  role: undefined | Role | "unset";
};

// This component is different from Table/Details since it has various different roles, so the UX is one of setting the choices for each role rather than a single list of fields.
//
// We first infer the defaults for each role.
// This we always need to do because we want the choices to be 'stable'.
// If the user sets one of the roles, without setting the others, we don't want to shift things around on the other roles as a result.
// So the defaults need to always be there (they would only be irrelevant if all roles that would have had defaults were set/overridden by the user).
//
// Then, we layer on the user role choices.
//
// One UX wart is that unsetting a role will restore the default selection instead of clearing it.
// User must know to actually set fieldId to none or (for arrays) remove the item.
// Just another reason to fill in few roles by default.
function useRoleDefinitions(
  data: NormalizedData | undefined,
  props: React.ComponentProps<typeof RichList>
) {
  const { fields, setControlContextData, rowActions } = props;

  return React.useMemo(() => {
    const schema = data?.schema;
    const schemaMap = new Map(data?.schema?.fields.map((f) => [f.id, f]));
    if (!data || !schema) {
      return { normalized: [], roleConfigs: {}, finalRoles: {} };
    }

    function tagFieldConfigs(role: Role) {
      if (role !== "unset") {
        return ensureArray(props[role] ?? []).map((field) => {
          return {
            ...field,
            role,
          };
        });
      } else {
        return [];
      }
    }

    // This is only being computed to get the default role choices.
    const { mergedFields, minimalFullLengthFields } =
      deriveFieldConfigs<ListColumnConfig>(
        [
          ...tagFieldConfigs("image"),
          ...tagFieldConfigs("content"),
          ...tagFieldConfigs("title"),
          ...tagFieldConfigs("beforeTitle"),
          ...tagFieldConfigs("afterTitle"),
          ...tagFieldConfigs("subtitle"),
          ...tagFieldConfigs("linkTo"),
        ],
        schema,
        (field) => ({
          ...defaultColumnConfig(),
          ...(field && {
            key: field.id,
            fieldId: field.id,
            title: field.label || field.id,
            // undefined means not yet determined in this routine, not 'unset'
            role: undefined,
            expr: (currentItem) => currentItem[field.id],
          }),
        })
      );
    const normalized = mergedFields;

    // Find a good default image field.
    // Filter mergedFields where there are mostly values (in the sampleRows) that are a string that looks like a URL or path to an image file.
    // Of these, prefer the one with a name like image, picture, pic, img, avatar, profile, photo, icon.
    // Otherwise, prefer the one with a title with that substring.
    // Otherwise, pick any remaining one.
    if (
      data.data.length > 0 &&
      !mergedFields.some((field) => field.role === "image")
    ) {
      const sampleRows = Array.from(
        new Set(
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) =>
            Math.round((i / 9) * (data.data.length - 1))
          )
        )
      ).map((i) => data.data[i]);
      const imageFieldCandidates = mergedFields.filter(
        (field) =>
          !field.role &&
          sampleRows.filter(
            (row) => field.fieldId && isLikeImage(row[field.fieldId])
          ).length >=
            sampleRows.length / 2
      );
      const imageField =
        imageFieldCandidates.find((f) =>
          f.fieldId?.match(
            /^(image|picture|pic|img|avatar|profile|photo|icon)$/i
          )
        ) ??
        imageFieldCandidates.find((f) =>
          f.fieldId?.match(
            /.*(image|picture|pic|img|avatar|profile|photo|icon).*/i
          )
        ) ??
        imageFieldCandidates[0];
      if (imageField) {
        imageField.role = "image";
      }
    }

    // Find a good default title field, just based on the field name.
    if (!mergedFields.some((field) => field.role === "title")) {
      const titleField = mergedFields.find(
        (field) =>
          !field.role &&
          field.fieldId
            ?.toLowerCase()
            .match(/^(title|name|first[ _-]?name|full[ _-]?name)$/)
      );
      if (titleField) {
        titleField.role = "title";
      }
    }

    // Find a good default content field - just any remaining text field.
    if (!mergedFields.some((field) => field.role === "content")) {
      const contentField = mergedFields.find(
        (field) =>
          !field.role &&
          field.fieldId &&
          schemaMap.get(field.fieldId)?.type === "string"
      );
      if (contentField) {
        contentField.role = "content";
      }
    }

    const roleConfigs = ensure(groupBy(mergedFields, (f) => f.role));

    const finalRoles: Partial<Record<Role, ListColumnConfig[]>> = {};
    for (const role of roles) {
      if (role !== "unset") {
        finalRoles[role] = maybe(props[role], ensureArray) ?? roleConfigs[role];
      }
    }

    const fieldIdToRole = new Map(mergedFields.map((f) => [f.fieldId, f.role]));
    for (const f of minimalFullLengthFields) {
      f.role = fieldIdToRole.get(f.fieldId);
    }

    setControlContextData?.({ ...data, mergedFields, minimalFullLengthFields });

    return { normalized, roleConfigs, finalRoles };
  }, [fields, data, setControlContextData, rowActions]);
}
