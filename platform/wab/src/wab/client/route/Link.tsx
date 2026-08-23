import { useHistory } from "@/wab/client/route/HistoryProvider";
import { createPath, Location, parsePath } from "history";
import * as React from "react";

export interface LinkProps extends Omit<React.ComponentProps<"a">, "href"> {
  to: string;
  replace?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function Link({ to, replace, onClick, target, download, ...rest }, ref) {
    const history = useHistory();
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (
        !event.defaultPrevented && // caller didn't prevent navigation
        event.button === 0 && // left click only
        (!target || target === "_self") && // same-tab navigation only
        !download && // let the browser handle downloads
        !isModifiedEvent(event) // let the browser open new tabs/windows
      ) {
        event.preventDefault();
        if (replace ?? isSameLocation(history.location, to)) {
          history.replace(to);
        } else {
          history.push(to);
        }
      }
    };
    return (
      <a
        {...rest}
        ref={ref}
        href={to}
        target={target}
        download={download}
        onClick={handleClick}
      />
    );
  }
);

function isModifiedEvent(event: React.MouseEvent): boolean {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

function isSameLocation(location: Location, to: string): boolean {
  const {
    pathname = location.pathname,
    search = "",
    hash = "",
  } = parsePath(to);
  return createPath({ pathname, search, hash }) === createPath(location);
}
