import {
  assert,
  check,
  ensure,
  ensureArray,
  ensureHTMLElt,
  generateWith,
  reSplitAll,
  simpleWords,
  tuple,
} from "@/wab/common";
import { PropsOf } from "@/wab/commons/ComponentTypes";
import L from "lodash";
import * as React from "react";
import {
  CSSProperties,
  DetailedHTMLProps,
  ReactElement,
  SyntheticEvent,
} from "react";
import * as ReactDOM from "react-dom";

type EventBase = JQuery.EventBase;

export class Matcher {
  _query: /*TWZ*/ string;
  _typeaheadPatternGlobal: /*TWZ*/ RegExp;
  _typeaheadPatternOnce: /*TWZ*/ RegExp;
  constructor(rawQuery: string, opts: { matchMiddleOfWord?: boolean } = {}) {
    const matchMiddleOfWord = opts.matchMiddleOfWord ?? true;
    this._query = rawQuery.trim();
    const patPrefix = matchMiddleOfWord ? "" : "\\b";
    const patternStr = [...simpleWords(this._query)]
      .map((word: /*TWZ*/ string) => patPrefix + L.escapeRegExp(word))
      .join(".*");
    // We use two here since RegExps are stateful if g flag is used.
    this._typeaheadPatternGlobal = new RegExp(`${patternStr}`, "gi");
    this._typeaheadPatternOnce = new RegExp(`${patternStr}`, "i");
  }
  matches(text: /*TWZ*/ string) {
    return !this.hasQuery() || this._typeaheadPatternOnce.test(text);
  }
  hasQuery() {
    return this._query !== "";
  }
  boldSnippets(text: React.ReactNode, className?: string) {
    if (!this.hasQuery()) {
      return text;
    } else {
      const pat = this._typeaheadPatternGlobal;
      return boldSnippets(text, pat, className);
    }
  }
}

function boldSnippets(text: React.ReactNode, pat: RegExp, className?: string) {
  if (React.isValidElement(text)) {
    const newChildren = React.Children.map(text.props.children, (x) =>
      boldSnippets(x, pat)
    );
    return React.cloneElement(text, {}, ...newChildren);
  } else {
    return boldSnippetsString(`${text}`, pat, className);
  }
}

function boldSnippetsString(text: string, pat: RegExp, className?: string) {
  function* gen() {
    let i = 0;
    for (const [skipped, match] of [...reSplitAll(pat, text)]) {
      if (skipped.length > 0) {
        yield skipped;
      }
      if (match != null) {
        yield (
          <strong key={i++} {...(className && { className })}>
            {match[0]}
          </strong>
        );
      }
    }
  }
  const result = Array.from(gen());
  return result.length > 0 ? <span>{result}</span> : undefined;
}

function stripDefault(name: string) {
  const munged = name.replace(/^default/, "");
  if (munged === name) {
    return null;
  } else {
    return munged[0].toLowerCase() + munged.slice(1);
  }
}

/**
 * Explicitly requires passing in defaultProps, unfortunately.  Tried using
 *
 * https://github.com/Microsoft/TypeScript/issues/23812#issuecomment-426771485
 *
 * but that didn't work.
 */
export function uncontrollable<
  TComp extends React.ComponentType<P>,
  DP extends {},
  P extends {} = PropsOf<TComp>
>(
  ComponentClass: TComp,
  defaultProps: DP,
  propToCallbackName: { [prop: string]: string }
) {
  const CastedComponent = ComponentClass as React.ComponentType<P>;
  const newClass = class extends React.Component<P, any> {
    static defaultProps = defaultProps;
    constructor(props: P) {
      super(props);
      this.state = Object.fromEntries(
        generateWith(this, function* () {
          for (const [prop, pureProp] of [...this.getUncontrolledProps()]) {
            yield tuple(pureProp, this.props[prop]);
          }
        })
      );
    }
    getUncontrolledProps() {
      return generateWith(this, function* () {
        for (const prop in this.props) {
          const pureProp = stripDefault(prop);
          if (pureProp != null && pureProp in propToCallbackName) {
            yield tuple(prop, pureProp);
          }
        }
      });
    }
    render() {
      const props = {};
      L(this.props)
        .toPairs()
        .map(([prop, value]) => {
          const pureProp = stripDefault(prop);
          if (pureProp && pureProp in propToCallbackName) {
            props[pureProp] = this.state[pureProp];
            return (props[propToCallbackName[pureProp]] = (
              val: /*TWZ*/ boolean
            ) => {
              return this.setState(Object.fromEntries([tuple(pureProp, val)]));
            });
          } else {
            return (props[prop] = value);
          }
        })
        .value();
      // TODO need this cast due to this bug?
      // https://github.com/Microsoft/TypeScript/issues/28884
      return <CastedComponent {...(props as any)} />;
    }
  };
  return newClass;
}
export function absorb<T, This>(
  fn: (this: This, e: Event | SyntheticEvent | EventBase) => T
) {
  return function (this: This, e: Event | SyntheticEvent | EventBase) {
    e.stopPropagation();
    return fn.call(this, e);
  };
}

export function findDOMElt(x: any): Element | null {
  const res = ReactDOM.findDOMNode(x) as Element | null;
  check(!res || L.isElement(res));
  return res;
}

export function getDOMElt(x: any): Element {
  return ensure(findDOMElt(x), "Unexpected undefined DOMElt");
}

export function getHTMLElt(x: any): HTMLElement {
  return ensureHTMLElt(getDOMElt(x));
}

/**
 * This doesn't simply use ReactDOMServer.renderToStaticMarkup() because
 * that doesn't support !important.  See
 * https://github.com/facebook/react/issues/1881.
 */
export function renderStyles(props: CSSProperties) {
  return Object.entries(props)
    .map(([k, v]) => `${L.kebabCase(k)}:${v}`)
    .join(";");
}

export function replaceLink(
  props: DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >,
  makeLink: (linkText: string) => ReactElement
) {
  // Replace the [text] with a link.
  let { children, ...rest } = props;
  children = ensureArray(children);
  assert(L.isString(children[0]), "Unexpected not string children");
  const pat = /\[(.+?)\]/g;
  const match = pat.exec(children[0]);
  if (match) {
    const linkText = match[1];
    const link = makeLink(linkText);
    const before = children[0].slice(0, match.index);
    const after = children[0].slice(pat.lastIndex);
    return (
      <div {...rest}>
        {before}
        {link}
        {after}
      </div>
    );
  } else {
    return <div {...props} />;
  }
}
