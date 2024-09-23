import { Image, Upload } from "antd";
import type {
  UploadFile as AntdUploadFile,
  UploadChangeParam,
  UploadProps,
} from "antd/es/upload";
import React, { useMemo, useRef, useState } from "react";
import { Registerable, registerComponentHelper } from "./utils";

interface UploadFile {
  uid: string;
  name: string;
  size?: number;
  type?: string;
  lastModified?: number;
  contents?: string;
  status: AntdUploadFile["status"];
}

interface ExtendedUploadProps<T = any> extends UploadProps<T> {
  files?: Array<UploadFile>;
  onFilesChange?: (values: Array<UploadFile>) => void;
  dragAndDropFiles: boolean;
}

function getThumbUrl(file?: UploadFile): string | undefined {
  if (!file?.type?.startsWith("image")) {
    return undefined;
  }
  return `data:${file.type};base64,${file.contents}`;
}

export function UploadWrapper(props: ExtendedUploadProps) {
  const { files, dragAndDropFiles, onFilesChange, maxCount, ...rest } = props;
  const filesRef = useRef<Array<UploadFile>>(); // if multiple = true, it facilitates adding multiple files

  filesRef.current = files;

  const [previewFileId, setPreviewFileId] = useState<string>();
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleChange = (info: UploadChangeParam) => {
    const { file } = info;

    if (file.status === "removed") {
      return;
    }

    const metadata = {
      uid: file.uid,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    };

    onFilesChange?.([
      ...(filesRef.current ?? []).slice(0, (maxCount || Infinity) - 1),
      {
        ...metadata,
        status: "uploading",
      },
    ]);

    const reader = new FileReader();

    reader.onload = () => {
      if (!filesRef.current?.map((f) => f.uid).includes(metadata.uid)) {
        return;
      }
      onFilesChange?.([
        ...(filesRef.current ?? []).filter((f) => f.uid !== file.uid),
        {
          ...metadata,
          contents: (reader.result as string).replace(
            /^data:[^;]+;base64,/,
            ""
          ),
          status: "done",
        },
      ]);
    };

    reader.onerror = () => {
      if (!filesRef.current?.map((f) => f.uid).includes(metadata.uid)) {
        return;
      }
      onFilesChange?.([
        ...(filesRef.current ?? []).filter((f) => f.uid !== file.uid),
        {
          ...metadata,
          status: "error",
        },
      ]);
    };

    reader.readAsDataURL(info.file as any);
  };

  const handleRemove = (file: UploadFile) => {
    onFilesChange?.((files ?? []).filter((f) => f.uid !== file.uid));
  };

  const handlePreview = async (file: AntdUploadFile) => {
    setPreviewFileId(files?.filter((f) => file.uid === f.uid)[0]?.uid);
    setPreviewOpen(true);
  };

  const handleCancel = () => setPreviewFileId(undefined);

  const previewFile = useMemo(
    () => files?.filter((f) => previewFileId === f.uid)[0],
    [files, previewFileId]
  );

  const UploadComponent = useMemo(
    () => (dragAndDropFiles ? Upload.Dragger : Upload),
    [dragAndDropFiles]
  );

  return (
    <>
      <UploadComponent
        {...rest}
        fileList={files?.map((f) => ({
          ...f,
          thumbUrl: getThumbUrl(f),
        }))}
        onPreview={handlePreview}
        beforeUpload={() => {
          return false;
        }}
        onChange={(info) => {
          handleChange(info);
        }}
        onRemove={(file) => {
          handleRemove(file as UploadFile);
        }}
      />

      {previewFile && (
        <Image
          wrapperStyle={{ display: "none" }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && handleCancel(),
          }}
          alt={previewFile?.name}
          src={getThumbUrl(previewFile)}
        />
      )}
    </>
  );
}

UploadWrapper.__plasmicFormFieldMeta = {
  valueProp: "files",
  onChangeProp: "onFilesChange",
};

export function registerUpload(loader?: Registerable) {
  registerComponentHelper(loader, UploadWrapper, {
    name: "plasmic-antd5-upload",
    displayName: "Upload",
    props: {
      accept: {
        type: "choice",
        displayName: "Allowed types",
        options: [
          {
            value: "",
            label: "Any kind of file",
          },
          {
            value: "image/*",
            label: "Image",
          },
          {
            value: "video/*",
            label: "Video",
          },
          {
            value: "audio/*",
            label: "Audio",
          },
          {
            value: "application/pdf",
            label: "PDF",
          },
        ],
        defaultValue: "",
      },
      listType: {
        type: "choice",
        options: ["text", "picture", "picture-card", "picture-circle"],
        defaultValueHint: "text",
      },
      dragAndDropFiles: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
        description:
          "You can drag files to a specific area, to upload. Alternatively, you can also upload by selecting.",
      },
      multiple: {
        type: "boolean",
        advanced: true,
        defaultValueHint: false,
        description: "Upload several files at once in modern browsers",
      },
      files: {
        type: "object",
        displayName: "Files",
        defaultValue: [],
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-button",
            props: {
              children: {
                type: "text",
                value: "Upload",
              },
            },
          },
        ],
      },
      maxCount: {
        type: "number",
        displayName: "Limit of files",
        advanced: true,
      },
      onFilesChange: {
        type: "eventHandler",
        displayName: "On file uploaded",
        argTypes: [
          {
            name: "files",
            type: "array",
          },
        ],
      },
      showUploadList: {
        type: "boolean",
        displayName: "List files",
        defaultValue: true,
      },
    },
    states: {
      files: {
        type: "writable",
        valueProp: "files",
        variableType: "array",
        onChangeProp: "onFilesChange",
        hidden: (ps: any) => !!ps.__plasmicFormField,
      },
    },
    ...({ trapsSelection: true } as any),
    importPath: "@plasmicpkgs/antd5/skinny/registerUpload",
    importName: "UploadWrapper",
  });
}
