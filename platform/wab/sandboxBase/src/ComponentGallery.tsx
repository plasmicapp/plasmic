import React from "react";
import {
  Redirect,
  Route,
  Switch,
  useHistory,
  useRouteMatch,
} from "react-router-dom";
import { ComponentConfigurer, ComponentMeta } from "./ComponentConfigurer";
import { components } from "./ComponentMakers";

export interface ComponentItem {
  Component: React.ComponentType<any>;
  meta: ComponentMeta;
}

export default function ComponentGallery() {
  const numComponents = components.length;
  const history = useHistory();
  const match = useRouteMatch({
    path: "/:compId",
  });
  React.useEffect(() => {
    if (numComponents === 0) {
      return;
    }

    const index = match
      ? components.findIndex(
          (info) => (match?.params as any).compId === info.meta.id
        )
      : -1;
    const info = index >= 0 ? components[index] : undefined;
    if (info) {
      document.title = info.meta.name;
    }
    const handleKeydown = (e: KeyboardEvent) => {
      if (document.activeElement !== document.body) {
        return;
      }
      if (e.which === 37) {
        const prev = info
          ? components[(index - 1 + numComponents) % numComponents]
          : components[0];
        history.push(`/${prev.meta.id}`);
      } else if (e.which === 39) {
        const next = info
          ? components[(index + 1) % numComponents]
          : components[0];
        history.push(`/${next.meta.id}`);
      }
    };
    document.body.addEventListener("keydown", handleKeydown);
    return () => document.body.removeEventListener("keydown", handleKeydown);
  }, [numComponents, components, match]);

  if (numComponents === 0) {
    return (
      <div>
        Please create a component in Plasmic and update the sandbox. Note that
        Plasmic doesn't export artboards to CodeSandbox - you have to convert a
        artboard to a component to see it here.
      </div>
    );
  } else {
    return (
      <Switch>
        {components.map((compInfo) => (
          <Route key={compInfo.meta.id} path={`/${compInfo.meta.id}`}>
            <ComponentConfigurer
              Component={compInfo.Component}
              meta={compInfo.meta}
              components={components}
            />
          </Route>
        ))}
        <Redirect to={`/${components[0].meta.id}`} />
      </Switch>
    );
  }
}
