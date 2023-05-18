import {
  ProDescriptions,
  ProDescriptionsItemProps,
} from "@ant-design/pro-components";
import React from "react";
import {
  BaseColumnConfig,
  FieldfulProps,
  deriveFieldConfigs,
  deriveValueType,
  mkShortId,
  renderValue,
} from "../field-mappings";
import { NormalizedData, normalizeData } from "../queries";
import { Empty } from "antd";

export interface RichDetailsProps extends FieldfulProps<DetailsColumnConfig> {
  size?: "small" | "middle" | "default";
  bordered?: boolean;
  layout?: "horizontal" | "vertical";
}

export function RichDetails(props: RichDetailsProps) {
  const { className, data: rawData, size, bordered, layout } = props;
  const data = normalizeData(rawData);
  const { columnDefinitions } = useColumnDefinitions(data, props);
  if (!data) {
    return <Empty className={className} />;
  }
  return (
    <ProDescriptions
      className={className}
      dataSource={data?.data?.[0]}
      columns={columnDefinitions}
      size={size}
      bordered={bordered}
      layout={layout}
    />
  );
}

export type DetailsColumnConfig = BaseColumnConfig & {
  span?: number;
};

function useColumnDefinitions(
  data: NormalizedData | undefined,
  props: React.ComponentProps<typeof RichDetails>
) {
  const { fields, setControlContextData } = props;
  return React.useMemo(() => {
    const schema = data?.schema;
    if (!data || !schema) {
      return { normalized: [], columnDefinitions: [] };
    }
    const { mergedFields, minimalFullLengthFields } =
      deriveFieldConfigs<DetailsColumnConfig>(
        fields ?? [],
        schema,
        (field) => ({
          key: mkShortId(),
          isHidden: false,
          dataType: "auto" as const,
          ...(field && {
            key: field.id,
            fieldId: field.id,
            title: field.label || field.id,
            expr: (currentItem) => currentItem[field.id],
          }),
        })
      );
    setControlContextData?.({ ...data, mergedFields, minimalFullLengthFields });
    const normalized = mergedFields;
    const columnDefinitions = normalized
      .filter((cconfig) => !cconfig.isHidden)
      .map((cconfig, _columnIndex, _columnsArray) => {
        const columnDefinition: ProDescriptionsItemProps<any> = {
          dataIndex: cconfig.fieldId,
          title: cconfig.title,
          key: cconfig.key,
          valueType: deriveValueType(cconfig),
          span: cconfig.span,

          // To come later
          copyable: false,
          ellipsis: false,
          tip: undefined,
          formItemProps: {
            rules: [],
          },
          valueEnum: undefined,
          renderFormItem: (_, { defaultRender }) => {
            return defaultRender(_);
          },

          render: (value: any, record: any, rowIndex: any) => {
            return renderValue(value, record, cconfig);
          },
        };

        return columnDefinition;
      });
    return { normalized, columnDefinitions };
  }, [fields, data, setControlContextData]);
}
