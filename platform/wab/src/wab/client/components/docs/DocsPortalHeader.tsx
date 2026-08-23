import { PublicLink } from "@/wab/client/components/PublicLink";
import { useDocsPortalCtx } from "@/wab/client/components/docs/DocsPortalCtx";
import { showTemporaryInfo } from "@/wab/client/components/quick-modals";
import Select from "@/wab/client/components/widgets/Select";
import {
  DefaultDocsPortalHeaderProps,
  PlasmicDocsPortalHeader,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicDocsPortalHeader";
import { useHistory } from "@/wab/client/route/HistoryProvider";
import { asOne } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { Observer } from "mobx-react";
import * as React from "react";

type DocsPortalHeaderProps = DefaultDocsPortalHeaderProps;

const CodegenTypes = [
  <Select.Option value="loader" key="loader">
    Loader
  </Select.Option>,
  <Select.Option value="codegen" key="codegen">
    Codegen
  </Select.Option>,
];

function DocsPortalHeader(props: DocsPortalHeaderProps) {
  const history = useHistory();
  const docsCtx = useDocsPortalCtx();
  return (
    <>
      <PlasmicDocsPortalHeader
        {...props}
        studioButton={{
          render: (ps) => {
            const { ref, children, ...rest } = ps;
            return (
              <PublicLink
                {...rest}
                href={APP_ROUTES.project.fill({
                  projectId: docsCtx.studioCtx.siteInfo.id,
                })}
                children={asOne(children)}
              />
            );
          },
        }}
        projectTokenButton={{
          render: (ps, Comp) => (
            <Observer>
              {() => {
                const codegenType = docsCtx.getCodegenType();
                if (codegenType !== "loader") {
                  return null;
                }
                return (
                  <Comp
                    {...ps}
                    onClick={async () => {
                      await showTemporaryInfo({
                        title: "Project token",
                        content: (
                          <code>
                            {docsCtx.studioCtx.siteInfo.projectApiToken}
                          </code>
                        ),
                      });
                    }}
                  />
                );
              }}
            </Observer>
          ),
        }}
        codegenType={{
          "aria-label": "Codegen Type",
          value: docsCtx.getCodegenType(),
          onChange(newCodegenType) {
            if (newCodegenType !== "codegen" && newCodegenType !== "loader") {
              return;
            }

            const location = history.location;
            const projectId = docsCtx.studioCtx.siteInfo.id;
            const oldCodegenType = docsCtx.getCodegenType();
            const newPathname = location.pathname.replace(
              APP_ROUTES.projectDocsCodegenType.fill({
                projectId,
                codegenType: oldCodegenType,
              }),
              APP_ROUTES.projectDocsCodegenType.fill({
                projectId,
                codegenType: newCodegenType,
              })
            );
            history.push({
              pathname: newPathname,
              search: location.search,
              hash: location.hash,
            });
          },
          children: CodegenTypes,
        }}
      />
    </>
  );
}

export default DocsPortalHeader;
