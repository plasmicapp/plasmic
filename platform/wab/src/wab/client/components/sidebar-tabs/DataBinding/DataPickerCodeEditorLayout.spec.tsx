import DataPickerCodeEditorLayout from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerCodeEditorLayout";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/wab/client/studio-ctx/StudioCtx", () => ({
  useStudioCtx: () => ({ focusedViewCtx: () => undefined }),
}));
vi.mock("@/wab/client/components/coding/CodePreview", () => ({
  CodePreview: () => null,
}));
vi.mock("@/wab/client/components/coding/DataInspector", () => ({
  DataInspector: () => null,
}));
vi.mock("@/wab/client/components/coding/LazyFullCodeEditor", async () => ({
  default: (await import("react")).forwardRef(function Editor(
    props: any,
    _ref,
  ) {
    return (
      <input
        aria-label="Code"
        data-initial={props.defaultValue}
        defaultValue={props.defaultValue}
        onChange={(e) => props.onChange(e.target.value)}
      />
    );
  }),
}));
vi.mock(
  "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerCodeEditorLayout",
  () => ({
    PlasmicDataPickerCodeEditorLayout: (props: any) => (
      <>
        {props.codeEditor}
        <button
          onClick={() =>
            props.copilotCodePrompt.props.onUpdate('"replacement"')
          }
        >
          Replace
        </button>
      </>
    ),
  }),
);

it("keeps Monaco's initial value stable through drafts and replaces it for Copilot output", () => {
  function Harness() {
    const [value, setValue] = React.useState('"initial"');
    return (
      <DataPickerCodeEditorLayout
        editorRef={React.useRef(null)}
        data={{}}
        previewData={{}}
        defaultValue={value}
        onChange={setValue}
        onSave={() => true}
      />
    );
  }
  render(<Harness />);
  const editor = screen.getByLabelText("Code");
  for (const value of ["", '"', '"hello"']) {
    fireEvent.change(editor, { target: { value } });
    expect(editor.getAttribute("data-initial")).toBe('"initial"');
  }
  fireEvent.click(screen.getByText("Replace"));
  expect(screen.getByLabelText("Code").getAttribute("data-initial")).toBe(
    '"replacement"',
  );
  expect((screen.getByLabelText("Code") as HTMLInputElement).value).toBe(
    '"replacement"',
  );
});
