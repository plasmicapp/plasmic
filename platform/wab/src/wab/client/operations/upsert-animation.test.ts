import { upsertAnimation } from "@/wab/client/operations/upsert-animation";
import { assert } from "@/wab/shared/common";
import { createSite } from "@/wab/shared/core/sites";

describe("upsertAnimation", () => {
  function setup() {
    const site = createSite();
    return { site };
  }

  it("creates an animation, taking the name from the @keyframes identifier", () => {
    const { site } = setup();
    const before = site.animationSequences.length;

    const result = upsertAnimation({
      site,
      keyframesRule:
        "@keyframes fadeIn { 0% { opacity: 0 } 100% { opacity: 1 } }",
    });

    assert(result.isOk(), "expected success result");
    const { animation } = result.value;
    expect(site.animationSequences.length).toEqual(before + 1);
    expect(animation.name).toEqual("fadeIn");
    expect(animation.keyframes.length).toEqual(2);
    expect(animation.keyframes[0].percentage).toEqual(0);
    expect(animation.keyframes[0].rs.values).toEqual({ opacity: "0" });
    expect(animation.keyframes[1].percentage).toEqual(100);
    expect(animation.keyframes[1].rs.values).toEqual({ opacity: "1" });
  });

  it("supports from/to selector syntax", () => {
    const { site } = setup();
    const result = upsertAnimation({
      site,
      keyframesRule:
        "@keyframes slide { from { transform: translateX(0) } to { transform: translateX(100px) } }",
    });
    assert(result.isOk(), "expected success result");
    const { animation } = result.value;
    expect(animation.name).toEqual("slide");
    expect(animation.keyframes[0].percentage).toEqual(0);
    expect(animation.keyframes[1].percentage).toEqual(100);
  });

  it("upserts when the name collides: keyframes replaced, UUID preserved", () => {
    const { site } = setup();
    const first = upsertAnimation({
      site,
      keyframesRule:
        "@keyframes fadeIn { 0% { opacity: 0 } 100% { opacity: 1 } }",
    });
    const second = upsertAnimation({
      site,
      keyframesRule:
        "@keyframes fadeIn { 0% { opacity: 0.5 } 100% { opacity: 0.9 } }",
    });
    assert(first.isOk() && second.isOk(), "expected both to succeed");
    const firstAnimation = first.value.animation;
    const secondAnimation = second.value.animation;

    // Same object, same uuid, only one entry in site.animationSequences
    expect(secondAnimation).toBe(firstAnimation);
    expect(secondAnimation.uuid).toEqual(firstAnimation.uuid);
    expect(site.animationSequences.length).toEqual(1);

    // Keyframes were replaced with the second rule's values
    expect(firstAnimation.keyframes[0].rs.values).toEqual({ opacity: "0.5" });
    expect(firstAnimation.keyframes[1].rs.values).toEqual({ opacity: "0.9" });
  });

  it("imports valid keyframes and reports ignored invalid selectors as errors", () => {
    const { site } = setup();

    const result = upsertAnimation({
      site,
      keyframesRule:
        "@keyframes fade { frmo { opacity: 0 } 100% { opacity: 1 } }",
    });

    assert(result.isOk(), "expected success result");
    expect(result.value.animation.keyframes.length).toEqual(1);
    expect(result.value.errors).toEqual([
      expect.stringContaining('Ignored invalid keyframe selector "frmo"'),
    ]);
  });

  it("errors when the CSS contains no @keyframes rule", () => {
    const { site } = setup();
    const before = site.animationSequences.length;

    const result = upsertAnimation({
      site,
      keyframesRule: "0% { opacity: 0 } 100% { opacity: 1 }",
    });

    expect(result.isErr()).toBe(true);
    // No orphan animation created on parse failure
    expect(site.animationSequences.length).toEqual(before);
  });
});
