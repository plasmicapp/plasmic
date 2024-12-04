import { getExportedComponentName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { generateSubstituteComponentCalls } from "@/wab/shared/codegen/react-p/utils";
import { ExportPlatformOptions } from "@/wab/shared/codegen/types";
import { jsLiteral } from "@/wab/shared/codegen/util";
import { isPageComponent } from "@/wab/shared/core/components";
import { Component } from "@/wab/shared/model/classes";
import { getIntegrationsUrl, getPublicUrl } from "@/wab/shared/urls";

export function getPlasmicAuthPackageName(opts: {
  importHostFromReactWeb?: boolean;
  platformOptions?: ExportPlatformOptions;
}) {
  // Same as getHostPackageName
  if (opts.importHostFromReactWeb && !opts.platformOptions?.nextjs?.appDir) {
    return `@plasmicapp/react-web/lib/auth`;
  } else {
    return `@plasmicapp/auth-react`;
  }
}

export function shouldWrapWithPageGuard(
  ctx: SerializerBaseContext,
  component: Component
) {
  if (!isPageComponent(component)) {
    return false;
  }
  const roleId = component.pageMeta?.roleId;
  return !!roleId;
}

export function serializeWithPlasmicPageGuard(
  ctx: SerializerBaseContext,
  component: Component
) {
  if (!shouldWrapWithPageGuard(ctx, component)) {
    return "";
  }

  const unauthorizedComp = ctx.site.defaultComponents.unauthorized;

  function generateUnauthorizedSubstituteComponentCall() {
    if (unauthorizedComp && ctx.exportOpts.useComponentSubstitutionApi) {
      return generateSubstituteComponentCalls(
        [unauthorizedComp],
        ctx.exportOpts,
        ctx.aliases
      );
    }
    return "";
  }

  function generateUnauthorizedComp() {
    if (unauthorizedComp) {
      const componentName =
        ctx.aliases.get(unauthorizedComp) ||
        getExportedComponentName(unauthorizedComp);
      return `unauthorizedComp={<${componentName} />}`;
    }
    return "";
  }

  const roleId = component.pageMeta?.roleId;
  // authorizeEndpoint should point to studio, as the authorize endpoint
  // is actually the studio page where the user authorizes the app to
  // access their data.
  return `function withPlasmicPageGuard<P extends object>(
    WrappedComponent: React.ComponentType<P>
  ) {

    ${generateUnauthorizedSubstituteComponentCall()}

    const PageGuard: React.FC<P> = (props) => (
      <PlasmicPageGuard__
        minRole={${jsLiteral(roleId)}}
        appId={${jsLiteral(ctx.projectConfig.projectId)}}
        authorizeEndpoint={${jsLiteral(`${getPublicUrl()}/authorize`)}}
        canTriggerLogin={${jsLiteral(ctx.appAuthProvider === "plasmic-auth")}}
        ${generateUnauthorizedComp()}
      >
        <WrappedComponent {...props} />
      </PlasmicPageGuard__>
    );
    return PageGuard;
  }
`;
}

export function shouldWrapWithUsePlasmicAuth(
  ctx: SerializerBaseContext,
  component: Component
) {
  return (
    isPageComponent(component) &&
    ctx.appAuthProvider === "plasmic-auth" &&
    !ctx.exportOpts.isLivePreview
  );
}

export function serializeWithUsePlasmicAuth(
  ctx: SerializerBaseContext,
  component: Component
) {
  if (!shouldWrapWithUsePlasmicAuth(ctx, component)) {
    return "";
  }
  // Wrap all pages with withUsePlasmicAuth to provide user info and login trigger
  // relies on a context PlasmicDataSourceContextProvider that provides auth redirect uri.

  // We will override the host if it's codegen from development mode (localhost)
  // otherwise, it should fallback to the default host.
  const authHost = getIntegrationsUrl();

  return `function withUsePlasmicAuth<P extends object>(
    WrappedComponent: React.ComponentType<P>
  ) {
    const WithUsePlasmicAuthComponent: React.FC<P> = (props) => {
      const dataSourceCtx = usePlasmicDataSourceContext() ?? {};
      const { isUserLoading, user, token } = plasmicAuth.usePlasmicAuth({
        appId: ${jsLiteral(ctx.projectConfig.projectId)},
        ${authHost.startsWith("http:") ? `host: ${jsLiteral(authHost)},` : ""}
      });

      return (
        <PlasmicDataSourceContextProvider__
          value={{
            ...dataSourceCtx,
            isUserLoading,
            userAuthToken: token,
            user,
          }}
        >
          <WrappedComponent {...props} />
        </PlasmicDataSourceContextProvider__>
      )
    }
    return WithUsePlasmicAuthComponent;
  }`;
}
