import { main } from "@/wab/client/components/Shell";
import { ensure } from "@/wab/shared/common";
import { dbg } from "@/wab/shared/dbg";
import "@/wab/styles/antd-overrides.scss";
import "@/wab/styles/loader.scss";
import "@/wab/styles/main.sass";
import * as mobx from "mobx";
import { createRoot } from "react-dom/client";

mobx.configure({
  enforceActions: "never",
});

dbg.mobx = mobx;

//
// Main application code
//
main(
  createRoot(
    ensure(document.querySelector(".app-container"), "Missing app container"),
  ),
);
