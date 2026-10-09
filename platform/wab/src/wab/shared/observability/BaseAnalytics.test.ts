import { BaseAnalytics } from "@/wab/shared/observability/BaseAnalytics";

class RecordingAnalytics extends BaseAnalytics {
  doTrack = vi.fn();
}

describe("analytics event properties", () => {
  it("replaces nested base properties without changing subsequent events", () => {
    const analytics = new RecordingAnalytics();
    const context = { projectId: "base", userId: "user" };
    analytics.appendBaseEventProperties({ context, region: "us" });
    analytics.track("override", { context: { projectId: "event" } });
    analytics.track("base");
    expect(analytics.doTrack.mock.calls).toEqual([
      ["override", { context: { projectId: "event" }, region: "us" }],
      ["base", { context, region: "us" }],
    ]);
    expect(context).toEqual({ projectId: "base", userId: "user" });
  });

  it("allows events to clear a base property and preserves the sampling threshold", () => {
    const analytics = new RecordingAnalytics();
    analytics.appendBaseEventProperties({ region: "us" });
    analytics.track(
      "event",
      { region: undefined, _sampleThreshold: 0 },
      { sampleThreshold: 1 },
    );
    expect(analytics.doTrack).toHaveBeenCalledWith("event", {
      region: undefined,
      _sampleThreshold: 1,
    });
  });
});
