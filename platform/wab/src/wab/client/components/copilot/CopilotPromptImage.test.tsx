import { CopilotPromptImage } from "@/wab/client/components/copilot/CopilotPromptImage";
import type { CopilotImage } from "@/wab/shared/ApiSchema";
import * as dataUrls from "@/wab/shared/data-urls";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";

// Isolate the preview logic from the generated layout and lazy image loader.
vi.mock(
  "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotPromptImage",
  () => ({
    PlasmicCopilotPromptImage: ({
      overrides,
      button,
    }: {
      overrides: { img: { src: string } };
      button: { onClick: () => void };
    }) => (
      <div>
        <img alt="Attachment" {...overrides.img} />
        <button onClick={button.onClick}>Remove attachment</button>
      </div>
    ),
  }),
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("reuses the preview on rerender and updates it when the image changes", () => {
  const convert = vi.spyOn(dataUrls, "asDataUrl");
  const image: CopilotImage = { type: "png", base64: "AAH/gA==" };
  const view = render(<CopilotPromptImage image={image} onDelete={vi.fn()} />);
  const preview = screen.getByRole("img");
  expect(preview.getAttribute("src")).toBe("data:image/png;base64,AAH/gA==");
  expect(convert).toHaveBeenCalledTimes(1);

  // Dialog edits supply a new delete callback but retain the attachment.
  const onDelete = vi.fn();
  view.rerender(<CopilotPromptImage image={image} onDelete={onDelete} />);
  expect(screen.getByRole("img")).toBe(preview);
  expect(convert).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button"));
  expect(onDelete).toHaveBeenCalledTimes(1);

  view.rerender(
    <CopilotPromptImage
      image={{ ...image, type: "jpeg" }}
      onDelete={onDelete}
    />,
  );
  expect(screen.getByRole("img").getAttribute("src")).toBe(
    "data:image/jpeg;base64,AAH/gA==",
  );
  expect(convert).toHaveBeenCalledTimes(2);

  view.rerender(
    <CopilotPromptImage
      image={{ type: "jpeg", base64: "AgME" }}
      onDelete={onDelete}
    />,
  );
  expect(screen.getByRole("img").getAttribute("src")).toBe(
    "data:image/jpeg;base64,AgME",
  );
  expect(convert).toHaveBeenCalledTimes(3);
});
