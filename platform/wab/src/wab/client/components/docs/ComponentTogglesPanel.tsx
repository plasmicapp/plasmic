import { CodeSnippet } from "@/wab/client/components/coding/CodeDisplay";
import { useDocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { DocsTooltip } from "@/wab/client/components/docs/DocsTooltip";
import ElementProp from "@/wab/client/components/docs/ElementProp";
import LinkedProp from "@/wab/client/components/docs/LinkedProp";
import SlotProp from "@/wab/client/components/docs/SlotProp";
import VariantProp from "@/wab/client/components/docs/VariantProp";
import { SidebarModalProvider } from "@/wab/client/components/sidebar/SidebarModal";
import { PlasmicComponentTogglesPanel } from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicComponentTogglesPanel";
import { getTplSlots } from "@/wab/shared/SlotUtils";
import { makeNodeNamer } from "@/wab/shared/codegen/react-p";
import {
  getExportedComponentName,
  makePlasmicComponentName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { ensure } from "@/wab/shared/common";
import {
  TplNamable,
  flattenTplsWithoutThrowawayNodes,
  isTplTagOrComponent,
} from "@/wab/shared/core/tpls";
import { Component } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import * as React from "react";
import { useLocalStorage } from "react-use";

interface ComponentTogglesPanelProps {}

const ComponentTogglesPanel = observer(function ComponentTogglesPanel(
  props: ComponentTogglesPanelProps
) {
  const docsCtx = useDocsPortalCtx();
  const component = docsCtx.tryGetFocusedComponent();

  const [dismissed, setDismissed] = useLocalStorage(
    "ComponentTogglesPanel--dismissComponentInfo",
    false
  );

  if (!component) {
    return null;
  }

  const variantGroups = component.variantGroups.filter(
    (vg) => vg.variants.length > 0
  );

  const slots = getTplSlots(component);

  const otherProps = component.params.filter(
    (p) =>
      !slots.some((s) => s.param === p) &&
      !component.variantGroups.some((g) => g.param === p)
  );

  const nodeNamer = makeNodeNamer(component);
  const namedNodes = flattenTplsWithoutThrowawayNodes(component).filter(
    (n) => !!nodeNamer(n) && isTplTagOrComponent(n)
  );

  return (
    <SidebarModalProvider>
      <PlasmicComponentTogglesPanel
        explanation={{
          defaultExpanded: !dismissed,
          children: (isExpanded) =>
            docsCtx.useLoader() ? (
              <CmsComponentMessage
                component={component}
                isExpanded={isExpanded}
              />
            ) : (
              <BlackboxComponentMessage
                component={component}
                isExpanded={isExpanded}
              />
            ),

          onToggle: (expanded) => {
            if (!expanded && !dismissed) {
              setDismissed(true);
            }
          },
        }}
        header={
          docsCtx.useLoader()
            ? getExportedComponentName(component)
            : makePlasmicComponentName(component)
        }
        variantsHeader={
          variantGroups.length === 0
            ? { render: () => null }
            : {
                wrapChildren: (content) => (
                  <>
                    {content}
                    <VariantPropsTooltip />
                  </>
                ),
              }
        }
        variantPropsContainer={{
          ...(variantGroups.length === 0 && { render: () => null }),
        }}
        variantProps={variantGroups.map((group) => (
          <VariantProp key={group.uid} docsCtx={docsCtx} group={group} />
        ))}
        slotPropsHeader={
          slots.length === 0
            ? { render: () => null }
            : {
                wrapChildren: (content) => (
                  <>
                    {content}
                    <SlotPropsTooltip />
                  </>
                ),
              }
        }
        slotPropsContainer={{
          ...(slots.length === 0 && { render: () => null }),
        }}
        slotProps={slots.map((slot) => (
          <SlotProp key={slot.uid} docsCtx={docsCtx} slot={slot} />
        ))}
        linkedPropsHeader={{
          ...(otherProps.length === 0 && { render: () => null }),
        }}
        linkedPropsContainer={{
          ...(otherProps.length === 0 && { render: () => null }),
        }}
        linkedProps={otherProps.map((prop) => (
          <LinkedProp key={prop.uid} docsCtx={docsCtx} param={prop} />
        ))}
        elementPropsHeader={
          namedNodes.length === 0
            ? { render: () => null }
            : {
                wrapChildren: (content) => (
                  <>
                    {content}
                    <ElementPropsTooltip />
                  </>
                ),
              }
        }
        elementPropsContainer={{
          ...(namedNodes.length === 0 && { render: () => null }),
        }}
        elementProps={namedNodes.map((node) => (
          <ElementProp
            key={node.uuid}
            docsCtx={docsCtx}
            node={node as TplNamable}
            name={ensure(nodeNamer(node))}
            isRoot={node === component.tplTree}
          />
        ))}
        resetButton={{
          onClick: () => docsCtx.resetComponentToggles(component),
        }}
      />
    </SidebarModalProvider>
  );
});

export default ComponentTogglesPanel;

const CmsComponentMessage = observer(function CmsComponentMessage(props: {
  component: Component;
  isExpanded: boolean;
}) {
  const componentName = getExportedComponentName(props.component);
  if (!props.isExpanded) {
    return (
      <span>
        To render <strong>{componentName}</strong> with PlasmicComponent
      </span>
    );
  }
  return (
    <div>
      To render{" "}
      <strong>
        <code>{componentName}</code>
      </strong>{" "}
      with PlasmicComponent, simply pass it as the "component" prop.
    </div>
  );
});
const BlackboxComponentMessage = observer(
  function BlackboxComponentMessage(props: {
    component: Component;
    isExpanded: boolean;
  }) {
    const { component, isExpanded } = props;
    const firstSentence = (
      <>
        For{" "}
        <strong>
          <code>{getExportedComponentName(component)}</code>
        </strong>
        , Plasmic generates two React components:
      </>
    );

    if (!isExpanded) {
      return <span>{firstSentence}</span>;
    } else {
      return (
        <div className={"vlist-gap-sm"}>
          <p>{firstSentence}</p>
          <ul className="disc-list">
            <li>
              <strong>
                <code>{makePlasmicComponentName(component)}</code>
              </strong>
              : a purely presentational component, for rendering the design.
              Will be updated by Plasmic when design changes.
            </li>
            <li>
              <strong>
                <code>{getExportedComponentName(component)}</code>
              </strong>
              : a wrapper component, owned by you, where you instantiate{" "}
              <code>{makePlasmicComponentName(component)}</code> and attach
              state, data, and behavior.
            </li>
          </ul>
          <p>
            Try the different props and overrides you can pass to{" "}
            <code>{getExportedComponentName(component)}</code> component below.{" "}
            <a
              href="https://www.plasmic.app/learn/codegen-guide/"
              target="_blank"
            >
              See details
            </a>
            .
          </p>
        </div>
      );
    }
  }
);

function VariantPropsTooltip() {
  return (
    <DocsTooltip>
      Each variant is exposed as a React prop. For toggle variants, pass a
      boolean; for single-choice variants, pass an option string; for
      multi-choice variants, pass an array of options or an object mapping
      option to <code>true</code> or <code>false</code>.{" "}
      <a
        href="https://www.plasmic.app/learn/codegen-guide/#variant-props"
        target="_blank"
      >
        Learn more.
      </a>
    </DocsTooltip>
  );
}

function SlotPropsTooltip() {
  return (
    <DocsTooltip>
      Each slot is exposed as a React prop; pass in any{" "}
      <code>React.ReactNode</code> to customize the content of each slot.{" "}
      <a
        href="https://www.plasmic.app/learn/codegen-guide/#slot-props"
        target="_blank"
      >
        Learn more.
      </a>
    </DocsTooltip>
  );
}

function ElementPropsTooltip() {
  return (
    <DocsTooltip placement="right" maxWidth={400}>
      {() => (
        <>
          Each element with a name in Plasmic can be customized with these
          element override props. You can attach event handlers, modify content
          or attributes, add wrappers, or completely replace an element with
          something else. Some examples below:
          <CodeSnippet language="typescript" className="mt-m">
            {`
element={{
  // Override the element type
  as: "button",

  // Attach event handlers (or add any prop)
  props: {
    onClick: () => ...
  },

  // Wrap with an element
  wrap: content => <Tooltip>{content}</Tooltip>,

  // Insert a child at the end
  wrapChildren: children => (
    <>{children}<InfoPopup /></>
  )
}}

// Completely replace with something else
element={{
  render: (ps) => <Link to="..." {...ps} />
}}

// Don't render at all
element={{
  render: () => null
}}
            `.trim()}
          </CodeSnippet>
          <a
            href="https://www.plasmic.app/learn/codegen-guide/#override-props"
            target="_blank"
          >
            Learn more.
          </a>
        </>
      )}
    </DocsTooltip>
  );
}
