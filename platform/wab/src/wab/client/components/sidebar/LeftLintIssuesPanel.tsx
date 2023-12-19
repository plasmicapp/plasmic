import { Component, isKnownComponent } from "@/wab/classes";
import { useAppRoles } from "@/wab/client/components/app-auth/app-auth-contexts";
import { Matcher } from "@/wab/client/components/view-common";
import Button from "@/wab/client/components/widgets/Button";
import Checkbox from "@/wab/client/components/widgets/Checkbox";
import Textbox from "@/wab/client/components/widgets/Textbox";
import { getInvalidDomNesting } from "@/wab/client/lint-invalid-nesting-dom";
import {
  getLintIssueIcon,
  getLintIssueTypeName,
  renderLintIssue,
} from "@/wab/client/linting/lint-issue-row";
import {
  DefaultLeftLintIssuesPanelProps,
  PlasmicLeftLintIssuesPanel,
} from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftLintIssuesPanel";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { maybe, xGroupBy } from "@/wab/common";
import {
  getComponentDisplayName,
  getPageOrComponentLabel,
} from "@/wab/components";
import { DEVFLAGS } from "@/wab/devflags";
import { LintIssue, LintIssueType } from "@/wab/shared/linting/lint-types";
import { lintSite as lintUnprotectedDataQueries } from "@/wab/shared/linting/lint-unprotected-data-queries";
import { lintSite } from "@/wab/shared/linting/lint-utils";
import { DownOutlined, SmileOutlined } from "@ant-design/icons";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Empty, notification, Popover, Space } from "antd";
import { groupBy } from "lodash";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { useState } from "react";
import { ItemOrGroup, VirtualGroupedList } from "./VirtualGroupedList";

export type LeftLintIssuesPanelProps = DefaultLeftLintIssuesPanelProps;

function LeftLintIssuesPanel_(
  props: LeftLintIssuesPanelProps,
  ref: HTMLElementRefOf<"div">
) {
  return (
    <PlasmicLeftLintIssuesPanel
      root={{ ref }}
      {...props}
      description={{ wrap: () => null }}
      content={DEVFLAGS.linting ? <SiteIssuesList /> : null}
    />
  );
}

/** Duplicate labels will be consolidated into the same checkbox for controlling all associated types. */
const issueTypeToLabel: { [key in LintIssueType]: string } = {
  "suboptimal-varianted-visibility": "Suboptimal varianted visibility",
  "non-css-screen-variant-override": "Non-CSS overrides in responsive variants",
  "invalid-dom-nesting": "Invalid nesting",
  "invalid-tpl-nesting": "Invalid nesting",
  "invisible-element": "Always-invisible elements",
  "unprotected-data-query": "Unprotected data queries",
};

const hiddenIssueTypes: LintIssueType[] = ["suboptimal-varianted-visibility"];

const issueLabelToTypes: { [key: string]: LintIssueType[] } =
  Object.fromEntries(
    Object.entries(
      groupBy(
        (Object.entries(issueTypeToLabel) as [LintIssueType, string][]).filter(
          ([type, label]) => !hiddenIssueTypes.includes(type)
        ),
        ([type, label]) => label
      )
    ).map(([label, issues]) => [label, issues.map(([type, _label]) => type)])
  );

const LeftLintIssuesPanel = React.forwardRef(LeftLintIssuesPanel_);
export default LeftLintIssuesPanel;

const SiteIssuesList = observer(function SiteIssuesList() {
  const studioCtx = useStudioCtx();
  const site = studioCtx.site;

  const { roles: appRoles } = useAppRoles(
    studioCtx.appCtx,
    studioCtx.siteInfo.id
  );

  const siteIssues = lintSite(site);
  const [domIssues, setDomIssues] = React.useState<LintIssue[]>([]);
  const unprotectedDataQueriesIssues = lintUnprotectedDataQueries(
    site,
    appRoles
  );

  const [filter, setFilter] = React.useState<string>("");
  const matcher = new Matcher(filter);

  const [disabledTypes, setDisabledTypes] = useState<{
    [key in LintIssueType]?: boolean;
  }>({});

  const unfilteredIssues = [
    ...siteIssues,
    ...domIssues,
    ...unprotectedDataQueriesIssues,
  ];

  const filteredIssues = unfilteredIssues.filter(
    (t) =>
      (matcher.matches(t.type) || matcher.matches(t.component.name)) &&
      !disabledTypes[t.type]
  );

  const issuesByComponent = xGroupBy(
    filteredIssues,
    (issue) => issue.component
  );

  const items: ItemOrGroup<Component | LintIssueType, LintIssue>[] = Array.from(
    issuesByComponent.entries()
  ).map(([component, issues]) => ({
    type: "group" as const,
    group: component,
    key: component.uuid,
    items: Array.from(xGroupBy(issues, (i) => i.type).entries()).flatMap(
      ([type, typeIssues]) =>
        typeIssues.map((issue) => ({
          type: "item" as const,
          item: issue,
          key: issue.key,
        }))
    ),
  }));

  return (
    <>
      <div className="p-sm flex">
        <Button
          className="fill-width"
          onClick={() => {
            const viewCtx = studioCtx.focusedOrFirstViewCtx();
            if (!viewCtx) {
              return;
            }

            const invalidDomNesting = getInvalidDomNesting(viewCtx);
            notification.info({
              message: "Finished deep inspection",
              description: `Found ${
                invalidDomNesting.length || "no"
              } DOM nesting issues. ${
                invalidDomNesting.length > 0
                  ? "These are merged into the main list of issues."
                  : ""
              }`,
            });
            setDomIssues(invalidDomNesting);
          }}
        >
          Deep inspect current{" "}
          {maybe(
            studioCtx.focusedOrFirstViewCtx()?.component,
            getPageOrComponentLabel
          )}
        </Button>
      </div>
      {unfilteredIssues.length > 0 ? (
        <>
          <div className="p-sm flex flex-align-baseline gap-m">
            <Textbox
              placeholder={"Search issues..."}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
              }}
            />
            <Popover
              trigger={"click"}
              content={
                <div className={"flex flex-col gap-sm"}>
                  {Object.entries(issueLabelToTypes).map(
                    ([label, issueTypes]) => (
                      <Checkbox
                        onChange={(checked) =>
                          setDisabledTypes({
                            ...disabledTypes,
                            ...Object.fromEntries(
                              issueTypes.map((issueType) => [
                                issueType,
                                !checked,
                              ])
                            ),
                          })
                        }
                        isChecked={!disabledTypes[issueTypes[0]]}
                      >
                        {label}
                      </Checkbox>
                    )
                  )}
                </div>
              }
            >
              <a
                className={"flex-no-shrink"}
                onClick={(e) => e.preventDefault()}
              >
                <Space>
                  Types
                  <DownOutlined />
                </Space>
              </a>
            </Popover>
          </div>
          <VirtualGroupedList
            items={items}
            itemHeight={48}
            renderItem={(issue) => renderLintIssue(issue)}
            headerHeight={50}
            renderGroupHeader={(group) => {
              if (isKnownComponent(group)) {
                return (
                  <div style={{ color: "black" }}>
                    {getComponentDisplayName(group)}
                  </div>
                );
              } else {
                return (
                  <div>
                    {getLintIssueIcon(group)} {getLintIssueTypeName(group)}
                  </div>
                );
              }
            }}
          />
        </>
      ) : (
        <Empty
          className={"mt-xxlg"}
          image={<SmileOutlined style={{ fontSize: 20 }} />}
          imageStyle={{ height: "20px" }}
          description={"No issues!"}
        ></Empty>
      )}
    </>
  );
});
