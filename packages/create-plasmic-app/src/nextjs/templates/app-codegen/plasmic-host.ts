import { makePlasmicHostPage_pages_codegen } from "../pages-codegen/plasmic-host";

export function makePlasmicHostPage_app_codegen(): string {
  return `"use client";
  
${makePlasmicHostPage_pages_codegen()}`;
}
