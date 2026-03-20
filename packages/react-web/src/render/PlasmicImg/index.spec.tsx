import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlasmicImg } from "./index";

describe("PlasmicImg", () => {
  const src = {
    src: "https://img.plasmic.app/img-optimizer/v1/img/example.jpg",
    fullWidth: 1200,
    fullHeight: 800,
  };

  it("passes quality through to optimized image URLs", () => {
    const markup = renderToStaticMarkup(
      <PlasmicImg src={src} loader="plasmic" quality={42} />
    );
    expect(markup).toEqual(
      `<div class="__wab_img-wrapper" style="width:auto;height:auto"><img alt="" aria-hidden="true" class="__wab_img-spacer-svg" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI4MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmVyc2lvbj0iMS4xIi8+"/><picture class="__wab_picture"><source type="image/webp" srcSet="https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=640&amp;q=42&amp;f=webp 640w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=750&amp;q=42&amp;f=webp 750w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=828&amp;q=42&amp;f=webp 828w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;q=42&amp;f=webp 1080w"/><img loading="lazy" class="__wab_img" decoding="async" src="https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;q=42" srcSet="https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=640&amp;q=42 640w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=750&amp;q=42 750w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=828&amp;q=42 828w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;q=42 1080w" sizes="100vw" style="width:0;height:0"/></picture></div>`
    );
  });

  it("uses an explicit format for optimized image URLs", () => {
    const markup = renderToStaticMarkup(
      <PlasmicImg src={src} loader="plasmic" format="png" />
    );
    expect(markup).toEqual(
      `<div class="__wab_img-wrapper" style="width:auto;height:auto"><img alt="" aria-hidden="true" class="__wab_img-spacer-svg" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI4MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmVyc2lvbj0iMS4xIi8+"/><picture class="__wab_picture"><img loading="lazy" class="__wab_img" decoding="async" src="https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;q=75&amp;f=png" srcSet="https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=640&amp;q=75&amp;f=png 640w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=750&amp;q=75&amp;f=png 750w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;w=828&amp;q=75&amp;f=png 828w, https://img.plasmic.app/img-optimizer/v1/img?src=https%3A%2F%2Fimg.plasmic.app%2Fimg-optimizer%2Fv1%2Fimg%2Fexample.jpg&amp;q=75&amp;f=png 1080w" sizes="100vw" style="width:0;height:0"/></picture></div>`
    );
  });
});
