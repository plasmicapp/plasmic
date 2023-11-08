import * as React from "react";
import { U } from "../../cli-routes";

export function PageFooter() {
  return (
    <div className={"LoginForm__Footer"}>
      <div className={"LoginForm__FooterLinks"}>
        <a href={U.privacy({})}>Privacy Policy</a>
        <a href={U.tos({})}>Terms & Conditions</a>
      </div>
      <div className={"LoginForm__FooterCopy"}>
        Copyright © {new Date().getFullYear()} Plasmic Inc. All rights reserved.
      </div>
    </div>
  );
}
