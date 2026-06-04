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

    assert(result.result === "success", "expected success result");
    expect(site.animationSequences.length).toEqual(before + 1);
    expect(result.animation.name).toEqual("fadeIn");
    expect(result.animation.keyframes.length).toEqual(2);
    expect(result.animation.keyframes[0].percentage).toEqual(0);
    expect(result.animation.keyframes[0].rs.values).toEqual({ opacity: "0" });
    expect(result.animation.keyframes[1].percentage).toEqual(100);
    expect(result.animation.keyframes[1].rs.values).toEqual({ opacity: "1" });
  });

  it("supports from/to selector syntax", () => {
    const { site } = setup();
    const result = upsertAnimation({
      site,
      keyframesRule:
        "@keyframes slide { from { transform: translateX(0) } to { transform: translateX(100px) } }",
    });
    assert(result.result === "success", "expected success result");
    expect(result.animation.name).toEqual("slide");
    expect(result.animation.keyframes[0].percentage).toEqual(0);
    expect(result.animation.keyframes[1].percentage).toEqual(100);
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
    assert(
      first.result === "success" && second.result === "success",
      "expected both to succeed"
    );

    // Same object, same uuid, only one entry in site.animationSequences
    expect(second.animation).toBe(first.animation);
    expect(second.animation.uuid).toEqual(first.animation.uuid);
    expect(site.animationSequences.length).toEqual(1);

    // Keyframes were replaced with the second rule's values
    expect(first.animation.keyframes[0].rs.values).toEqual({ opacity: "0.5" });
    expect(first.animation.keyframes[1].rs.values).toEqual({ opacity: "0.9" });
  });

  it("errors when the CSS contains no @keyframes rule", () => {
    const { site } = setup();
    const before = site.animationSequences.length;

    const result = upsertAnimation({
      site,
      keyframesRule: "0% { opacity: 0 } 100% { opacity: 1 }",
    });

    expect(result.result).toEqual("error");
    // No orphan animation created on parse failure
    expect(site.animationSequences.length).toEqual(before);
  });
});
