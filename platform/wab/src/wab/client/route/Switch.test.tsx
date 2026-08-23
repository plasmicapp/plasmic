import { handleError } from "@/wab/client/ErrorNotifications";
import { HistoryProvider } from "@/wab/client/route/HistoryProvider";
import { Redirect, RedirectAsync } from "@/wab/client/route/Redirect";
import { Switch, switchCase, switchDefault } from "@/wab/client/route/Switch";
import { useMatchedRoute } from "@/wab/client/route/useMatchedRoute";
import { route } from "@/wab/shared/route/route";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import * as React from "react";

vitest.mock("@/wab/client/ErrorNotifications", () => ({
  handleError: vitest.fn(),
}));

const listRoute = route("/projects");
const detailRoute = route("/projects/:id");
const previewRoute = route("/projects/:id{/*previewPath}");

function ShowMatch() {
  const matched = useMatchedRoute<{ id: string }>();
  const matchedList = useMatchedRoute(listRoute);
  const matchedDetail = useMatchedRoute(detailRoute);
  const matchedPreview = useMatchedRoute(previewRoute);
  const params = (match: { pathParams: {} } | undefined) =>
    match ? JSON.stringify(match.pathParams) : "undefined";
  return (
    <div>
      <div>
        {matched
          ? `useMatchedRoute(): ${matched.route.pattern} ${params(matched)}`
          : `useMatchedRoute(): undefined`}
      </div>
      <div>{`useMatchedRoute("${listRoute.pattern}"): ${params(
        matchedList
      )}`}</div>
      <div>{`useMatchedRoute("${detailRoute.pattern}"): ${params(
        matchedDetail
      )}`}</div>
      <div>{`useMatchedRoute("${previewRoute.pattern}"): ${params(
        matchedPreview
      )}`}</div>
    </div>
  );
}

function TestApp() {
  return (
    <Switch
      cases={[
        switchCase({
          exact: true,
          route: listRoute,
          render: () => <Redirect to={previewRoute.fill({ id: "first" })} />,
        }),
        switchCase({
          exact: true,
          route: detailRoute,
          render: ({ id }) =>
            id === "deleted" ? (
              <Redirect to={listRoute.fill({})} />
            ) : (
              <Switch
                cases={[switchDefault({ render: () => <ShowMatch /> })]}
              />
            ),
        }),
        switchCase({
          route: previewRoute,
          render: () => (
            <Switch cases={[switchDefault({ render: () => <ShowMatch /> })]} />
          ),
        }),
        switchDefault({
          render: () => (
            <>
              <div>not found</div>
              <ShowMatch />
            </>
          ),
        }),
      ]}
    />
  );
}

function renderAt(path: string, node: React.ReactNode = <TestApp />) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const wrap = (n: React.ReactNode) => (
    <HistoryProvider history={history}>{n}</HistoryProvider>
  );
  const view = render(wrap(node));
  return {
    history,
    unmount: view.unmount,
    rerender: (n: React.ReactNode) => view.rerender(wrap(n)),
    expectIncludes: (text: string) =>
      expect(view.container.textContent).toInclude(text),
  };
}

function expectNoMatch(expectIncludes: (text: string) => void) {
  expectIncludes(`useMatchedRoute(): undefined`);
  expectIncludes(`useMatchedRoute("/projects"): undefined`);
  expectIncludes(`useMatchedRoute("/projects/:id"): undefined`);
  expectIncludes(`useMatchedRoute("/projects/:id{/*previewPath}"): undefined`);
}

describe("Switch", () => {
  it("renders the first matching case, containing its nested switch", () => {
    const { expectIncludes } = renderAt("/projects/42");
    expectIncludes(`useMatchedRoute(): /projects/:id {"id":"42"}`);
    expectIncludes(`useMatchedRoute("/projects"): {}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): {"id":"42"}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): {"id":"42"}`
    );
  });

  it("matches routes by prefix by default", () => {
    const { expectIncludes } = renderAt("/projects/42/details");
    expectIncludes(
      `useMatchedRoute(): /projects/:id{/*previewPath} {"id":"42","previewPath":["details"]}`
    );
    expectIncludes(`useMatchedRoute("/projects"): {}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): {"id":"42"}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): {"id":"42","previewPath":["details"]}`
    );
  });

  it("splits / in splat param", () => {
    const { expectIncludes } = renderAt("/projects/42/a/b");
    expectIncludes(
      `useMatchedRoute(): /projects/:id{/*previewPath} {"id":"42","previewPath":["a","b"]}`
    );
    expectIncludes(`useMatchedRoute("/projects"): {}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): {"id":"42"}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): {"id":"42","previewPath":["a","b"]}`
    );
  });

  it("decodes %2F in splat param", () => {
    const { expectIncludes } = renderAt("/projects/42/a%2Fb");
    expectIncludes(
      `useMatchedRoute(): /projects/:id{/*previewPath} {"id":"42","previewPath":["a/b"]}`
    );
    expectIncludes(`useMatchedRoute("/projects"): {}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): {"id":"42"}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): {"id":"42","previewPath":["a/b"]}`
    );
  });

  it.each([
    ["plain", "abc", `{"id":"abc"}`],
    ["with a space", "a b", `{"id":"a b"}`],
    ["with a slash", "a/b", `{"id":"a/b"}`],
    ["with a percent", "a%b", `{"id":"a%b"}`],
    ["with an encoded-slash-looking literal", "a%2Fb", `{"id":"a%2Fb"}`],
  ])("round-trips a param %s through Route.fill", (_desc, id, params) => {
    const { expectIncludes } = renderAt(detailRoute.fill({ id }));
    expectIncludes(`useMatchedRoute(): /projects/:id ${params}`);
    expectIncludes(`useMatchedRoute("/projects"): {}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): ${params}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): ${params}`
    );
  });

  it("falls through to the default case", async () => {
    const { expectIncludes } = renderAt("/nope");
    expect(await screen.findByText("not found")).toBeTruthy();
    expectNoMatch(expectIncludes);
  });

  it("re-renders on navigation", () => {
    const { history, expectIncludes } = renderAt("/projects/42");
    expectIncludes(`useMatchedRoute(): /projects/:id {"id":"42"}`);
    act(() => history.push("/projects/43"));
    expectIncludes(`useMatchedRoute(): /projects/:id {"id":"43"}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): {"id":"43"}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): {"id":"43"}`
    );
  });
});

describe("useMatchedRoute", () => {
  it("provides the matched route and explicit re-matches", () => {
    const { expectIncludes } = renderAt("/projects/42/details");
    expectIncludes(
      `useMatchedRoute(): /projects/:id{/*previewPath} {"id":"42","previewPath":["details"]}`
    );
    expectIncludes(`useMatchedRoute("/projects"): {}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): {"id":"42"}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): {"id":"42","previewPath":["details"]}`
    );
  });

  it("returns undefined without a match", () => {
    const { expectIncludes } = renderAt("/nope");
    expectIncludes("not found");
    expectNoMatch(expectIncludes);
  });

  it("returns undefined without an enclosing Switch", () => {
    const { expectIncludes } = renderAt("/projects/42", <ShowMatch />);
    expectNoMatch(expectIncludes);
  });
});

describe("Redirect", () => {
  it("replaces the location with a string target", async () => {
    const { history, expectIncludes } = renderAt("/projects");
    await waitFor(() =>
      expectIncludes(`useMatchedRoute(): /projects/:id {"id":"first"}`)
    );
    expectIncludes(`useMatchedRoute("/projects"): {}`);
    expectIncludes(`useMatchedRoute("/projects/:id"): {"id":"first"}`);
    expectIncludes(
      `useMatchedRoute("/projects/:id{/*previewPath}"): {"id":"first"}`
    );
    expect(history.location.pathname).toBe("/projects/first");
    expect(history.index).toBe(0);
  });

  it("does not renavigate when already at the target", async () => {
    const history = createMemoryHistory({ initialEntries: ["/start"] });
    const replaceSpy = vitest.spyOn(history, "replace");
    render(
      <HistoryProvider history={history}>
        <Redirect to="/start" />
      </HistoryProvider>
    );
    await act(() => Promise.resolve());
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});

describe("RedirectAsync", () => {
  it("redirects via an async function target", async () => {
    const { history } = renderAt(
      "/start",
      <RedirectAsync to={async () => "/next"} />
    );
    await waitFor(() => expect(history.location.pathname).toBe("/next"));
    expect(history.index).toBe(0);
  });

  it("ignores a rerender with a different async function", async () => {
    let resolveFirst!: (url: string) => void;
    const first = vitest.fn(
      () => new Promise<string>((resolve) => (resolveFirst = resolve))
    );
    const second = vitest.fn(async () => "/second");
    const { history, rerender } = renderAt(
      "/start",
      <RedirectAsync to={first} />
    );
    rerender(<RedirectAsync to={second} />);
    await act(async () => resolveFirst("/first"));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(history.location.pathname).toBe("/first");
  });

  it("cancels an async redirect when unmounted before it resolves", async () => {
    let resolveTo!: (url: string) => void;
    const pending = new Promise<string>((resolve) => (resolveTo = resolve));
    const { history, unmount } = renderAt(
      "/start",
      <RedirectAsync to={() => pending} />
    );
    unmount();
    await act(async () => resolveTo("/late"));
    expect(history.location.pathname).toBe("/start");
  });

  it("reports async target failures via handleError", async () => {
    const failure = new Error("boom");
    renderAt("/start", <RedirectAsync to={() => Promise.reject(failure)} />);
    await waitFor(() => expect(handleError).toHaveBeenCalledWith(failure));
  });
});
