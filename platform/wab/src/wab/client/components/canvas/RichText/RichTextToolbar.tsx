import { CustomCssProps } from "@/wab/client/components/canvas/CanvasText";
import { TplTagElement } from "@/wab/client/components/canvas/slate";
import { tags } from "@/wab/client/components/canvas/subdeps";
import { SidebarModalProvider } from "@/wab/client/components/sidebar/SidebarModal";
import Button from "@/wab/client/components/widgets/Button";
import {
  ColorPicker,
  tryGetRealColor,
} from "@/wab/client/components/widgets/ColorPicker";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import { Icon } from "@/wab/client/components/widgets/Icon";
import Select from "@/wab/client/components/widgets/Select";
import StrikeIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Strike";
import SubscriptIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Subscript";
import SuperscriptIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__Superscript";
import {
  DefaultRichTextToolbarProps,
  PlasmicRichTextToolbar,
} from "@/wab/client/plasmic/plasmic_kit_rich_text_toolbar/PlasmicRichTextToolbar";
import BoldsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Boldsvg";
import CodesvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Codesvg";
import HeadingsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Headingsvg";
import ItalicsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Italicsvg";
import LinksvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Linksvg";
import OrderedListsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__OrderedListsvg";
import TextsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Textsvg";
import UnderlinesvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__Underlinesvg";
import UnorderedListsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__UnorderedListsvg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { EditingTextContext } from "@/wab/client/studio-ctx/view-ctx";
import { fontWeightOptions } from "@/wab/client/typography-utils";
import { PublicStyleSection } from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import { canEditStyleSection } from "@/wab/shared/ui-config-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Menu, Popover } from "antd";
import { observer } from "mobx-react";
import * as React from "react";
import { Editor, Range, Text } from "slate";

type BlockElement = {
  tag: (typeof tags)[number];
  icon: (props: any) => JSX.Element;
  label: string;
};

const blocks: BlockElement[] = [
  {
    tag: "h1",
    icon: HeadingsvgIcon,
    label: "Heading 1",
  },
  {
    tag: "h2",
    icon: HeadingsvgIcon,
    label: "Heading 2",
  },
  {
    tag: "h3",
    icon: HeadingsvgIcon,
    label: "Heading 3",
  },
  {
    tag: "h4",
    icon: HeadingsvgIcon,
    label: "Heading 4",
  },
  {
    tag: "h5",
    icon: HeadingsvgIcon,
    label: "Heading 5",
  },
  {
    tag: "h6",
    icon: HeadingsvgIcon,
    label: "Heading 6",
  },
  {
    tag: "ul",
    icon: UnorderedListsvgIcon,
    label: "Bulleted list",
  },
  {
    tag: "ol",
    icon: OrderedListsvgIcon,
    label: "Numbered list",
  },
  {
    tag: "blockquote",
    icon: TextsvgIcon,
    label: "Blockquote",
  },
  {
    tag: "pre",
    icon: CodesvgIcon,
    label: "Code",
  },
];

interface RichTextToolbarProps extends DefaultRichTextToolbarProps {
  ctx: EditingTextContext;
}

function RichTextToolbar_(
  { ctx, ...props }: RichTextToolbarProps,
  ref: HTMLElementRefOf<"div">
) {
  // This is just a wrapper to use the run() function from
  // viewCtx.editingTextContext() with no need to check if it's undefined.
  const runInEditor = (action: string, params?: any) => {
    if (ctx.run) {
      spawn(ctx.run(action, params));
    }
  };

  const markCss = (cssProps: React.CSSProperties, toggle = true) => {
    runInEditor("CUSTOM_CSS", { props: cssProps, toggle } as CustomCssProps);
  };

  // Current marks (i.e. CSS props applied to current selection).
  const [marks, setMarks] = React.useState<Omit<Text, "text">>({});
  const fontWeight = marks["font-weight"];
  const fontStyle = marks["font-style"];
  const textDecorationLine = marks["text-decoration-line"];

  // Current block tag (e.g. "h1", "ul" or undefined for no block).
  const [block, setBlock] = React.useState<(typeof tags)[number] | undefined>(
    undefined
  );

  const studioCtx = useStudioCtx();
  const resolver = useClientTokenResolver();

  const maybeRealColor = marks?.color
    ? tryGetRealColor(marks.color, studioCtx, resolver).realColor
    : undefined;

  // TODO: We default color to black, but maybe we could default it to the
  // effective color of the current TplText.
  const currentColor = maybeRealColor ?? "#000000";

  const [colorPickerVisible, setColorPickerVisible] = React.useState(false);

  React.useEffect(() => {
    const { editor } = ctx;
    if (!editor) {
      return;
    }

    // If the color picker is visible and the selection is collapsed, then
    // hide the color picker. We check if selection is collapsed because
    // otherwise we would hide the color picker when a color is picked,
    // because adding marks to an unmarked text changes the selection path.
    if (
      colorPickerVisible &&
      editor.selection &&
      Range.isCollapsed(editor.selection)
    ) {
      setColorPickerVisible(false);
    }

    // Update current block.
    const blockElement = Editor.above(editor, {
      match: (n) =>
        Editor.isBlock(editor, n) && n.type === "TplTag" && n.tag !== "li",
    })?.[0] as TplTagElement | undefined;
    setBlock(blockElement?.tag);

    // Update marks (CSS props in current selection).
    setMarks(Editor.marks(editor) || {});
  }, [ctx.editor]);

  const showBlock = canEditStyleSection(
    studioCtx.getCurrentUiConfig(),
    PublicStyleSection.Tag,
    {
      isContentCreator: studioCtx.contentEditorMode,
      defaultContentEditorVisible: false, // matches what's chosen in Sections.tsx
    }
  );

  const inlineMenuItems = [
    {
      label: "Link",
      action: "LINK",
      icon: LinksvgIcon,
    },
    {
      label: "Inline code",
      action: "CODE",
      icon: CodesvgIcon,
    },
    {
      label: "Span element",
      action: "SPAN",
      icon: TextsvgIcon,
    },
    {
      label: "Strong element",
      action: "STRONG",
      icon: BoldsvgIcon,
    },
    {
      label: "Italic element",
      action: "ITALIC",
      icon: ItalicsvgIcon,
    },
    {
      label: "Emphasis element",
      action: "EMPHASIS",
      icon: ItalicsvgIcon,
    },
    {
      label: "Subscript element",
      action: "SUBSCRIPT",
      icon: SubscriptIcon,
    },
    {
      label: "Superscript element",
      action: "SUPERSCRIPT",
      icon: SuperscriptIcon,
    },
  ].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SidebarModalProvider>
      <PlasmicRichTextToolbar
        {...props}
        root={{ ref }}
        style={{
          position: "absolute",
          top: studioCtx.focusedMode ? 60 : 12,
        }}
        hideBlock={!showBlock}
        block={{
          props: {
            "aria-label": "Block type",
            children: [
              ...blocks.map((b) => (
                <Select.Option
                  key={b.tag}
                  value={b.tag}
                  aria-label={b.label}
                  textValue={b.label}
                >
                  <Icon icon={b.icon} style={{ marginRight: 4 }} /> {b.label}
                </Select.Option>
              )),
              <Select.Option key={null} value={null} textValue={"Default"}>
                <Icon icon={TextsvgIcon} style={{ marginRight: 4 }} />
                Default
              </Select.Option>,
            ],
            onChange: (tag) => runInEditor("WRAP_BLOCK", tag),
            value: block || null,
          },
        }}
        currentColor={{
          style: {
            background: currentColor,
          },
        }}
        color={{
          wrap: (node) => (
            <Popover
              visible={colorPickerVisible}
              onVisibleChange={(visible) => {
                setColorPickerVisible(visible);
                markCss({ color: currentColor }, false);
              }}
              transitionName=""
              content={() =>
                colorPickerVisible && (
                  <div style={{ width: 250 }}>
                    <ColorPicker
                      color={currentColor}
                      onChange={(color: string) => {
                        const { editor } = ctx;
                        const oldColor = (editor ? Editor.marks(editor) : {})
                          ?.color;
                        if (oldColor !== color) {
                          markCss({ color }, false);
                        }
                      }}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Button
                        onClick={() => {
                          markCss({ color: undefined });
                          setColorPickerVisible(false);
                        }}
                      >
                        Unset color
                      </Button>
                    </div>
                  </div>
                )
              }
              trigger="click"
            >
              {node}
            </Popover>
          ),
        }}
        fontWeight={{
          props: {
            "aria-label": "Bold",
            type: fontWeight ? ["noDivider", "secondary"] : "noDivider",
            onClick: () => {
              if (fontWeight) {
                markCss({ fontWeight: undefined });
              } else {
                runInEditor("BOLD");
              }
            },
            menu: () => (
              <Menu>
                {fontWeightOptions.map((option) => (
                  <Menu.Item
                    aria-label={option.label}
                    key={option.value}
                    onClick={() =>
                      markCss({ fontWeight: `${option.value}` as any })
                    }
                  >
                    {option.value} - {option.label}
                  </Menu.Item>
                ))}
                <Menu.Item
                  aria-label="Unset"
                  onClick={() => markCss({ fontWeight: undefined })}
                >
                  Unset
                </Menu.Item>
              </Menu>
            ),
          },
        }}
        fontStyle={{
          props: {
            type: fontStyle ? "secondary" : undefined,
            onClick: () => runInEditor("ITALIC"),
          },
        }}
        textDecoration={{
          props: {
            "aria-label": "Underline",
            type: textDecorationLine ? ["noDivider", "secondary"] : "noDivider",
            onClick: () => runInEditor("UNDERLINE"),
            menu: () => (
              <Menu>
                <Menu.Item
                  key="underline"
                  aria-label="Underline"
                  onClick={() => runInEditor("UNDERLINE")}
                >
                  <Icon icon={UnderlinesvgIcon} />
                  Underline
                </Menu.Item>
                <Menu.Item
                  key="line-through"
                  aria-label="Strikethrough"
                  onClick={() => runInEditor("STRIKETHROUGH")}
                >
                  <Icon icon={StrikeIcon} /> Strikethrough
                </Menu.Item>
                <Menu.Item
                  aria-label="Unset"
                  onClick={() => markCss({ textDecorationLine: undefined })}
                >
                  Unset
                </Menu.Item>
              </Menu>
            ),
          },
        }}
        inline={{
          // TODO: Make button active if selection has link, code or span.
          props: {
            "aria-label": "Link",
            onClick: () => runInEditor("LINK"),
            menu: () => (
              <Menu>
                {inlineMenuItems.map((item) => (
                  <Menu.Item
                    key={item.action}
                    aria-label={item.label}
                    onClick={() => runInEditor(item.action)}
                  >
                    <Icon icon={item.icon} style={{ marginRight: 4 }} />
                    {item.label}
                  </Menu.Item>
                ))}
              </Menu>
            ),
          },
        }}
      />
    </SidebarModalProvider>
  );
}

const RichTextToolbar = observer(React.forwardRef(RichTextToolbar_));
export default RichTextToolbar;
