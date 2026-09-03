import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { _testonly } from "@/wab/client/components/sidebar-tabs/ComponentProps/CustomPropEditor";
import { fireEvent, render } from "@testing-library/react";
import React from "react";

const ValueEcho = _testonly.makeValueEcho({ React } as SubDeps);

function TextControl(props: {
  value?: string;
  updateValue: (v: string) => void;
}) {
  return (
    <input
      value={props.value ?? ""}
      onChange={(e) => props.updateValue(e.target.value)}
    />
  );
}

function renderEcho(initialValue: string) {
  const onChange = vi.fn();
  const mkProps = (value: string) => ({
    impl: TextControl as any,
    value,
    onChange,
    controlProps: {},
  });
  const utils = render(<ValueEcho {...mkProps(initialValue)} />);
  const input = utils.container.querySelector("input") as HTMLInputElement;
  return {
    input,
    onChange,
    type: (v: string) => fireEvent.change(input, { target: { value: v } }),
    setValue: (v: string) => utils.rerender(<ValueEcho {...mkProps(v)} />),
  };
}

describe("ValueEcho", () => {
  it("updates the control immediately while the write is still in flight", () => {
    const { input, onChange, type } = renderEcho("a");
    type("ab");
    expect(input.value).toBe("ab");
    expect(onChange).toHaveBeenCalledWith("ab");
  });

  it("ignores echoes of in-flight writes instead of clobbering newer input", () => {
    const { input, type, setValue } = renderEcho("a");
    type("ab");
    type("abc");
    setValue("ab");
    expect(input.value).toBe("abc");
    setValue("abc");
    expect(input.value).toBe("abc");
  });

  it("accepts external value changes", () => {
    const { input, setValue } = renderEcho("a");
    setValue("xyz");
    expect(input.value).toBe("xyz");
  });

  it("discards pending writes on an external value change", () => {
    const { input, type, setValue } = renderEcho("a");
    type("ab");
    setValue("xyz");
    expect(input.value).toBe("xyz");
  });

  it("clears writes superseded by a coalesced echo", () => {
    const { input, type, setValue } = renderEcho("a");
    type("ab");
    type("abc");
    type("abcd");
    setValue("abcd");
    expect(input.value).toBe("abcd");
    setValue("ab");
    expect(input.value).toBe("ab");
  });
});
