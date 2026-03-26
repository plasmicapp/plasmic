import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import {
  ApiTeam,
  FeatureTierId,
  StripeCustomerId,
  TeamId,
} from "@/wab/shared/ApiSchema";

const TEAM_ID = "team123" as TeamId;

function mockTeam(overrides: Partial<ApiTeam>): ApiTeam {
  return {
    id: TEAM_ID,
    featureTierId: null,
    stripeCustomerId: null,
    onTrial: false,
    ...overrides,
  } as ApiTeam;
}

describe("uiCopilotEnabled", () => {
  it("returns falsy with no team", () => {
    const { studioCtx } = fakeStudioCtx();
    expect(studioCtx.uiCopilotEnabled()).toBeFalsy();
  });

  it("returns truthy when enableUiCopilot devflag is true", () => {
    const { studioCtx } = fakeStudioCtx({
      devFlagOverrides: { enableUiCopilot: true },
    });
    expect(studioCtx.uiCopilotEnabled()).toBeTruthy();
  });

  it("returns truthy for a paid team", () => {
    const team = mockTeam({
      featureTierId: "tier123" as FeatureTierId,
      stripeCustomerId: "cus_123" as StripeCustomerId,
    });
    const { studioCtx } = fakeStudioCtx({
      teams: [team],
      siteInfo: { teamId: TEAM_ID },
    });
    expect(studioCtx.uiCopilotEnabled()).toBeTruthy();
  });

  it("returns truthy for a team on trial", () => {
    const team = mockTeam({ onTrial: true });
    const { studioCtx } = fakeStudioCtx({
      teams: [team],
      siteInfo: { teamId: TEAM_ID },
    });
    expect(studioCtx.uiCopilotEnabled()).toBeTruthy();
  });

  it("returns falsy for a free team with no trial", () => {
    const team = mockTeam({});
    const { studioCtx } = fakeStudioCtx({
      teams: [team],
      siteInfo: { teamId: TEAM_ID },
    });
    expect(studioCtx.uiCopilotEnabled()).toBeFalsy();
  });
});
