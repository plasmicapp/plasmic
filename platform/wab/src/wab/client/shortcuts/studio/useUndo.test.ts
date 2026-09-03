import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { act, renderHook } from "@testing-library/react";

function renderUndo(value: string) {
  return renderHook(({ initialValue }) => useUndo(initialValue), {
    initialProps: { initialValue: value },
  });
}

describe("useUndo", () => {
  it("is not dirty without edits", () => {
    const { result } = renderUndo("/page-a");
    expect(result.current.value).toBe("/page-a");
    expect(result.current.isDirty).toBe(false);
  });

  it("is dirty after an edit", () => {
    const { result } = renderUndo("/page-a");
    act(() => result.current.push("/edited"));
    expect(result.current.value).toBe("/edited");
    expect(result.current.isDirty).toBe(true);
  });

  it("is not dirty after reset", () => {
    const { result } = renderUndo("/page-a");
    act(() => result.current.push("/edited"));
    act(() => result.current.reset());
    expect(result.current.value).toBe("/page-a");
    expect(result.current.isDirty).toBe(false);
  });

  it("is not dirty when the initial value changes underneath an edited draft", () => {
    // Editors reset in an effect, which doesn't run until after the blur that
    // follows switching to another page/tpl.
    const { result, rerender } = renderUndo("/page-a");
    act(() => result.current.push("/edited"));
    rerender({ initialValue: "/page-b" });
    expect(result.current.isDirty).toBe(false);
  });

  it("is dirty again after editing against the new initial value", () => {
    const { result, rerender } = renderUndo("/page-a");
    act(() => result.current.push("/edited"));
    rerender({ initialValue: "/page-b" });
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.push("/page-b-edited"));
    expect(result.current.value).toBe("/page-b-edited");
    expect(result.current.isDirty).toBe(true);
  });
});
