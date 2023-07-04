import React from "react";
import { BaseColumnConfig, FieldfulProps } from "../field-mappings";
import {
  NormalizedData,
  normalizeData,
  deriveFieldConfigs,
} from "@plasmicapp/data-sources";
import { Descriptions, Empty } from "antd";
import { renderValue } from "../formatting";
import { mkShortId } from "../utils";

export interface RichDetailsProps extends FieldfulProps<DetailsColumnConfig> {
  size?: "small" | "middle" | "default";
  bordered?: boolean;
  layout?: "horizontal" | "vertical";
  column?: number;
}

export function RichDetails(props: RichDetailsProps) {
  const {
    className,
    data: rawData,
    size,
    bordered,
    layout,
    column = 2,
  } = props;
  const data = normalizeData(rawData);
  const { columnDefinitions } = useColumnDefinitions(data, props);
  if (!data || !data.data?.[0]) {
    return <Empty className={className} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  const row = data.data[0];
  return (
    <Descriptions
      className={className}
      size={size}
      bordered={bordered}
      layout={layout}
      column={{
        xs: 1,
        sm: 1,
        md: column,
      }}
    >
      {columnDefinitions.map((col) => (
        <Descriptions.Item label={col.title} key={col.key} span={col.span}>
          {col.render(row)}
        </Descriptions.Item>
      ))}
    </Descriptions>
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
        const columnDefinition = {
          dataIndex: cconfig.fieldId,
          title: cconfig.title,
          key: cconfig.key,
          span: cconfig.span,

          render: (record: any) => {
            return renderValue(record, cconfig);
          },
        };

        return columnDefinition;
      });
    return { normalized, columnDefinitions };
  }, [fields, data, setControlContextData]);
}
