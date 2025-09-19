import { Api } from "@/wab/client/api";
import {
  AppCtx,
  loadAppCtx,
  NonAuthCtx,
  NonAuthCtxContext,
  useNonAuthCtx,
  withHostFrameCache,
} from "@/wab/client/app-ctx";
import {
  getLoginRouteWithContinuation,
  getRouteContinuation,
  isProjectPath,
  Router,
} from "@/wab/client/cli-routes";
import AllProjectsPage from "@/wab/client/components/dashboard/AllProjectsPage";
import MyPlayground from "@/wab/client/components/dashboard/MyPlayground";
import { documentTitle } from "@/wab/client/components/dashboard/page-utils";
import SettingsPage from "@/wab/client/components/dashboard/SettingsPage";
import TeamPage from "@/wab/client/components/dashboard/TeamPage";
import TeamSettingsPage from "@/wab/client/components/dashboard/TeamSettingsPage";
import WorkspacePage from "@/wab/client/components/dashboard/WorkspacePage";
import { IntroSplash } from "@/wab/client/components/modals/IntroSplash";
import {
  NormalLayout,
  NormalNonAuthLayout,
} from "@/wab/client/components/normal-layout";
import { AppAuthPage } from "@/wab/client/components/pages/AppAuthPage";
import {
  AuthForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  SsoLoginForm,
} from "@/wab/client/components/pages/AuthForm";
import { EmailVerification } from "@/wab/client/components/pages/EmailVerification";
import { FromStarterTemplate } from "@/wab/client/components/pages/FromStarterTemplate";
import { GithubCallback } from "@/wab/client/components/pages/GithubCallback";
import { ImportProjectsFromProd } from "@/wab/client/components/pages/ImportProjectFromProd";
import { InitTokenPage } from "@/wab/client/components/pages/InitTokenPage";
import { SurveyForm } from "@/wab/client/components/pages/SurveyForm";
import { TeamCreation } from "@/wab/client/components/pages/TeamCreation";
import PromoBanner from "@/wab/client/components/PromoBanner";
import {
  routerRedirect,
  routerRedirectAsync,
  routerRoute,
} from "@/wab/client/components/router-utils";
import { AppView } from "@/wab/client/components/top-view";
import * as widgets from "@/wab/client/components/widgets";
import { providesAppCtx, useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useHostFrameCtxIfHostFrame } from "@/wab/client/frame-ctx/host-frame-ctx";
import { analytics } from "@/wab/client/observability";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import {
  promisifyMethods,
  PromisifyMethods,
} from "@/wab/commons/promisify-methods";
import { CmsDatabaseId } from "@/wab/shared/ApiSchema";
import { FastBundler } from "@/wab/shared/bundler";
import { ensure, hackyCast, spawn } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { StarterSectionConfig } from "@/wab/shared/devflags";
import { BASE_URL } from "@/wab/shared/discourse/config";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { getMaximumTierFromTeams } from "@/wab/shared/pricing/pricing-utils";
import { APP_ROUTES, SEARCH_PROMPT } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import * as React from "react";
import { Redirect, Route, Switch, useHistory, useLocation } from "react-router";

const LazyTeamAnalytics = React.lazy(() => import("./analytics/TeamAnalytics"));
const LazyAdminPage = React.lazy(() => import("./pages/admin/AdminPage"));
const LazyViewInitializer = React.lazy(
  () => import("./studio/view-initializer")
);

interface LoggedInContainerProps {
  onRefreshUi: () => void;
}

function getStarter(
  starterSections: StarterSectionConfig[],
  starterTag: string
) {
  try {
    const results = starterSections.flatMap((section) =>
      section.projects.filter((project) => project.tag === starterTag)
    );
    return ensure(results[0], "");
  } catch (e) {
    throw new Error(
      `Could not find the starter project named "${starterTag}".`
    );
  }
}

function LoggedInContainer(props: LoggedInContainerProps) {
  const { onRefreshUi } = props;
  const nonAuthCtx = useNonAuthCtx();
  const appCtx = useAppCtx();

  const selfInfo =
    appCtx.selfInfo && !appCtx.selfInfo.isFake ? appCtx.selfInfo : null;
  function projectRoute() {
    return routerRoute({
      path: APP_ROUTES.project,
      render: ({ match }) => {
        return (
          <LazyViewInitializer
            appCtx={appCtx}
            onRefreshUi={onRefreshUi}
            projectId={match.params.projectId}
          />
        );
      },
    });
  }

  const currentLocation = useLocation();

  const isWhiteLabeled = !!selfInfo?.isWhiteLabel;
  return (
    <React.Suspense
      fallback={
        isProjectPath(currentLocation.pathname) ? (
          <widgets.StudioPlaceholder />
        ) : (
          <widgets.Spinner />
        )
      }
    >
      <IntroSplash />
      {!selfInfo ? (
        // Not logged in users
        <Switch>
          {projectRoute()}
          <Redirect to={getLoginRouteWithContinuation()} />
        </Switch>
      ) : isWhiteLabeled ? (
        // White-labeled users only get projectRoute()
        <Switch>{projectRoute()}</Switch>
      ) : (
        // Normal logged in users
        <Switch>
          {routerRoute({
            exact: true,
            path: APP_ROUTES.starter,
            render: ({ match, location }) => {
              const starter = getStarter(
                appCtx.appConfig.starterSections,
                match.params.starterTag
              );
              return (
                <FromStarterTemplate
                  appCtx={appCtx}
                  {...starter}
                  path={location.pathname}
                />
              );
            },
          })}
          {routerRoute({
            exact: true,
            path: APP_ROUTES.fork,
            render: ({ match, location }) => {
              // NOTE: Temporarily re-using the FromStarterTemplate component to fork a public project
              // TODO (later): Fork a private project using listingId
              const baseProjectId = match.params.projectId;
              const { pathname, search } = location;
              const version =
                new URLSearchParams(search).get("version") ?? undefined; // gets the query param "version" from the URL
              return (
                <FromStarterTemplate
                  appCtx={appCtx}
                  baseProjectId={baseProjectId}
                  path={pathname}
                  version={version}
                />
              );
            },
          })}
          {routerRedirect({
            exact: true,
            path: APP_ROUTES.teamCreation,
            to: ({ match, location }) =>
              fillRoute(
                APP_ROUTES.orgCreation,
                match.params,
                Object.fromEntries(new URLSearchParams(location.search))
              ),
          })}
          {routerRoute({
            exact: true,
            path: APP_ROUTES.orgCreation,
            render: () => (
              <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                <TeamCreation />
              </NormalNonAuthLayout>
            ),
          })}
          <Route
            render={() =>
              selfInfo.needsSurvey ? (
                <Redirect
                  to={fillRoute(
                    APP_ROUTES.survey,
                    {},
                    {
                      continueTo: getRouteContinuation(),
                    }
                  )}
                />
              ) : selfInfo.waitingEmailVerification ? (
                <Redirect
                  to={fillRoute(
                    APP_ROUTES.emailVerification,
                    {},
                    {
                      continueTo: getRouteContinuation(),
                    }
                  )}
                />
              ) : selfInfo.needsTeamCreationPrompt ? (
                <Redirect
                  to={fillRoute(
                    APP_ROUTES.orgCreation,
                    {},
                    {
                      continueTo: getRouteContinuation(),
                    }
                  )}
                />
              ) : (
                <Switch>
                  {projectRoute()}
                  {routerRedirect({
                    exact: true,
                    path: APP_ROUTES.dashboard,
                    to: () => fillRoute(APP_ROUTES.allProjects, {}),
                  })}
                  {routerRoute({
                    exact: true,
                    path: APP_ROUTES.allProjects,
                    render: () => <AllProjectsPage />,
                  })}
                  {routerRoute({
                    exact: true,
                    path: APP_ROUTES.playground,
                    render: () => <MyPlayground />,
                  })}
                  {routerRoute({
                    path: APP_ROUTES.workspace,
                    render: ({ match }) => (
                      <WorkspacePage
                        key={match.params.workspaceId}
                        workspaceId={match.params.workspaceId}
                      />
                    ),
                  })}
                  {routerRedirect({
                    exact: true,
                    path: APP_ROUTES.team,
                    to: ({ match, location }) =>
                      fillRoute(
                        APP_ROUTES.org,
                        match.params,
                        Object.fromEntries(new URLSearchParams(location.search))
                      ),
                  })}
                  {routerRoute({
                    exact: true,
                    path: APP_ROUTES.org,
                    render: ({ match }) => (
                      <TeamPage
                        key={match.params.teamId}
                        teamId={match.params.teamId}
                      />
                    ),
                  })}
                  {routerRoute({
                    path: APP_ROUTES.cmsRoot,
                    render: ({ match }) => (
                      <widgets.ObserverLoadable
                        loader={() => import("./cms/CmsRoot")}
                        contents={(CmsRoot) => (
                          <CmsRoot.default
                            databaseId={
                              match.params.databaseId as CmsDatabaseId
                            }
                          />
                        )}
                      />
                    ),
                  })}
                  {routerRedirectAsync({
                    exact: true,
                    path: APP_ROUTES.orgBilling,
                    to: async ({ match }) => {
                      const teamId = match.params.teamId;
                      try {
                        const { url } =
                          await appCtx.api.createTeamCustomerPortalSession(
                            teamId
                          );
                        return url;
                      } catch (e) {
                        return fillRoute(APP_ROUTES.orgSettings, { teamId });
                      }
                    },
                  })}
                  {routerRedirect({
                    path: APP_ROUTES.teamSettings,
                    to: ({ match, location }) =>
                      fillRoute(
                        APP_ROUTES.orgSettings,
                        match.params,
                        Object.fromEntries(new URLSearchParams(location.search))
                      ),
                  })}
                  {routerRoute({
                    path: APP_ROUTES.orgSettings,
                    render: ({ match, location }) => {
                      const teamId = match.params.teamId;
                      // Block viewers from seeing the settings page.
                      const team = teamId
                        ? appCtx.teams.find((t) => t.id === teamId)
                        : undefined;
                      const userAccessLevel =
                        (team
                          ? getAccessLevelToResource(
                              { type: "team", resource: team },
                              appCtx.selfInfo,
                              appCtx.perms
                            )
                          : undefined) ?? "blocked";
                      if (
                        accessLevelRank(userAccessLevel) <=
                        accessLevelRank("viewer")
                      ) {
                        return (
                          <Redirect
                            to={fillRoute(
                              APP_ROUTES.org,
                              match.params,
                              Object.fromEntries(
                                new URLSearchParams(location.search)
                              )
                            )}
                          />
                        );
                      }
                      return <TeamSettingsPage teamId={teamId} />;
                    },
                  })}
                  {routerRedirectAsync({
                    path: APP_ROUTES.orgSupport,
                    to: async ({ match }) => {
                      const { publicSupportUrl, privateSupportUrl } =
                        await appCtx.api.prepareTeamSupportUrls(
                          match.params.teamId
                        );
                      if (privateSupportUrl) {
                        return privateSupportUrl;
                      } else {
                        return publicSupportUrl;
                      }
                    },
                  })}
                  {routerRoute({
                    exact: true,
                    path: APP_ROUTES.settings,
                    render: () => <SettingsPage appCtx={appCtx} />,
                  })}
                  <Route
                    exact
                    path={[
                      APP_ROUTES.admin.pattern,
                      APP_ROUTES.adminTeams.pattern,
                    ]}
                    render={() =>
                      isAdminTeamEmail(selfInfo.email, appCtx.appConfig) ? (
                        <NormalLayout appCtx={appCtx}>
                          <LazyAdminPage nonAuthCtx={nonAuthCtx} />
                        </NormalLayout>
                      ) : (
                        <Redirect to={"/"} />
                      )
                    }
                  />
                  {routerRoute({
                    exact: true,
                    path: APP_ROUTES.importProjectsFromProd,
                    render: () =>
                      isAdminTeamEmail(selfInfo.email, appCtx.appConfig) ? (
                        <NormalLayout appCtx={appCtx}>
                          <ImportProjectsFromProd nonAuthCtx={nonAuthCtx} />
                        </NormalLayout>
                      ) : (
                        <Redirect to={"/"} />
                      ),
                  })}
                  {routerRedirectAsync({
                    exact: true,
                    path: APP_ROUTES.discourseConnect,
                    to: async () => {
                      const params = await appCtx.api.discourseConnect(
                        location.search
                      );
                      const url = new URL(`${BASE_URL}/session/sso_login`);
                      url.search = new URLSearchParams(params).toString();
                      return url.toString();
                    },
                  })}
                  {routerRoute({
                    exact: true,
                    path: APP_ROUTES.plasmicInit,
                    render: ({ match }) => (
                      <InitTokenPage
                        appCtx={appCtx}
                        initToken={match.params.initToken}
                      />
                    ),
                  })}
                  {routerRedirect({
                    exact: true,
                    path: APP_ROUTES.teamAnalytics,
                    to: ({ match, location }) =>
                      fillRoute(
                        APP_ROUTES.orgAnalytics,
                        match.params,
                        Object.fromEntries(new URLSearchParams(location.search))
                      ),
                  })}
                  {routerRoute({
                    exact: true,
                    path: APP_ROUTES.orgAnalytics,
                    render: ({ match }) => (
                      <LazyTeamAnalytics teamId={match.params.teamId} />
                    ),
                  })}
                </Switch>
              )
            }
          />
        </Switch>
      )}
    </React.Suspense>
  );
}

export function Root() {
  const history = useHistory();
  const [nonAuthCtx, setNonAuthCtx] = React.useState<NonAuthCtx | undefined>(
    undefined
  );
  const [loaderKey, setLoaderKey] = React.useState(0);

  const reloadData = () => setLoaderKey((prev) => prev + 1);
  const forceUpdate = useForceUpdate();

  const hostFrameCtx = useHostFrameCtxIfHostFrame();

  React.useEffect(() => {
    const api: PromisifyMethods<Api> =
      hostFrameCtx?.topFrameApi || promisifyMethods(new Api());
    const topFrameApi = hostFrameCtx?.topFrameApi || null;
    const bundler = new FastBundler();

    spawn(
      (async () => {
        const lastBundleVersion = await withHostFrameCache(
          "bundle",
          true,
          api,
          async () => {
            await api.refreshCsrfToken();
            const { latestBundleVersion } = await api.getLastBundleVersion();
            return latestBundleVersion;
          }
        );
        setNonAuthCtx(
          new NonAuthCtx({
            api,
            topFrameApi,
            history,
            router: new Router(history),
            change: forceUpdate,
            bundler,
            lastBundleVersion,
          })
        );
      })()
    );
  }, []);

  console.log("Rendering app");
  if (!nonAuthCtx) {
    return null;
  }

  const loader = async () => {
    const appCtx = await loadAppCtx(nonAuthCtx, true);
    hackyCast(window).gAppCtx = appCtx;

    if (appCtx.selfInfo) {
      const tier = isAdminTeamEmail(appCtx.selfInfo.email, appCtx.appConfig)
        ? "enterprise"
        : getMaximumTierFromTeams(appCtx.teams);

      // TODO: Move identify to server when we can rely more on PostHog product analytics
      analytics().identify(appCtx.selfInfo.id, {
        email: appCtx.selfInfo.email,
        firstName: appCtx.selfInfo.firstName,
        lastName: appCtx.selfInfo.lastName,
        isWhiteLabel: appCtx.selfInfo.isWhiteLabel,
        whiteLabelId: appCtx.selfInfo.whiteLabelId,
        whiteLabelEmail: appCtx.selfInfo.whiteLabelInfo?.email,
        tier,
      });

      if (["enterprise", "team", "pro"].includes(tier)) {
        analytics().recordSession();
      }
    }
    return appCtx;
  };
  return (
    <AppView
      contents={(app) => {
        nonAuthCtx.app = app;
        // We are adding no-op event handlers here because of the following:
        //
        // When you addEventListener() in a componentDidMount (say,
        // pointerdown), it usually but won’t always fire after the same event
        // type in your React components (onPointerDown).  It depends entirely
        // on whether React has ever before had to set up that event handler!
        // If it hasn’t (this is the first time you’ve used onPointerDown in
        // your app), then React’s will come second.  But if you unmount and
        // then remount the component, the componentDidMount listener will
        // come second.  So to ensure consistent ordering, make sure you’ve
        // already used onPointerDown somewhere before.
        //
        // This matters in particular to e.g. SidebarPopup.
        return (
          <widgets.Loadable
            key={loaderKey}
            loader={loader}
            contents={(appCtx: /*TWZ*/ AppCtx) => {
              return providesAppCtx(appCtx)(
                <NonAuthCtxContext.Provider value={nonAuthCtx}>
                  <div className={"root"} onPointerDown={() => {}}>
                    <Switch>
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.login,
                        render: () => (
                          <>
                            <PromoBanner />
                            <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                              {documentTitle("Sign in")}
                              <AuthForm
                                mode="sign in"
                                onLoggedIn={reloadData}
                              />
                            </NormalNonAuthLayout>
                          </>
                        ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.survey,
                        render: () => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            <SurveyForm />
                          </NormalNonAuthLayout>
                        ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.emailVerification,
                        render: () =>
                          !appCtx.selfInfo ? (
                            <Redirect to={getLoginRouteWithContinuation()} />
                          ) : (
                            <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                              <EmailVerification selfInfo={appCtx.selfInfo} />
                            </NormalNonAuthLayout>
                          ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.signup,
                        render: () => (
                          <>
                            <PromoBanner />
                            <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                              {documentTitle("Sign up")}
                              <AuthForm
                                mode="sign up"
                                onLoggedIn={reloadData}
                              />
                            </NormalNonAuthLayout>
                          </>
                        ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.sso,
                        render: () => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Log in with SSO")}
                            <SsoLoginForm onLoggedIn={reloadData} />
                          </NormalNonAuthLayout>
                        ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.logout,
                        render: () => {
                          spawn(appCtx.logout());
                          return null;
                        },
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.authorize,
                        render: () => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            <AppAuthPage />
                          </NormalNonAuthLayout>
                        ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.forgotPassword,
                        render: () => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Forgot password")}
                            <ForgotPasswordForm />
                          </NormalNonAuthLayout>
                        ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.resetPassword,
                        render: () => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Reset password")}
                            <ResetPasswordForm />
                          </NormalNonAuthLayout>
                        ),
                      })}
                      {routerRoute({
                        exact: true,
                        path: APP_ROUTES.githubCallback,
                        render: () => (
                          <GithubCallback nonAuthCtx={nonAuthCtx} />
                        ),
                      })}
                      {routerRedirectAsync({
                        exact: true,
                        path: APP_ROUTES.copilot,
                        to: async () => {
                          const prompt = new URLSearchParams(
                            location.search
                          ).get(SEARCH_PROMPT);
                          if (prompt) {
                            const { project } = await appCtx.api.createProject({
                              name: "Copilot",
                              isPublic: true,
                            });
                            return fillRoute(
                              APP_ROUTES.project,
                              { projectId: project.id },
                              { [SEARCH_PROMPT]: prompt }
                            );
                          }
                          return fillRoute(APP_ROUTES.login, {});
                        },
                      })}
                      {routerRoute({
                        path: APP_ROUTES.dashboard,
                        render: () => (
                          <LoggedInContainer onRefreshUi={forceUpdate} />
                        ),
                      })}
                    </Switch>
                  </div>
                </NonAuthCtxContext.Provider>
              );
            }}
          />
        );
      }}
    />
  );
}
