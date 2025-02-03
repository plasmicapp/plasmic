import { createSupabaseClient } from "@/util/supabase/component";
import { usePlasmicCanvasContext } from "@plasmicapp/loader-nextjs";
import React from "react";

export interface RedirectIfProps {
  children?: any;
  className?: string;
  leftExpression?: string;
  operator?: any;
  redirectUrl?: string;
  rightExpression?: string;
  testCondition?: boolean;
  forcePreview?: boolean;
}

export function RedirectIf(props: RedirectIfProps) {
  const {
    children,
    className,
    leftExpression,
    operator,
    redirectUrl,
    rightExpression,
    testCondition,
    forcePreview,
  } = props;
  const supabase = createSupabaseClient();

  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [condition, setCondition] = React.useState<boolean>(false);
  const ref = React.createRef<HTMLAnchorElement>();
  const inEditor = usePlasmicCanvasContext();

  // Reset the condition if expressions change
  React.useEffect(() => {
    setCondition(false);
  }, [leftExpression, rightExpression, operator, children]);

  // Give time for auth to complete
  setTimeout(() => {
    setLoaded(true);
  }, 500);

  // Check if signed out
  React.useEffect(() => {
    supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") setCondition(false);
    });
  }, []);

  const shouldRedirect = React.useCallback(
    () => (inEditor && testCondition !== undefined ? testCondition : condition),
    [inEditor, testCondition, condition]
  );

  // Perform redirect
  React.useEffect(() => {
    if (shouldRedirect() && loaded && !inEditor) {
      ref.current?.click();
    }
  }, [loaded, condition, ref, inEditor, testCondition, shouldRedirect]);

  // Validation
  if (!leftExpression) {
    return <p>You need to set the leftExpression prop</p>;
  } else if (!operator) {
    return <p>You need to set the operator prop</p>;
  } else if (operator !== "FALSY" && operator !== "TRUTHY") {
    return <p>You need to set the rightExpression prop</p>;
  } else if (!redirectUrl) {
    return <p>You need to set the redirectUrl prop</p>;
  }

  // Set the condition
  const leftVal = leftExpression;
  if (!condition) {
    if (operator === "FALSY" && !leftVal) {
      setCondition(true);
    } else if (operator === "TRUTHY") {
      if (!!leftVal) {
        setCondition(true);
      }
      const rightVal = rightExpression ?? "";
      if (leftVal === rightVal) {
        setCondition(true);
      }
    }
  }

  if (!loaded) {
    return null;
  }

  const showChildren = !shouldRedirect() || (inEditor && forcePreview);

  return (
    <div className={className}>
      {showChildren && children}
      <a href={redirectUrl} hidden={true} ref={ref} />
    </div>
  );
}
