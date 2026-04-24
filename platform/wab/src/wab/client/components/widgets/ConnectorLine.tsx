import classNames from "classnames";
import React from "react";

export function ConnectorLine(props: {
  isLast?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={classNames("with-connector-line", props.className)}>
      <div className="property-connector-line-icon" />
      {!props.isLast && <div className="property-connector-vertical-line" />}
      {props.children}
    </div>
  );
}
