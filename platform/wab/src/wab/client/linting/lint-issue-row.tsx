import ListItem from "@/wab/client/components/ListItem";
import { DataSourceOpExprSummary } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { NOT_RENDERED_ICON } from "@/wab/client/icons";
import TreeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Tree";
import UnlockIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Unlock";
import ResponsivenessIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Responsiveness";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { spawn } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import {
  InvalidDomNestingLintIssue,
  InvalidTplNestingLintIssue,
  InvisibleElementLintIssue,
  LintIssue,
  LintIssueType,
  NonCssScreenVariantOverrideLintIssue,
  UnprotectedDataQueryLintIssue,
} from "@/wab/shared/linting/lint-types";
import { Component, TplNode } from "@/wab/shared/model/classes";
import { Popover } from "antd";
import { observer } from "mobx-react";
import React, { ReactNode } from "react";
import { makeVariantName } from "@/wab/shared/Variants";
import { capitalizeFirst } from "@/wab/shared/strs";
import { isTplNamable, isTplSlot, summarizeTpl } from "@/wab/shared/core/tpls";

export function renderLintIssue(issue: LintIssue) {
  if (issue.type === "non-css-screen-variant-override") {
    return <ScreenVariantOverrideLintIssueRow issue={issue} />;
  } else if (
    issue.type === "invalid-dom-nesting" ||
    issue.type === "invalid-tpl-nesting"
  ) {
    return <InvalidDomNestingLintIssueRow issue={issue} />;
  } else if (issue.type === "invisible-element") {
    return <InvisibleElementLintIssueRow issue={issue} />;
  } else if (issue.type === "unprotected-data-query") {
    return <UnprotectedDataQuerytLintIssueRow issue={issue} />;
  } else {
    return null;
  }
}

export function getLintIssueIcon(type: LintIssueType) {
  if (type === "non-css-screen-variant-override") {
    return <Icon icon={ResponsivenessIcon} />;
  } else if (type === "invalid-dom-nesting" || type === "invalid-tpl-nesting") {
    return <Icon icon={TreeIcon} />;
  } else if (type === "invisible-element") {
    return NOT_RENDERED_ICON;
  } else if (type === "unprotected-data-query") {
    return <Icon icon={UnlockIcon} />;
  } else {
    return null;
  }
}

export function getLintIssueTypeName(type: LintIssueType) {
  if (type === "non-css-screen-variant-override") {
    return "Non-CSS overrides for responsive variants";
  } else if (type === "invalid-dom-nesting" || type === "invalid-tpl-nesting") {
    return "Invalid DOM nesting";
  } else if (type === "invisible-element") {
    return "Invisible element";
  } else if (type === "unprotected-data-query") {
    return "Unprotected data query";
  } else {
    return null;
  }
}

function renderIssueListItem(
  content: JSX.Element,
  elaboration: ReactNode = "hello"
) {
  return (
    <ListItem hideIcon style={{ paddingTop: 8, paddingBottom: 8 }}>
      <Popover
        trigger={"click"}
        content={<div style={{ maxWidth: 300 }}>{elaboration}</div>}
      >
        <div className={"text-two-lines"} style={{ whiteSpace: "normal" }}>
          {content}
        </div>
      </Popover>
    </ListItem>
  );
}

const SCREEN_VARIANT_OVERRIDE_INSTRUCTIONS = (
  <>
    <p>
      Only Design tab (CSS) overrides are allowed in responsive variants. Do not
      override text content or attributes/props in responsive variants.
    </p>
    <p>
      If you set non-CSS overrides in your responsive variant, the base variant
      will flash onto the screen first before your overrides, leading to a
      jarring and slow user experience.
    </p>
    <p>
      If you need different content or attributes/props to appear in different
      breakpoints, consider using conditional visibility.
    </p>
    <p>
      <a
        href={
          "https://docs.plasmic.app/learn/page-performance/#avoid-overriding-content-or-props-in-responsive-variants"
        }
        target={"_blank"}
      >
        Learn more in the docs
      </a>
      .
    </p>
  </>
);

const INVALID_DOM_NESTING_INSTRUCTIONS = (
  <>
    <p>
      HTML forbids certain nested elements, such as links within links, buttons
      within links, divs within paragraphs, etc.
    </p>
    <p>
      The browser will try to unnest these illegal nestings, causing the final
      page to appear broken. Avoid these nestings!
    </p>
    <p>
      <a
        href={
          "https://docs.plasmic.app/learn/development-troubleshooting/#hydration-errors"
        }
        target={"_blank"}
      >
        Learn more in the docs
      </a>
      .
    </p>
  </>
);

const INVISIBLE_ELEMENT_INSTRUCTIONS = (
  <>
    <p>It looks like this element is invisible in all variants.</p>
    <p>
      Every element that is invisible still adds to the total weight of the page
      sent down to the browser.
    </p>
  </>
);

const UnprotectedDataQueryInstructions = ({
  currentRole,
  expectedRole,
}: {
  currentRole: string;
  expectedRole: string;
}) => {
  return (
    <>
      <p>
        This data operations has a lower role than the default role set in the
        project.
      </p>
      <p>
        This may be unprotected data, change the operation minimum role from{" "}
        {currentRole} to {expectedRole} so that it matches the project auth
        settings.
      </p>
    </>
  );
};

const ScreenVariantOverrideLintIssueRow = observer(
  function ScreenVariantOverrideLintIssueRow(props: {
    issue: NonCssScreenVariantOverrideLintIssue;
  }) {
    const { issue } = props;
    const studioCtx = useStudioCtx();
    const content = (
      <>
        <TplLink component={issue.component} tpl={issue.tpl} /> overrides{" "}
        {issue.prop.type === "attr"
          ? `attribute ${issue.prop.attr}`
          : issue.prop.type === "arg"
          ? `prop ${issue.prop.param.variable.name}`
          : "text content"}{" "}
        in responsive variant{" "}
        {issue.vs.variants.length === 1 ? (
          <strong>
            {makeVariantName({
              variant: issue.vs.variants[0],
              site: studioCtx.site,
            })}
          </strong>
        ) : (
          `combination ${issue.vs.variants
            .map((v) => (
              <strong>
                {makeVariantName({ variant: v, site: studioCtx.site })}
              </strong>
            ))
            .join(", ")}`
        )}
        .
      </>
    );
    return renderIssueListItem(
      content,
      <>
        <p>{content}</p>

        {SCREEN_VARIANT_OVERRIDE_INSTRUCTIONS}
      </>
    );
  }
);

const InvalidDomNestingLintIssueRow = observer(
  function InvalidDomNestingLintIssueRow(props: {
    issue: InvalidDomNestingLintIssue | InvalidTplNestingLintIssue;
  }) {
    const { issue } = props;
    const content = (
      <>
        <TplLink component={issue.component} tpl={issue.descendantTpl} /> inside{" "}
        <TplLink
          component={
            ("ancestorComponent" in issue
              ? issue.ancestorComponent
              : undefined) ?? issue.component
          }
          tpl={issue.ancestorTpl}
        />{" "}
        may render incorrectly.
      </>
    );

    return renderIssueListItem(
      content,
      <>
        <p>{content}</p>

        {INVALID_DOM_NESTING_INSTRUCTIONS}
      </>
    );
  }
);

const InvisibleElementLintIssueRow = observer(
  function InvisibleElementLintIssueRow(props: {
    issue: InvisibleElementLintIssue;
  }) {
    const { issue } = props;
    const content = (
      <>
        <TplLink component={issue.component} tpl={issue.tpl} /> is always
        invisible.
      </>
    );
    return renderIssueListItem(
      content,
      <>
        <p>{content}</p>
        {INVISIBLE_ELEMENT_INSTRUCTIONS}
      </>
    );
  }
);

const UnprotectedDataQuerytLintIssueRow = observer(
  function UnprotectedDataQuerytLintIssueRow(props: {
    issue: UnprotectedDataQueryLintIssue;
  }) {
    const { issue } = props;
    const content = (
      <>
        {issue.tpl ? (
          <TplLink component={issue.component} tpl={issue.tpl} />
        ) : (
          <>
            <ComponentLink component={issue.component} />
            {" data queries "}
          </>
        )}{" "}
        unprotected query
        <DataSourceOpExprSummary expr={issue.expr} />
      </>
    );
    return renderIssueListItem(
      content,
      <>
        <p>{content}</p>
        <UnprotectedDataQueryInstructions
          currentRole={issue.currentRole}
          expectedRole={issue.expectedRole}
        />
      </>
    );
  }
);

const TplLink = observer(function TplLink(props: {
  component: Component;
  tpl: TplNode;
}) {
  const { component, tpl } = props;
  const studioCtx = useStudioCtx();
  return (
    <a
      onClick={() => {
        spawn(studioCtx.setStudioFocusOnTpl(component, tpl));
      }}
    >
      {isTplNamable(tpl) && tpl.name ? (
        <>
          Element <strong>{tpl.name}</strong>
        </>
      ) : isTplSlot(tpl) ? (
        <>
          Slot target <strong>{tpl.param.variable.name}</strong>
        </>
      ) : (
        <>{capitalizeFirst(summarizeTpl(tpl))} element</>
      )}
    </a>
  );
});

const ComponentLink = observer(function ComponentLink(props: {
  component: Component;
}) {
  const { component } = props;
  const studioCtx = useStudioCtx();
  return (
    <a
      onClick={() => {
        spawn(studioCtx.setStudioFocusOnTpl(component, component.tplTree));
      }}
    >
      {isPageComponent(component) ? "Page" : "Component"} {component.name}
    </a>
  );
});
