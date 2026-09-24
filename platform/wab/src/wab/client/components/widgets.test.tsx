import {
  FileUploader,
  FileUploaderAccept,
} from "@/wab/client/components/widgets";
import { ensure } from "@/wab/shared/common";
import { act, fireEvent, render } from "@testing-library/react";
import React from "react";

describe("FileUploader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    // Let the shared monitor end the drag so it doesn't leak into other tests.
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  function dragFileOver(accept: FileUploaderAccept) {
    const { container } = render(
      <FileUploader accept={accept} onChange={vi.fn()} />,
    );
    const input = ensure(
      container.querySelector("input[type=file]"),
      "FileUploader renders a file input",
    );
    expect(container.querySelector(".drop-overlay")).toBeNull();

    fireEvent.dragEnter(input, { dataTransfer: { types: ["Files"] } });
    return container.querySelector(".drop-overlay--dragover");
  }

  it("shows drop feedback on routes without Studio (e.g. CMS)", () => {
    const overlay = dragFileOver("any");
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toBe("Drop file to upload");
  });

  it("names the accepted file kind in the drop feedback", () => {
    expect(dragFileOver("image")?.textContent).toBe("Drop image to upload");
  });
});
