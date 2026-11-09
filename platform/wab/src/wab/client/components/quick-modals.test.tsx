import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { act, fireEvent, screen } from "@testing-library/react";
import React from "react";

// These widgets are unrelated to the imperative root lifecycle under test.
vi.mock("@/wab/client/components/widgets/Button", () => ({
  default: () => null,
}));
vi.mock("@/wab/client/components/widgets/Textbox", () => ({
  default: () => null,
}));
vi.mock("@/wab/client/components/widgets/Modal", () => ({ Modal: () => null }));

describe("showTemporaryPrompt", () => {
  it("unmounts a submitted prompt, runs cleanup, and tolerates repeated dismissal", async () => {
    const cleanup = vi.fn();
    let cancel = vi.fn();
    function Prompt({ submit }: { submit: () => void }) {
      React.useEffect(() => cleanup, []);
      return <button onClick={submit}>Submit prompt</button>;
    }
    const originalChildren = Array.from(document.body.children);
    let result: Promise<string | undefined> | undefined;
    act(() => {
      result = showTemporaryPrompt<string>((submit, onCancel) => {
        cancel = vi.fn(onCancel);
        return <Prompt submit={() => submit("answer")} />;
      });
    });
    fireEvent.click(screen.getByText("Submit prompt"));
    await expect(result).resolves.toBe("answer");
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(Array.from(document.body.children)).toEqual(originalChildren);
    act(() => {
      cancel();
    });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("can cancel a prompt before its initial render commits", async () => {
    const originalChildren = Array.from(document.body.children);
    let cancel = vi.fn();
    let result: Promise<unknown> | undefined;
    act(() => {
      result = showTemporaryPrompt((_, onCancel) => {
        cancel = vi.fn(onCancel);
        return <div>Cancelled prompt</div>;
      });
      cancel();
      cancel();
    });
    await expect(result).resolves.toBeUndefined();
    expect(screen.queryByText("Cancelled prompt")).toBeNull();
    expect(Array.from(document.body.children)).toEqual(originalChildren);
  });
});
