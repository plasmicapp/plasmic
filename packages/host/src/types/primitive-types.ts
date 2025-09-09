import { CSSProperties } from "../element-types";
import { StyleSection } from "../registerComponent";
import { ContextDependentConfig } from "./shared-controls";

export interface RichBooleanCore {
  type: "boolean";
}

export interface NumberTypeBaseCore<Ctx extends any[]> {
  type: "number";
  min?: number | ContextDependentConfig<Ctx, number>;
  max?: number | ContextDependentConfig<Ctx, number>;
}

export interface PlainNumberCore<Ctx extends any[]>
  extends NumberTypeBaseCore<Ctx> {
  control?: "default";
}

export interface SliderNumberCore<Ctx extends any[]>
  extends NumberTypeBaseCore<Ctx> {
  control: "slider";
  step?: number | ContextDependentConfig<Ctx, number>;
}

export interface PlainStringCore {
  type: "string";
  control?: "default" | "large";
  isLocalizable?: boolean;
}

export interface CodeStringCore {
  type: "code";
  lang: "css" | "html" | "javascript" | "json";
}

export interface RichTextCore {
  type: "richText";
}

export interface HrefCore {
  type: "href";
}

export interface ColorCore {
  type: "color";
  /**
   * If specified, and the user picks a color token in the Studio, then
   * the value passed in as prop is a css variable reference, like
   * `var(--TOKEN_ID)`, instead of the resolved hex value of the token.
   * You should take care in using this in the proper css context --
   * the css token is only defined if you are rendering under some
   * Plasmic component in the DOM tree, which is usually the case,
   * unless you are using a React portal.
   */
  keepCssVar?: boolean;
  /**
   * Prevent tokens from being selected.
   */
  disableTokens?: boolean;
}

export interface DateStringCore {
  type: "dateString";
}

export interface DateRangeStringsCore {
  type: "dateRangeStrings";
}

export interface ClassCore {
  type: "class";
  /**
   * Additional css selectors that can change how this style should look.
   * Some examples:
   *
   * * `:hover` -- on hover
   * * `[data-something="blah"] -- when the element with this class has
   *   an html attribute "data-something=blah"
   * * :component[data-something="blah"] :self -- when the root of the
   *   component has an html attribute "data-something=blah". Note that
   *   the non-standard `:component` selector is used to select the
   *   component root, and the non-standard `:self` selector is used
   *   to select the element that this class is attached to.
   */
  selectors?: {
    /**
     * A css selector, like `:hover` or `[data-something="blah"]`.
     */
    selector: string;
    /**
     * An optional human-friendly label for the selector, so the studio user
     * knows what this selector means.
     */
    label?: string;
    /**
     * Initial styles to be applied for this selector
     */
    defaultStyles?: CSSProperties;
  }[];
  /**
   * If specified, then only shows these style sections for styling this class
   */
  styleSections?: StyleSection[];
  /**
   * Initial styles to be applied for this class
   */
  defaultStyles?: CSSProperties;
}

export interface ThemeResetClassCore {
  type: "themeResetClass";
  /**
   * Normally, theme reset class will only target Plasmic-generated tags
   * with the default tag styles. If you also want to target non-Plasmic-generated
   * tags (say, rendered by your code components, or fetched as an HTML blob
   * from somewhere), then specify `true` here.
   */
  targetAllTags?: boolean;
}

export interface CardPickerCore<Ctx extends any[]> {
  type: "cardPicker";
  modalTitle?: React.ReactNode | ContextDependentConfig<Ctx, React.ReactNode>;
  options:
    | {
        value: string;
        label?: string;
        imgUrl: string;
        footer?: React.ReactNode;
      }[]
    | ContextDependentConfig<
        Ctx,
        {
          value: string;
          label?: string;
          imgUrl: string;
          footer?: React.ReactNode;
        }[]
      >;
  showInput?: boolean | ContextDependentConfig<Ctx, boolean>;
  onSearch?: ContextDependentConfig<Ctx, ((value: string) => void) | undefined>;
}
