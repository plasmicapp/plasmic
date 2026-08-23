import { HistoryProvider } from "@/wab/client/route/HistoryProvider";
import { useBeforeNavigation } from "@/wab/client/route/useBeforeNavigation";
import { act, render } from "@testing-library/react";
import { History, createMemoryHistory } from "history";
import * as React from "react";

function Prompter({ enabled }: { enabled: boolean }) {
  useBeforeNavigation(enabled, "sure?");
  return null;
}

function renderTree(tree: React.ReactNode, path: string): History {
  const history = createMemoryHistory({ initialEntries: [path] });
  render(<HistoryProvider history={history}>{tree}</HistoryProvider>);
  return history;
}

describe("useBeforeNavigation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not prompt when inactive", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const history = renderTree(<Prompter enabled={false} />, "/a");
    act(() => history.push("/b"));
    expect(history.location.pathname).toBe("/b");
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("blocks navigation when the user cancels", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const history = renderTree(<Prompter enabled={true} />, "/a");
    act(() => history.push("/b"));
    expect(history.location.pathname).toBe("/a");
    expect(confirmSpy).toHaveBeenCalledWith("sure?");
  });

  it("allows navigation when the user confirms", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const history = renderTree(<Prompter enabled={true} />, "/a");
    act(() => history.push("/b"));
    expect(history.location.pathname).toBe("/b");
  });

  it("prompts again for the next navigation after confirming", () => {
    // react-router useBlocker parity: proceeding does not disarm the
    // blocker while `enabled` stays true.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const history = renderTree(<Prompter enabled={true} />, "/a");
    act(() => history.push("/b"));
    expect(history.location.pathname).toBe("/b");
    confirmSpy.mockReturnValue(false);
    act(() => history.push("/c"));
    expect(history.location.pathname).toBe("/b");
    expect(confirmSpy).toHaveBeenCalledTimes(2);
  });

  it("unblocks when unmounted", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const history = createMemoryHistory({ initialEntries: ["/a"] });
    const { unmount } = render(
      <HistoryProvider history={history}>
        <Prompter enabled={true} />
      </HistoryProvider>
    );
    unmount();
    act(() => history.push("/b"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(history.location.pathname).toBe("/b");
  });
});
