import React, { useMemo } from "react";
import { ReactQuillProps } from "react-quill";
import { Registerable, registerComponentHelper } from "./utils";
import { PropType } from "@plasmicapp/host";
import { useIsClient } from "./useIsClient";
const ReactQuill =
  typeof window !== "undefined" ? require("react-quill") : null;


type ToolbarOptionsType = "textStyle" | "script" | "fontFamily" | "heading" | "fontSizes" | "colors" | "formatting" | "inputTypes";

const TEXT_STYLE_DICT = {
  "bold": "bold",
  "italic": "italic",
  "underline": "underline",
  "strikethrough": "strike",
}

const HEADING_TYPES_DICT = {
  "Heading 1": 1,
  "Heading 2": 2,
  "Heading 3": 3,
  "Heading 4": 4,
  "Heading 5": 5,
  "Heading 6": 6,
  "Body": "normal",
}

const FONT_SIZES = [
  "small",
  "medium",
  "large",
  "huge",
];

const COLOR_TYPE_DICT = {
  "text color": "color",
  "text background": "background"
}

const FORMATTING_TYPES_DICT = {
  "alignment": "align",
  "list": "list",
  "indentation": "indent",
  "text direction": "direction",
  "clear formatting": "clean"
};

const INPUT_TYPES = [
  "link","blockquote","image","video","code-block","formula"
]

export function Quill(props: ReactQuillProps & {
  containerClassName: string;
  customToolbar: any[];
  toolbar: Record<ToolbarOptionsType, any>;
}) {
  const isClient = useIsClient();
  
  const {containerClassName, toolbar, customToolbar, ...rest} = props;

  const modules = useMemo(() => {

    if (customToolbar) {
      return {
        toolbar: customToolbar,
      }
    }

    const {
      textStyle,
      fontFamily,
      heading,
      fontSizes,
      colors,
      script,
      formatting,
      inputTypes,
    } = toolbar;
  
    const textStyleControls = Object.keys(TEXT_STYLE_DICT)
      .filter(key => textStyle.includes(key))
      .map((key) => TEXT_STYLE_DICT[key as keyof typeof TEXT_STYLE_DICT]);
  
    const colorControls = Object.keys(COLOR_TYPE_DICT)
      .filter(key => colors.includes(key))
      .map((key) => ({ [COLOR_TYPE_DICT[key as keyof typeof COLOR_TYPE_DICT]]: [] }));
  
    const scriptControls = script 
    ? [{ 'script': 'super'}, { 'script': 'sub'}] : undefined;
  
    const fontControls = [
      fontFamily ?{font: []} : undefined,
      heading.length
        ? {
            header: Object.keys(HEADING_TYPES_DICT)
              .filter(key => heading.includes(key))
              .map((key) => HEADING_TYPES_DICT[key as keyof typeof HEADING_TYPES_DICT])}
        : undefined,
      fontSizes.length
        ? {size: FONT_SIZES.filter(fs => fontSizes.includes(fs))}
        : undefined,
    ].filter(i => i);
  
    const listControlsGroup: any[] = [];
    const indentationControlsGroup: any[] = [];
    const otherFormattingControlsGroup: any[] = [];
  
    formatting?.map((f: keyof typeof FORMATTING_TYPES_DICT) => {
      switch(f) {
        case "list":
          listControlsGroup.push({  [FORMATTING_TYPES_DICT["list"]]: 'ordered'});
          listControlsGroup.push({  [FORMATTING_TYPES_DICT["list"]]: 'bullet' });
          break;
        case "alignment":
          otherFormattingControlsGroup.push({ [FORMATTING_TYPES_DICT["alignment"]]: []});
          break;
          case "indentation":
            indentationControlsGroup.push({ [FORMATTING_TYPES_DICT["indentation"]]: '-1'});
            indentationControlsGroup.push({ [FORMATTING_TYPES_DICT["indentation"]]: '+1'});
          break;
        case "text direction":
          otherFormattingControlsGroup.push({ [FORMATTING_TYPES_DICT["text direction"]]: 'rtl' });
          break;
        case "clear formatting":
          otherFormattingControlsGroup.push(FORMATTING_TYPES_DICT["clear formatting"]);
          break;
      }
    });
  
    const otherInputControls = inputTypes.length ? INPUT_TYPES.filter(inp => inputTypes.includes(inp)) : undefined;
  
    return {
      toolbar: [
        textStyleControls,
        colorControls,
        scriptControls,
        fontControls,
        listControlsGroup,
        indentationControlsGroup,
        otherFormattingControlsGroup,
        otherInputControls,
      ].filter(i => i?.length)
    }
  }, [toolbar, customToolbar]);

  const key = useMemo(() => JSON.stringify(modules) + String(rest.preserveWhitespace), [rest.preserveWhitespace, modules]);

  if (!isClient) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <ReactQuill 
        key={key} 
        modules={modules}
        {...rest}
      />
    </div>
  )
}

const quillHelpers_ = {
  states: {
    value: {
      onChangeArgsToValue: ((content, _delta, _source, _editor) => {
        return content;
      }) as ReactQuillProps["onChange"],
    }
  }
}

const toolbarFields: Record<ToolbarOptionsType, PropType<any>> = {
  textStyle: {
    type: "choice",
    multiSelect: true,
    options: Object.keys(TEXT_STYLE_DICT),
    defaultValue: Object.keys(TEXT_STYLE_DICT)
  },
  colors: {
    type: "choice",
    multiSelect: true,
    options: Object.keys(COLOR_TYPE_DICT),
    defaultValue: Object.keys(COLOR_TYPE_DICT),
  },
  script: {
    displayName: "Super/Sub Script",
    type: "boolean",
    defaultValue: true,
  },
  fontFamily: {
    type: "boolean",
    defaultValue: true,
  },
  heading: {
    type: "choice",
    multiSelect: true,
    options: Object.keys(HEADING_TYPES_DICT),
    defaultValue: Object.keys(HEADING_TYPES_DICT),
  },
  fontSizes: {
    type: "choice",
    multiSelect: true,
    options: FONT_SIZES,
    defaultValue: FONT_SIZES,
  },
  formatting: {
    type: "choice",
    multiSelect: true,
    options: Object.keys(FORMATTING_TYPES_DICT),
    defaultValue: Object.keys(FORMATTING_TYPES_DICT),
  },
  inputTypes: {
    type: "choice",
    multiSelect: true,
    options:INPUT_TYPES,
    defaultValue:INPUT_TYPES,
  },
} as const;

const importName = "ReactQuill";

export function registerQuill(loader?: Registerable) {
  registerComponentHelper(loader, Quill, {
    name: "hostless-react-quill",
    displayName: "Rich Text Editor",
    classNameProp: "containerClassName",
    defaultStyles: {
      width: "stretch"
    },
    props: {
      value: {
        type: "string",
        displayName: "HTML Value",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description: "Contents of the editor",
      },
      toolbar: {
        type: "object",
        fields: {...toolbarFields}, 
        defaultValue: Object.keys(toolbarFields)
          .reduce((acc: any, key) => {
            acc[key] = (toolbarFields[key as keyof typeof toolbarFields] as any).defaultValue;
            return acc;
          }, {}),
        description: "Customize the toolbar to show/hide controls",
      },
      customToolbar: {
        type: "array",
        advanced: true,
        description: "Custom toolbar configuration for Quill editor. Overrides the existing toolbar."
      },
      placeholder: "string",
      preserveWhitespace: {
        type: "boolean",
        description: "Prevents Quill from collapsing continuous whitespaces on paste",
        advanced: true,  
        defaultValue: true,
      },
      readOnly: {
        type: "boolean",
        description: "Prevents user from changing the contents of the editor",
        defaultValue: false,
        advanced: true,
      },
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "content",
            type: "string",
          },
          {
            name: "delta",
            type: "object",
          },
          {
            name: "source",
            type: "string"
          },
          {
            name: "editor",
            type: "object"
          }
        ],
      },
      onChangeSelection: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "range",
            type: "object",
          },
          {
            name: "source",
            type: "string"
          },
          {
            name: "editor",
            type: "object"
          }
        ],
      },
      onFocus: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "range",
            type: "object",
          },
          {
            name: "source",
            type: "string"
          },
          {
            name: "editor",
            type: "object"
          }
        ],
      },
      onBlur: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "previousRange",
            type: "object",
          },
          {
            name: "source",
            type: "string"
          },
          {
            name: "editor",
            type: "object"
          }
        ],
      },
      onKeyPress: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "event",
            type: "object",
          }
        ],
      },
      onKeyDown: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "event",
            type: "object",
          }
        ],
      },
      onKeyUp: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          {
            name: "event",
            type: "object",
          }
        ],
      },
    } as any,
    states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "text",
          // initVal: "",
          ...quillHelpers_.states.value,
        },
    },
    componentHelpers: {
      helpers: quillHelpers_,
      importName,
      importPath: "@plasmicpkgs/react-quill",
    },
    importName,
    importPath: "@plasmicpkgs/react-quill",
  });
}