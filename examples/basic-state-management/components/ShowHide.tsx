import React, {
  cloneElement,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
} from "react";

export interface ShowHideState {
  shown: boolean;
  setShown: (shown: boolean) => void;
}

export const ShowHideContext = createContext<ShowHideState>({
  shown: true,
  setShown: () => {},
});

export interface ShowHideButtonProps {
  children?: ReactNode;
}

export function ShowHideAction({ children, ...props }: ShowHideButtonProps) {
  const ctx = useContext(ShowHideContext);
  return cloneElement(React.Children.toArray(children)[0] as ReactElement, {
    onClick: () => {
      ctx.setShown(!ctx.shown);
    },
  });
}

export interface ShowHideContentProps {
  children?: ReactNode;
}

export function ShowHideContent({ children }: ShowHideContentProps) {
  const ctx = useContext(ShowHideContext);
  return <>{ctx.shown ? children : null}</>;
}
