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
import { DiscourseConnectClient } from "@/wab/client/components/DiscourseConnectClient";
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
import { TeamSupportRedirect } from "@/wab/client/components/TeamSupportRedirect";
import { AppView } from "@/wab/client/components/top-view";
import * as widgets from "@/wab/client/components/widgets";
import { providesAppCtx, useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useHostFrameCtxIfHostFrame } from "@/wab/client/frame-ctx/host-frame-ctx";
import { analytics } from "@/wab/client/observability";
import deployedVersions from "@/wab/client/plasmic-deployed.json";
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
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { getMaximumTierFromTeams } from "@/wab/shared/pricing/pricing-utils";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
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
    return (
      <Route
        path={APP_ROUTES.project.pattern}
        render={({ match }) => (
          <LazyViewInitializer
            appCtx={appCtx}
            onRefreshUi={onRefreshUi}
            projectId={match.params.projectId}
          />
        )}
      />
    );
  }

  const selfEmail = selfInfo?.email;
  React.useEffect(() => {
    if (isAdminTeamEmail(selfEmail, appCtx.appConfig)) {
      console.log("Deployed versions", deployedVersions);
    }
  }, [selfEmail]);

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
          <Route
            exact
            path={APP_ROUTES.starter.pattern}
            render={({ match, location }) => {
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
            }}
          />
          <Route
            exact
            path={APP_ROUTES.fork.pattern}
            render={({ match, location }) => {
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
            }}
          />
          <Route
            exact
            path={APP_ROUTES.teamCreation.pattern}
            render={({ match, location }) => (
              <Redirect
                to={fillRoute(
                  APP_ROUTES.orgCreation,
                  match.params,
                  Object.fromEntries(new URLSearchParams(location.search))
                )}
              />
            )}
          />
          <Route
            exact
            path={APP_ROUTES.orgCreation.pattern}
            render={() => (
              <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                <TeamCreation />
              </NormalNonAuthLayout>
            )}
          />
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
                  <Route
                    exact
                    path={APP_ROUTES.dashboard.pattern}
                    render={() => (
                      <Redirect to={fillRoute(APP_ROUTES.allProjects, {})} />
                    )}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.allProjects.pattern}
                    render={() => <AllProjectsPage />}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.playground.pattern}
                    render={() => <MyPlayground />}
                  />
                  <Route
                    path={APP_ROUTES.workspace.pattern}
                    render={({ match }) => (
                      <WorkspacePage
                        key={match.params.workspaceId}
                        workspaceId={match.params.workspaceId}
                      />
                    )}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.team.pattern}
                    render={({ match, location }) => (
                      <Redirect
                        to={fillRoute(
                          APP_ROUTES.org,
                          match.params,
                          Object.fromEntries(
                            new URLSearchParams(location.search)
                          )
                        )}
                      />
                    )}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.org.pattern}
                    render={({ match }) => (
                      <TeamPage
                        key={match.params.teamId}
                        teamId={match.params.teamId}
                      />
                    )}
                  />
                  <Route
                    path={APP_ROUTES.cmsRoot.pattern}
                    render={({ match }) => (
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
                    )}
                  />
                  <Route
                    path={APP_ROUTES.teamSettings.pattern}
                    render={({ match, location }) => (
                      <Redirect
                        to={fillRoute(
                          APP_ROUTES.orgSettings,
                          match.params,
                          Object.fromEntries(
                            new URLSearchParams(location.search)
                          )
                        )}
                      />
                    )}
                  />
                  <Route
                    path={APP_ROUTES.orgSettings.pattern}
                    render={({ match, location }) => {
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
                    }}
                  />
                  <Route
                    path={APP_ROUTES.orgSupport.pattern}
                    render={({ match }) => (
                      <TeamSupportRedirect teamId={match.params.teamId} />
                    )}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.settings.pattern}
                    render={() => <SettingsPage appCtx={appCtx} />}
                  />
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
                  <Route
                    exact
                    path={APP_ROUTES.importProjectsFromProd.pattern}
                    render={() =>
                      isAdminTeamEmail(selfInfo.email, appCtx.appConfig) ? (
                        <NormalLayout appCtx={appCtx}>
                          <ImportProjectsFromProd nonAuthCtx={nonAuthCtx} />
                        </NormalLayout>
                      ) : (
                        <Redirect to={"/"} />
                      )
                    }
                  />
                  <Route
                    exact
                    path={APP_ROUTES.discourseConnectClient.pattern}
                    render={() => <DiscourseConnectClient />}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.plasmicInit.pattern}
                    render={({ match }) => (
                      <InitTokenPage
                        appCtx={appCtx}
                        initToken={match.params.initToken}
                      />
                    )}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.teamAnalytics.pattern}
                    render={({ match, location }) => (
                      <Redirect
                        to={fillRoute(
                          APP_ROUTES.orgAnalytics,
                          match.params,
                          Object.fromEntries(
                            new URLSearchParams(location.search)
                          )
                        )}
                      />
                    )}
                  />
                  <Route
                    exact
                    path={APP_ROUTES.orgAnalytics.pattern}
                    render={({ match }) => (
                      <LazyTeamAnalytics teamId={match.params.teamId} />
                    )}
                  />
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
                      <Route
                        exact
                        path={APP_ROUTES.login.pattern}
                        render={() => (
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
                        )}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.survey.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            <SurveyForm />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.emailVerification.pattern}
                        render={() =>
                          !appCtx.selfInfo ? (
                            <Redirect to={getLoginRouteWithContinuation()} />
                          ) : (
                            <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                              <EmailVerification selfInfo={appCtx.selfInfo} />
                            </NormalNonAuthLayout>
                          )
                        }
                      />
                      <Route
                        exact
                        path={APP_ROUTES.signup.pattern}
                        render={() => (
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
                        )}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.sso.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Log in with SSO")}
                            <SsoLoginForm onLoggedIn={reloadData} />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.logout.pattern}
                        render={() => {
                          spawn(appCtx.logout());
                          return null;
                        }}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.authorize.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            <AppAuthPage />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.forgotPassword.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Forgot password")}
                            <ForgotPasswordForm />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.resetPassword.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Reset password")}
                            <ResetPasswordForm />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={APP_ROUTES.githubCallback.pattern}
                        render={() => (
                          <GithubCallback nonAuthCtx={nonAuthCtx} />
                        )}
                      />
                      <Route
                        path={"/"}
                        render={() => (
                          <LoggedInContainer onRefreshUi={forceUpdate} />
                        )}
                      />
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
