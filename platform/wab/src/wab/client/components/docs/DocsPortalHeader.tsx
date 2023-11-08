import { Observer } from "mobx-react-lite";
import * as React from "react";
import { useHistory } from "react-router-dom";
import { asOne } from "../../../common";
import { U } from "../../cli-routes";
import {
  DefaultDocsPortalHeaderProps,
  PlasmicDocsPortalHeader,
} from "../../plasmic/plasmic_kit_docs_portal/PlasmicDocsPortalHeader";
import { useDocsPortalCtx } from "../docs/DocsPortalCtx";
import { PublicLink } from "../PublicLink";
import { showTemporaryInfo } from "../quick-modals";
import Select from "../widgets/Select";

interface DocsPortalHeaderProps extends DefaultDocsPortalHeaderProps {}

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
                href={U.project({
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
              U.projectDocsCodegenType({
                projectId,
                codegenType: oldCodegenType,
              }),
              U.projectDocsCodegenType({
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
