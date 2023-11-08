import { Input, InputNumber, Select, Switch } from "antd";
import * as React from "react";
import { Link } from "react-router-dom";
import "./ComponentConfigurer.css";
import { ComponentItem } from "./ComponentGallery";

type ParamType = "string" | "select" | "multi" | "num" | "bool";

export interface ComponentMeta {
  id: string;
  name: string;
  params: Param[];
}

interface Param {
  name: string;
  type: ParamType;
  enums?: string[];
}

export function ComponentConfigurer(props: {
  Component: React.ComponentType;
  meta: ComponentMeta;
  components: ComponentItem[];
}) {
  const { Component, meta, components } = props;
  const [componentProps, setComponentProps] = React.useState({});
  const index = components.findIndex((c) => c.Component === Component);
  return (
    <div className="configurer">
      <div className="component-canvas">
        <Component {...componentProps} />
      </div>
      <div className="params-panel">
        <div className="params-panel__header">{meta.name}</div>
        <div className="params-panel__body">
          {meta.params.map((param) => (
            <div className="param-row">
              <label
                className="param-label"
                id={`config-${param.name}`}
                style={{ marginRight: 10 }}
              >
                {param.name}
              </label>
              <ParamConfigurer
                param={param}
                onChange={(val) => {
                  setComponentProps({ ...componentProps, [param.name]: val });
                }}
              />
            </div>
          ))}
        </div>
        <div className="params-panel__footer">
          <div className="component-link-container" style={{ marginRight: 10 }}>
            <RelComponentLink
              index={index}
              components={components}
              dir="prev"
            />
          </div>
          <div
            className="component-link-container"
            style={{ marginLeft: "auto" }}
          >
            <RelComponentLink
              index={index}
              components={components}
              dir="next"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RelComponentLink(props: {
  components: ComponentItem[];
  index: number;
  dir: "prev" | "next";
}) {
  const { components, index, dir } = props;
  const target =
    dir === "prev"
      ? components[index === 0 ? components.length - 1 : index - 1]
      : components[index === components.length - 1 ? 0 : index + 1];
  return (
    <Link to={`/${target.meta.id}`}>
      {dir === "prev" ? "◄ " : ""}
      {target.meta.name}
      {dir === "next" ? " ►" : ""}
    </Link>
  );
}

function ParamConfigurer(props: {
  param: Param;
  onChange: (val: any) => void;
}) {
  const { param, onChange } = props;
  const commonProps = {
    className: "param-input",
    "aria-labelledby": `config-${param.name}`,
  } as const;
  if (param.type === "string") {
    return (
      <Input
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : e.target.value)
        }
        {...commonProps}
      />
    );
  } else if (param.type === "multi") {
    return (
      <Select
        mode={"multiple"}
        onChange={(value) => onChange(value)}
        {...commonProps}
      >
        {param.enums!.map((option) => (
          <Select.Option value={option} key={option}>
            {option}
          </Select.Option>
        ))}
      </Select>
    );
  } else if (param.type === "select") {
    return (
      <Select
        onChange={(value) => onChange(value === "" ? undefined : value)}
        {...commonProps}
      >
        <Select.Option value="">(unset)</Select.Option>
        {param.enums!.map((option) => (
          <Select.Option value={option} key={option}>
            {option}
          </Select.Option>
        ))}
      </Select>
    );
  } else if (param.type === "num") {
    return <InputNumber onChange={(e) => onChange(e)} {...commonProps} />;
  } else if (param.type === "bool") {
    return <Switch onChange={(e) => onChange(e)} {...commonProps} />;
  } else {
    return null;
  }
}
