import { absorbLinkClick } from "@/wab/client/components/canvas/studio-canvas-util";

describe("absorbLinkClick", () => {
  const onAnchorClick = vi.fn();
  const onClick = vi.fn();
  const absorb = (e: Event) => absorbLinkClick(e, onAnchorClick);

  // Same setup as the live frame: the links are absorbed in the capture phase
  // on body, before the click gets to the link's own handler.
  const clickLink = (href?: string) => {
    const link = document.createElement("a");
    if (href) {
      link.setAttribute("href", href);
    }
    const label = document.createElement("span");
    link.append(label);
    document.body.replaceChildren(link);
    link.addEventListener("click", onClick);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    label.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.addEventListener("click", absorb, true);
  });

  afterEach(() => {
    document.body.removeEventListener("click", absorb, true);
  });

  it("absorbs a click on a link to a page", () => {
    const event = clickLink("/pricing");

    expect(onAnchorClick).toHaveBeenCalledWith("/pricing");
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("absorbs a click on a link to an anchor", () => {
    const event = clickLink("#faq");

    expect(onAnchorClick).toHaveBeenCalledWith("#faq");
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('lets a click on a href="#" link through to its onClick', () => {
    const event = clickLink("#");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onAnchorClick).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores a link without a href", () => {
    const event = clickLink();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onAnchorClick).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
