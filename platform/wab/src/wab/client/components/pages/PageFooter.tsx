import * as React from "react";

export function PageFooter() {
  return (
    <div className={"LoginForm__Footer"}>
      <div className={"LoginForm__FooterLinks"}>
        <a href="https://www.plasmic.app/privacy">Privacy Policy</a>
        <a href="https://www.plasmic.app/tos">Terms & Conditions</a>
      </div>
      <div className={"LoginForm__FooterCopy"}>
        This site is protected by reCAPTCHA.
      </div>
      <div className={"LoginForm__FooterCopy"}>
        Copyright © {new Date().getFullYear()} Plasmic Inc. All rights reserved.
      </div>
    </div>
  );
}
