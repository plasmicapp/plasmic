import { readUploadedFileAsDataUrl } from "@/wab/client/dom-utils";
import {
  CopilotImage,
  CopilotImageType,
  copilotImageTypes,
} from "@/wab/shared/ApiSchema";
import { parseDataUrl } from "@/wab/shared/data-urls";
import * as React from "react";

export interface UseCopilotImageUploadProps {
  onUpload: (image: CopilotImage) => void;
  onUploadError?: (file: File, error: Error) => void;
}

export interface UseCopilotImageUpload {
  /** Hidden input element you need to render somewhere. */
  fileInput: React.ReactElement;
  isUploading: boolean;
  openFilePicker: () => void;
}

/** Hook to headlessly handle image uploads. */
export function useCopilotImageUpload({
  onUpload,
  onUploadError,
}: UseCopilotImageUploadProps): UseCopilotImageUpload {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pendingReads, setPendingReads] = React.useState(0);

  const fileInput = (
    <input
      ref={inputRef}
      hidden
      type="file"
      multiple
      accept={copilotImageTypes.map((t) => `.${t}`).join(",")}
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);

        for (const file of files) {
          setPendingReads((n) => n + 1);
          readCopilotImage(file)
            .then(
              (image) => onUpload(image),
              (err) =>
                onUploadError?.(
                  file,
                  err instanceof Error ? err : new Error(String(err))
                )
            )
            .finally(() => setPendingReads((n) => n - 1));
        }

        // Clear hidden input's value since it should be stateless.
        e.target.value = "";
      }}
    />
  );

  return {
    fileInput,
    isUploading: pendingReads > 0,
    openFilePicker: () => inputRef.current?.click(),
  };
}

async function readCopilotImage(file: File): Promise<CopilotImage> {
  const dataUrl = parseDataUrl(await readUploadedFileAsDataUrl(file));
  if (!dataUrl) {
    throw new Error("Could not read file");
  }
  const type = toCopilotImageType(dataUrl.contentType);
  if (!type) {
    throw new Error(`Unsupported image type ${dataUrl.contentType}`);
  }
  return { type, base64: dataUrl.data };
}

function toCopilotImageType(mediaType: string): CopilotImageType | undefined {
  const [kind, subtype] = mediaType.split("/");
  return kind === "image"
    ? copilotImageTypes.find((t) => t === subtype)
    : undefined;
}
