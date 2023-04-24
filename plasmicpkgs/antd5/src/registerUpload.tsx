import { Upload } from "antd";
import type {
  UploadChangeParam,
  UploadFile as AntdUploadFile,
  UploadProps,
} from "antd/es/upload";
import React from "react";
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
  files: Array<UploadFile>;
  onFilesChange?: (values: Array<UploadFile>) => void;
}

export function UploadWrapper(props: ExtendedUploadProps) {
  const { files, onFilesChange, ...rest } = props;

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
      ...files,
      {
        ...metadata,
        status: "uploading",
      },
    ]);

    const reader = new FileReader();

    reader.onload = () => {
      onFilesChange?.([
        ...files.filter((f) => f.uid !== file.uid),
        {
          ...metadata,
          contents: (reader.result as string).replace(
            /^data:[^;]+;base64,/,
            ""
          ),
          status: "success",
        },
      ]);
    };

    reader.onerror = (error) => {
      onFilesChange?.([
        ...files.filter((f) => f.uid !== file.uid),
        {
          ...metadata,
          status: "error",
        },
      ]);
    };

    reader.readAsDataURL(info.file as any);
  };

  const handleRemove = (file: UploadFile) => {
    onFilesChange?.(files.filter((f) => f.uid !== file.uid));
  };

  return (
    <Upload
      {...rest}
      fileList={files}
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
  );
}

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
      files: {
        type: "object",
        displayName: "Files",
        defaultValue: [],
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
            type: "object",
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
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerUpload",
    importName: "UploadWrapper",
  });
}
