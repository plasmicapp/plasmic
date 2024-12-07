import { analytics } from "@/wab/client/analytics";
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
  mkProjectLocation,
  Router,
  UU,
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
import deployedVersions from "@/wab/client/plasmic-deployed.json";
import { useForceUpdate } from "@/wab/client/useForceUpdate";
import {
  promisifyMethods,
  PromisifyMethods,
} from "@/wab/commons/promisify-methods";
import { CmsDatabaseId } from "@/wab/shared/ApiSchema";
import { isArenaType } from "@/wab/shared/Arenas";
import { FastBundler } from "@/wab/shared/bundler";
import { ensure, hackyCast, spawn } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { StarterSectionConfig } from "@/wab/shared/devflags";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { getMaximumTierFromTeams } from "@/wab/shared/pricing/pricing-utils";
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
        path={UU.project.pattern}
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
            path={UU.starter.pattern}
            render={({ match }) => {
              const starter = getStarter(
                appCtx.appConfig.starterSections,
                match.params.starterTag
              );
              return <FromStarterTemplate appCtx={appCtx} starter={starter} />;
            }}
          />
          <Route
            exact
            path={UU.teamCreation.pattern}
            render={({ match, location }) => (
              <Redirect
                to={UU.orgCreation.fill(
                  match.params,
                  Object.fromEntries(new URLSearchParams(location.search))
                )}
              />
            )}
          />
          <Route
            exact
            path={UU.orgCreation.pattern}
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
                  to={UU.survey.fill(
                    {},
                    {
                      continueTo: getRouteContinuation(),
                    }
                  )}
                />
              ) : selfInfo.waitingEmailVerification ? (
                <Redirect
                  to={UU.emailVerification.fill(
                    {},
                    {
                      continueTo: getRouteContinuation(),
                    }
                  )}
                />
              ) : selfInfo.needsTeamCreationPrompt ? (
                <Redirect
                  to={UU.orgCreation.fill(
                    {},
                    {
                      continueTo: getRouteContinuation(),
                    }
                  )}
                />
              ) : (
                <Switch>
                  {/* TODO: Remove this redirect and all code for UU.projectBranchArena after 2024. */}
                  <Route
                    path={UU.projectBranchArena.pattern}
                    render={({ location }) => {
                      // Call parse() because Route.render() doesn't decode params.
                      const match = ensure(
                        UU.projectBranchArena.parse(location.pathname),
                        "parse failed unexpectedly"
                      );
                      const {
                        projectId,
                        branchName,
                        branchVersion,
                        arenaName,
                        arenaType: maybeArenaType,
                      } = match.params;
                      const arenaType = isArenaType(maybeArenaType)
                        ? maybeArenaType
                        : undefined;
                      return (
                        <Redirect
                          to={mkProjectLocation({
                            projectId,
                            slug: arenaName,
                            branchName,
                            branchVersion,
                            arenaType,
                            arenaUuidOrNameOrPath: arenaName,
                          })}
                        />
                      );
                    }}
                  />
                  {projectRoute()}
                  <Route
                    exact
                    path={UU.dashboard.pattern}
                    render={() => <Redirect to={UU.allProjects.fill({})} />}
                  />
                  <Route
                    exact
                    path={UU.allProjects.pattern}
                    render={() => <AllProjectsPage />}
                  />
                  <Route
                    exact
                    path={UU.playground.pattern}
                    render={() => <MyPlayground />}
                  />
                  <Route
                    path={UU.workspace.pattern}
                    render={({ match }) => (
                      <WorkspacePage
                        key={match.params.workspaceId}
                        workspaceId={match.params.workspaceId}
                      />
                    )}
                  />
                  <Route
                    exact
                    path={UU.team.pattern}
                    render={({ match, location }) => (
                      <Redirect
                        to={UU.org.fill(
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
                    path={UU.org.pattern}
                    render={({ match }) => (
                      <TeamPage
                        key={match.params.teamId}
                        teamId={match.params.teamId}
                      />
                    )}
                  />
                  <Route
                    path={UU.cmsRoot.pattern}
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
                    path={UU.teamSettings.pattern}
                    render={({ match, location }) => (
                      <Redirect
                        to={UU.orgSettings.fill(
                          match.params,
                          Object.fromEntries(
                            new URLSearchParams(location.search)
                          )
                        )}
                      />
                    )}
                  />
                  <Route
                    path={UU.orgSettings.pattern}
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
                        accessLevelRank("commenter")
                      ) {
                        return (
                          <Redirect
                            to={UU.org.fill(
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
                    path={UU.orgSupport.pattern}
                    render={({ match }) => (
                      <TeamSupportRedirect teamId={match.params.teamId} />
                    )}
                  />
                  <Route
                    exact
                    path={UU.settings.pattern}
                    render={() => <SettingsPage appCtx={appCtx} />}
                  />
                  <Route
                    exact
                    path={[UU.admin.pattern, UU.adminTeams.pattern]}
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
                    path={UU.importProjectsFromProd.pattern}
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
                    path={UU.discourseConnectClient.pattern}
                    render={() => <DiscourseConnectClient />}
                  />
                  <Route
                    exact
                    path={UU.plasmicInit.pattern}
                    render={({ match }) => (
                      <InitTokenPage
                        appCtx={appCtx}
                        initToken={match.params.initToken}
                      />
                    )}
                  />
                  <Route
                    exact
                    path={UU.teamAnalytics.pattern}
                    render={({ match, location }) => (
                      <Redirect
                        to={UU.orgAnalytics.fill(
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
                    path={UU.orgAnalytics.pattern}
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
                        path={UU.login.pattern}
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
                        path={UU.survey.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            <SurveyForm />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={UU.emailVerification.pattern}
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
                        path={UU.signup.pattern}
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
                        path={UU.sso.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Log in with SSO")}
                            <SsoLoginForm onLoggedIn={reloadData} />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={UU.logout.pattern}
                        render={() => {
                          spawn(appCtx.logout());
                          return null;
                        }}
                      />
                      <Route
                        exact
                        path={UU.authorize.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            <AppAuthPage />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={UU.forgotPassword.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Forgot password")}
                            <ForgotPasswordForm />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={UU.resetPassword.pattern}
                        render={() => (
                          <NormalNonAuthLayout nonAuthCtx={nonAuthCtx}>
                            {documentTitle("Reset password")}
                            <ResetPasswordForm />
                          </NormalNonAuthLayout>
                        )}
                      />
                      <Route
                        exact
                        path={UU.githubCallback.pattern}
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
