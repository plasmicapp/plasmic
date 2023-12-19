import * as mobx from "mobx";
import { main } from "./client/components/Shell";
// import { main } from "./client/sandboxes/GraphqlSandbox";
import "jquery";
import "jquery-serializejson";
import { dbg } from "./dbg";
import "./styles/antd-overrides.less";
import "./styles/loader.scss";
import "./styles/main.sass";

mobx.configure({
  enforceActions: "never",
});

dbg.mobx = mobx;

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
