import { InputNumber } from "antd";
import React from "react";
import defer = setTimeout;

export function NumPropEditor(props: {
  onChange: (value?: number) => void;
  value: number | undefined;
}) {
  const ref = React.useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = React.useState<string | number | undefined>(
    props.value
  );
  const curValue = draft === undefined ? props.value : draft;

  const submitVal = (val: string | number | undefined) => {
    // The empty string is valid
    if ((!val || typeof val === "number") && val !== props.value) {
      props.onChange(typeof val === "string" ? undefined : val);
      setDraft(undefined);
    }
  };

  React.useEffect(() => {
    return () => {
      if (draft && draft !== props.value) {
        defer(() => submitVal(draft));
      }
    };
  }, []);

  // Whenever the passed in props.value changes, we unset the draft
  React.useEffect(() => {
    setDraft(undefined);
  }, [props.value]);

  return (
    <InputNumber
      className="form-control code textboxlike"
      size="small"
      placeholder="unset"
      value={typeof curValue !== "number" ? undefined : curValue}
      onChange={(val) => setDraft(val)}
      onPressEnter={() => {
        if (ref.current) {
          ref.current.blur();
        }
      }}
      onBlur={() => submitVal(draft)}
      ref={ref}
    />
  );
}

type ReactElt = {
  children: ReactElt | ReactElt[];
  props: {
    children: ReactElt | ReactElt[];
    [prop: string]: any;
  } | null;
  type: React.ComponentType<any> | null;
  key: string | null;
} | null;

/**
 * Traverses the tree of elements from a `React.createElement`. Notice we can't
 * traverse elements created within the children's render function since this is
 * the tree before rendering.
 */
export function traverseReactEltTree(
  children: React.ReactNode,
  callback: (elt: ReactElt) => void
) {
  const rec = (elts: ReactElt | ReactElt[] | null) => {
    (Array.isArray(elts) ? elts : [elts]).forEach((elt) => {
      if (elt) {
        callback(elt);
        if (elt.children) {
          rec(elt.children);
        }
        if (elt.props?.children && elt.props.children !== elt.children) {
          rec(elt.props.children);
        }
      }
    });
  };
  rec(children as any);
}
