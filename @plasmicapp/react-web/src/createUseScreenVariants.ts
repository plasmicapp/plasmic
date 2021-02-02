import * as React from "react";
import ReactDOM from "react-dom";

type Queries = { [name: string]: string };

const listeners: Array<() => void> = [];
const queries: Queries = {};

function matchScreenVariants() {
  if (!globalThis.matchMedia) {
    return [];
  }
  return Object.entries(queries)
    .filter(([, query]) => globalThis.matchMedia(query).matches)
    .map(([name]) => name);
}

let curScreenVariant: string[] = [];

function calculateScreenVariant() {
  const screenVariant = matchScreenVariants();
  if (screenVariant !== curScreenVariant) {
    curScreenVariant = screenVariant;
    ReactDOM.unstable_batchedUpdates(() =>
      listeners.forEach((listener) => listener())
    );
  }
}

if (globalThis.addEventListener) {
  globalThis.addEventListener("resize", calculateScreenVariant);
}

export default function createUseScreenVariants(
  isMulti: boolean,
  screenQueries: Queries
) {
  Object.assign(queries, screenQueries);
  calculateScreenVariant();

  return function () {
    const [, updateState] = React.useState<{}>();

    React.useEffect(() => {
      const forceUpdate = () => updateState({});
      listeners.push(forceUpdate);
      return () => {
        listeners.splice(listeners.indexOf(forceUpdate), 1);
      };
    }, []);
    return isMulti
      ? curScreenVariant
      : curScreenVariant[curScreenVariant.length - 1];
  };
}
