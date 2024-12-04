import { DocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { DocsPortalEditor } from "@/wab/client/components/docs/DocsPortalEditor";
import { DocsPreviewCanvas } from "@/wab/client/components/docs/DocsPreviewCanvas";
import {
  depsForComponent,
  serializeComponent,
} from "@/wab/client/components/docs/serialize-docs-preview";
import {
  DefaultCodePreviewSnippetProps,
  PlasmicCodePreviewSnippet,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicCodePreviewSnippet";
import { getExportedComponentName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { ensure, mkUuid } from "@/wab/shared/common";
import { isSubComponent } from "@/wab/shared/core/components";
import { Component, Site } from "@/wab/shared/model/classes";
import {
  PlumeDocsExample,
  getPlumeDocsPlugin,
} from "@/wab/shared/plume/plume-registry";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as Prettier from "prettier";
import parserTypescript from "prettier/parser-typescript";
import * as React from "react";

function mkDeps(site: Site, component: Component): Record<string, Component> {
  const deps: Record<string, Component> = {};
  for (const comp of depsForComponent(site, component)) {
    if (comp?.plumeInfo) {
      deps[ensure(comp.plumeInfo).type] = comp;
    }
  }
  return deps;
}

function mkInstances(
  component: Component,
  deps: Record<string, Component>,
  example: PlumeDocsExample,
  useLoader: boolean
): Record<string, string> {
  if (!example.instances) {
    return {};
  }

  const instances: Record<string, string> = {};
  for (const [key, instance] of Object.entries(example.instances)) {
    const comp = instance.plumeType
      ? ensure(
          deps[instance.plumeType],
          `Instance in example has unknown dep "${instance.plumeType}"`
        )
      : component;

    let forceName: string | undefined;
    if (isSubComponent(comp) && instance.plumeType) {
      const superComp = ensure(comp.superComp);
      const superPlugin = getPlumeDocsPlugin(superComp);
      if (superPlugin?.subs?.[instance.plumeType]) {
        forceName = `${getExportedComponentName(superComp)}.${
          superPlugin.subs[instance.plumeType]
        }`;
      }
    }

    instances[key] = serializeComponent(
      comp,
      instance.props,
      useLoader,
      true,
      forceName
    );
  }

  return instances;
}

export class CodePreviewCtx {
  uuid: string;
  private code = observable.box<string>("");

  constructor(
    site: Site,
    component: Component,
    example: PlumeDocsExample,
    useLoader: boolean
  ) {
    this.uuid = mkUuid();

    const deps = mkDeps(site, component);
    const instances = mkInstances(component, deps, example, useLoader);

    let initialCode = `
      export default function App() {
        ${example.code}
      }
    `;

    // eslint-disable-next-line no-useless-escape
    while (initialCode.match(/<Instance[^ \/]* ?\/>/)) {
      initialCode = initialCode.replace(
        // eslint-disable-next-line no-useless-escape
        /<Instance([^ \/]*) ?\/>/g,
        (_, key) => instances[key]
      );
    }

    this.code.set(
      Prettier.format(initialCode, {
        parser: "typescript",
        plugins: [parserTypescript],
      }).trim()
    );
  }

  getCode() {
    return this.code.get();
  }

  setCode(code: string) {
    this.code.set(code);
  }
}

interface CodePreviewSnippetProps extends DefaultCodePreviewSnippetProps {
  component: Component;
  docsCtx: DocsPortalCtx;
  example: PlumeDocsExample;
}

const CodePreviewSnippet = observer(function CodePreviewSnippet(
  props: CodePreviewSnippetProps
) {
  const { component, docsCtx, example, ...rest } = props;
  const codePreviewCtx = new CodePreviewCtx(
    docsCtx.studioCtx.site,
    component,
    example,
    docsCtx.useLoader()
  );

  return (
    <PlasmicCodePreviewSnippet
      title={example.title}
      info={example.info || ""}
      viewport={
        <DocsPreviewCanvas docsCtx={docsCtx} codePreviewCtx={codePreviewCtx} />
      }
      editor={
        <DocsPortalEditor docsCtx={docsCtx} codePreviewCtx={codePreviewCtx} />
      }
      {...rest}
    />
  );
});

export default CodePreviewSnippet;
