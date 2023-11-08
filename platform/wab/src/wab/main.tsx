import * as mobx from "mobx";
import { main } from "./client/components/Shell";
// import { main } from "./client/sandboxes/GraphqlSandbox";
import * as deps from "./deps";
import "./styles/antd-overrides.less";
import "./styles/loader.scss";
import "./styles/main.sass";

declare namespace global {
  let dbg: { [name: string]: any };
}
global.dbg.deps = deps;

mobx.configure({
  enforceActions: "never",
});

(window as any).mobx = mobx;

//
// Main application code
//
main();

// TODO Not sure if we always need to export something for build system to be
// happy.
export function greet(who: /*TWZ*/ string) {
  return `Hello, ${who}`;
}
console.log(greet("Uri"));
