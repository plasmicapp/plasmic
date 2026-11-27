import { FormattedTime } from "@/wab/client/components/time/FormattedTime";
import {
  formatDateShortTimeShort,
  toInstant,
} from "@/wab/shared/utils/date-utils";
import Descriptions from "antd/lib/descriptions";
import React from "react";

export function smartRender(value: any) {
  if (value === null) {
    return <pre className="m0">null</pre>;
  } else if (value === undefined) {
    return <pre className="m0">undefined</pre>;
  } else if (typeof value === "boolean") {
    return <pre className="m0">{value}</pre>;
  }

  if (typeof value === "string" || value instanceof Date) {
    try {
      const instant = toInstant(value);
      return (
        <pre className="m0">
          <FormattedTime value={instant} format={formatDateShortTimeShort} />
        </pre>
      );
    } catch {}
  } else if (typeof value === "object") {
    return <pre className="m0">{JSON.stringify(value, null, 2)}</pre>;
  }

  return "" + value;
}

export interface AutoInfoProps {
  info: object;
}

export function AutoInfo({ info }: AutoInfoProps) {
  return (
    <Descriptions>
      {Object.entries(info)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {smartRender(value)}
          </Descriptions.Item>
        ))}
    </Descriptions>
  );
}
