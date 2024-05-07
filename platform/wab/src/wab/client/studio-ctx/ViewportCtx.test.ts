import { DomActions, ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { ComponentType } from "@/wab/components";
import { Box, Pt } from "@/wab/geom";
import { TplMgr } from "@/wab/shared/TplMgr";
import { createSite, getDedicatedArena } from "@/wab/sites";
import { mock, MockProxy } from "jest-mock-extended";

jest.useFakeTimers();

const site = createSite();
const tplMgr = new TplMgr({ site });
const page = tplMgr.addComponent({
  name: "My Page",
  type: ComponentType.Page,
});
const pageArena = getDedicatedArena(site, page)!;
const emptyArena = tplMgr.addArena("Empty Arena");

describe("ViewportCtx", () => {
  let domScroll: Pt;
  let dom: MockProxy<DomActions>;
  let ctx: ViewportCtx;
  beforeEach(() => {
    domScroll = new Pt(0, 0);
    dom = mock<DomActions>();
    dom.scrollBy.mockImplementation((delta) => {
      domScroll = domScroll.plus(delta);
      setTimeout(() => ctx.setScroll(domScroll));
    });
    dom.scrollTo.mockImplementation((pt) => {
      domScroll = pt;
      setTimeout(() => ctx.setScroll(domScroll));
    });
  });
  afterEach(() => {
    jest.runAllTimers();
    expect(ctx.isTransforming()).toBe(false);
  });

  test("canvasPadding is 0 when there are no arena frames", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: null,
      initialClipperBox: Box.fromRect({
        left: 10,
        top: 10,
        width: 30,
        height: 40,
      }),
      initialClipperScroll: Pt.zero(),
    });
    expect(ctx.canvasPadding()).toEqual(new Pt(0, 0));
    expect(dom.updateCanvasPadding).toHaveBeenCalledWith(new Pt(0, 0));

    ctx.setArena(emptyArena);
    expect(ctx.canvasPadding()).toEqual(new Pt(0, 0));
    // Since the canvas padding didn't change,
    // setCanvasPadding should only have been called once.
    expect(dom.updateCanvasPadding).toHaveBeenCalledWith(new Pt(0, 0));
  });
  test("canvasPadding is 95% of clipper size and updates DOM", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
      }),
      initialClipperScroll: Pt.zero(),
    });
    expect(ctx.canvasPadding()).toEqual(new Pt(950, 475));
    expect(dom.updateCanvasPadding).toHaveBeenCalledWith(new Pt(950, 475));

    ctx.setClipperBox(
      Box.fromRect({ left: 10, top: 20, width: 200, height: 800 })
    );
    expect(ctx.canvasPadding()).toEqual(new Pt(190, 760));
    expect(dom.updateCanvasPadding).toHaveBeenCalledWith(new Pt(190, 760));
  });
  test("arenaSize scales and updates DOM", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 10,
        top: 20,
        width: 30,
        height: 40,
      }),
      initialClipperScroll: Pt.zero(),
      scrollPaddingRatio: 1,
    });

    ctx.setArenaScalerSize(new Pt(25, 15));
    expect(ctx.arenaSize()).toEqual(new Pt(25, 15));
    expect(dom.updateArenaSize).toHaveBeenCalledWith(new Pt(25, 15));

    ctx.scaleAtMidPt(2);
    expect(ctx.arenaSize()).toEqual(new Pt(50, 30));
    expect(dom.updateArenaSize).toHaveBeenCalledWith(new Pt(50, 30));
  });
  test("scrollBy updates DOM and receives setScroll callback", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
      }),
      initialClipperScroll: Pt.zero(),
      scrollPaddingRatio: 1,
    });

    ctx.scrollBy(new Pt(10, 20));
    expect(dom.scrollBy).toHaveBeenCalledWith(new Pt(10, 20), false);
    expect(ctx.isTransforming()).toBe(true);
    expect(ctx.scroll()).toEqual(new Pt(0, 0));
    jest.runAllTimers();
    expect(ctx.scroll()).toEqual(new Pt(10, 20));

    ctx.scrollBy(new Pt(-5, -1), {
      smooth: true,
    });
    expect(dom.scrollBy).toHaveBeenCalledWith(new Pt(-5, -1), true);
    expect(ctx.isTransforming()).toBe(true);
    expect(ctx.scroll()).toEqual(new Pt(10, 20));
    jest.runAllTimers();
    expect(ctx.scroll()).toEqual(new Pt(5, 19));
  });
  test("scrollTo updates DOM and receives setScroll callback", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
      }),
      initialClipperScroll: Pt.zero(),
      scrollPaddingRatio: 1,
    });

    ctx.scrollTo(new Pt(10, 20));
    expect(dom.scrollTo).toHaveBeenCalledWith(new Pt(10, 20), false);
    expect(ctx.isTransforming()).toBe(true);
    expect(ctx.scroll()).toEqual(new Pt(0, 0));
    jest.runAllTimers();
    expect(ctx.scroll()).toEqual(new Pt(10, 20));

    ctx.scrollTo(new Pt(30, 10), {
      smooth: true,
    });
    expect(dom.scrollTo).toHaveBeenCalledWith(new Pt(30, 10), true);
    expect(ctx.isTransforming()).toBe(true);
    expect(ctx.scroll()).toEqual(new Pt(10, 20));
    jest.runAllTimers();
    expect(ctx.scroll()).toEqual(new Pt(30, 10));
  });
  test("scaleAtFixedPt does math and updates DOM", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 100,
        top: 10,
        width: 500,
        height: 400,
      }),
      initialClipperScroll: Pt.zero(),
      scrollPaddingRatio: 1,
    });
    ctx.setArenaScalerSize(new Pt(400, 300));

    ctx.scaleAtFixedPt(2, new Pt(100, 200), new Pt(300, 350));
    expect(ctx.scale()).toEqual(2);
    expect(dom.updateArenaSize).toHaveBeenCalledWith(new Pt(800, 600));
    expect(dom.scaleTo).toHaveBeenCalledWith(2, false);
    // scroll = (100,10) + (500,400) - (300,350) + (100,200)*2
    expect(dom.scrollTo).toHaveBeenCalledWith(new Pt(500, 460), false);

    ctx.scaleAtFixedPt(0.5, new Pt(100, 200), new Pt(300, 350), {
      smooth: true,
    });
    expect(ctx.scale()).toEqual(0.5);
    expect(dom.updateArenaSize).toHaveBeenCalledWith(new Pt(200, 150));
    expect(dom.scaleTo).toHaveBeenCalledWith(0.5, true);
    // scroll = (100,10) + (500,400) - (300,350) + (100,200)*0.5
    expect(dom.scrollTo).toHaveBeenCalledWith(new Pt(350, 160), true);
  });
  test("scaleAtMidPt does math and updates DOM", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 100,
        top: 10,
        width: 500,
        height: 400,
      }),
      initialClipperScroll: new Pt(500, 400), // top-left of visibleScalerBox is (0,0)
      scrollPaddingRatio: 1,
    });
    ctx.setArenaScalerSize(new Pt(400, 300));

    ctx.scaleAtMidPt(2);
    // ctx.scaleAtFixedPt(2, new Pt(100,200), new Pt(300, 350));
    expect(ctx.scale()).toEqual(2);
    expect(dom.updateArenaSize).toHaveBeenCalledWith(new Pt(800, 600));
    expect(dom.scaleTo).toHaveBeenCalledWith(2, false);
    // scroll = (100,10) + (500,400) - (350,210) + (250,200)*2
    expect(dom.scrollTo).toHaveBeenCalledWith(new Pt(750, 600), false);
    jest.resetAllMocks();

    // sanity check scaleAtMidPt(2) == scaleAtFixedPt(2, (250,200), (350,210))
    // DOM should not be called again
    ctx.scaleAtFixedPt(2, new Pt(250, 200), new Pt(350, 210));
    expect(dom.updateArenaSize).not.toHaveBeenCalled();
    expect(dom.scaleTo).not.toHaveBeenCalled();
    expect(dom.scrollTo).not.toHaveBeenCalled();
  });
  test("zoomToFitScalerBox does math and updates DOM", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 100,
        top: 10,
        width: 500,
        height: 400,
      }),
      initialClipperScroll: new Pt(500, 400), // top-left of visibleScalerBox is (0,0)
      scrollPaddingRatio: 1,
    });
    ctx.setArenaScalerSize(new Pt(400, 300));

    ctx.zoomToScalerBox(
      Box.fromRect({ left: 0, top: 0, width: 400, height: 300 }),
      {
        minPadding: 50,
      }
    );
    expect(ctx.scale()).toEqual(1);
    expect(dom.updateArenaSize).toHaveBeenCalledWith(new Pt(400, 300));
    expect(dom.scaleTo).toHaveBeenCalledWith(1, false);
    expect(dom.scrollTo).toHaveBeenCalledWith(new Pt(450, 350), false);
  });
  test("scale and scroll affects visibleScalerBox", () => {
    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        top: 0,
        left: 0,
        width: 1000,
        height: 500,
      }),
      initialClipperScroll: Pt.zero(),
      scrollPaddingRatio: 1,
    });

    // We expose a "set scroll and width" method, so call scaleAtMidPt then setScroll.
    ctx.scaleAtMidPt(0.5);
    ctx.setScroll(new Pt(0, 0));
    expect(ctx.visibleScalerBox()).toEqual(
      Box.fromRect({ left: -2000, top: -1000, width: 2000, height: 1000 })
    );
    ctx.setScroll(new Pt(1000, 500));
    expect(ctx.visibleScalerBox()).toEqual(
      Box.fromRect({ left: 0, top: 0, width: 2000, height: 1000 })
    );

    ctx.scaleAtMidPt(1);
    ctx.setScroll(new Pt(0, 0));
    expect(ctx.visibleScalerBox()).toEqual(
      Box.fromRect({ left: -1000, top: -500, width: 1000, height: 500 })
    );
    ctx.setScroll(new Pt(1000, 500));
    expect(ctx.visibleScalerBox()).toEqual(
      Box.fromRect({ left: 0, top: 0, width: 1000, height: 500 })
    );

    ctx.scaleAtMidPt(2);
    ctx.setScroll(new Pt(0, 0));
    expect(ctx.visibleScalerBox()).toEqual(
      Box.fromRect({ left: -500, top: -250, width: 500, height: 250 })
    );
    ctx.setScroll(new Pt(1000, 500));
    expect(ctx.visibleScalerBox()).toEqual(
      Box.fromRect({ left: 0, top: 0, width: 500, height: 250 })
    );
  });
  test("client/scaler conversions", () => {
    const expectClientScalerPt = ({
      client,
      scaler,
    }: {
      client: Pt;
      scaler: Pt;
    }) => {
      expect(ctx.clientToScaler(client)).toEqual(scaler);
      expect(ctx.scalerToClient(scaler)).toEqual(client);
    };

    ctx = new ViewportCtx({
      dom,
      initialArena: pageArena,
      initialClipperBox: Box.fromRect({
        left: 10,
        top: 20,
        width: 30,
        height: 40,
      }),
      initialClipperScroll: Pt.zero(),
      scrollPaddingRatio: 1,
    });

    ctx.setScroll(new Pt(0, 0));
    expectClientScalerPt({ client: new Pt(0, 0), scaler: new Pt(-40, -60) });
    expectClientScalerPt({ client: new Pt(10, 20), scaler: new Pt(-30, -40) });
    expectClientScalerPt({ client: new Pt(40, 60), scaler: new Pt(0, 0) });
    expectClientScalerPt({ client: new Pt(100, 100), scaler: new Pt(60, 40) });
    ctx.setScroll(new Pt(30, 40));
    expectClientScalerPt({ client: new Pt(0, 0), scaler: new Pt(-10, -20) });
    expectClientScalerPt({ client: new Pt(10, 20), scaler: new Pt(0, 0) });
    expectClientScalerPt({ client: new Pt(40, 60), scaler: new Pt(30, 40) });
    expectClientScalerPt({ client: new Pt(100, 100), scaler: new Pt(90, 80) });

    ctx.scaleAtMidPt(2);
    ctx.setScroll(new Pt(0, 0));
    expectClientScalerPt({ client: new Pt(0, 0), scaler: new Pt(-20, -30) });
    expectClientScalerPt({ client: new Pt(10, 20), scaler: new Pt(-15, -20) });
    expectClientScalerPt({ client: new Pt(40, 60), scaler: new Pt(0, 0) });
    expectClientScalerPt({ client: new Pt(100, 100), scaler: new Pt(30, 20) });
    ctx.setScroll(new Pt(30, 40));
    expectClientScalerPt({ client: new Pt(0, 0), scaler: new Pt(-5, -10) });
    expectClientScalerPt({ client: new Pt(10, 20), scaler: new Pt(0, 0) });
    expectClientScalerPt({ client: new Pt(40, 60), scaler: new Pt(15, 20) });
    expectClientScalerPt({ client: new Pt(100, 100), scaler: new Pt(45, 40) });
  });
});
