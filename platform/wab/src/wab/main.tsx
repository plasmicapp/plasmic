import { main } from "@/wab/client/components/Shell";
import { dbg } from "@/wab/dbg";
import "@/wab/styles/antd-overrides.less";
import "@/wab/styles/loader.scss";
import "@/wab/styles/main.sass";
import "jquery";
import "jquery-serializejson";
import * as mobx from "mobx";

mobx.configure({
  enforceActions: "never",
});

dbg.mobx = mobx;

//
// Main application code
//
main();
