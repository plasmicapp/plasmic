import { Alert, Popover } from "antd";
import { TooltipPlacement } from "antd/lib/tooltip";
import L from "lodash";
import React from "react";
import { useLocalStorage } from "react-use";
import InfoIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Info";
import { Icon } from "../widgets/Icon";

export function DocsTooltip(props: {
  children: React.ReactNode | (() => React.ReactNode);
  placement?: TooltipPlacement;
  maxWidth?: number;
}) {
  const { children, placement, maxWidth } = props;
  const content = () => (
    <div style={{ maxWidth: maxWidth ?? 300 }}>
      {L.isFunction(children) ? children() : children}
    </div>
  );
  return (
    <Popover content={content} placement={placement ?? "rightTop"}>
      <Icon icon={InfoIcon} className="ml-ch dimdimfg" />
    </Popover>
  );
}

export function useDocsTooltip(opts: {
  key: string;
  content: React.ReactNode | (() => React.ReactNode);
  tooltipContent?: React.ReactNode | (() => React.ReactNode);
  tooltipPlacement?: TooltipPlacement;
  tooltipMaxWidth?: number;
}) {
  const {
    key,
    content,
    tooltipMaxWidth,
    tooltipPlacement,
    tooltipContent,
  } = opts;
  const [dismissed, setDismissed] = useLocalStorage(key, false);

  return {
    alert: dismissed ? null : (
      <Alert
        type="info"
        closable
        afterClose={() => setDismissed(true)}
        className="m-m"
        message={L.isFunction(content) ? content() : content}
      />
    ),
    info:
      dismissed || tooltipContent ? (
        <DocsTooltip placement={tooltipPlacement} maxWidth={tooltipMaxWidth}>
          {tooltipContent ?? content}
        </DocsTooltip>
      ) : null,
  };
}
