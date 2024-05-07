import { main } from "@/wab/client/components/Shell";
import * as mobx from "mobx";
// import { main } from "./client/sandboxes/GraphqlSandbox";
import { dbg } from "@/wab/dbg";
import "@/wab/styles/antd-overrides.less";
import "@/wab/styles/loader.scss";
import "@/wab/styles/main.sass";
import "jquery";
import "jquery-serializejson";

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
