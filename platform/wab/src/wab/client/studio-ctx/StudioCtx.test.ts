import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { fakeStudioCtx } from "@/wab/client/test/fake-init-ctx";
import {
  ApiTeam,
  FeatureTierId,
  StripeCustomerId,
  TeamId,
} from "@/wab/shared/ApiSchema";
import { getArenaFrames } from "@/wab/shared/Arenas";
import { Bundle } from "@/wab/shared/bundler";
import { withoutNils } from "@/wab/shared/common";
import { getDedicatedArena } from "@/wab/shared/core/sites";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { generateSiteFromBundle } from "@/wab/shared/tests/site-tests-utils";

import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";

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

describe("background arenas", () => {
  // Share the site, each test gets its own StudioCtx.
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);

  function setup() {
    const { studioCtx } = fakeStudioCtx({
      site,
      devFlagOverrides: { noObserve: true },
    });
    const arenas = withoutNils(
      site.components.map((c) => getDedicatedArena(site, c))
    );
    return { studioCtx, arenas };
  }

  it("ensureArenaAliveInBackground marks the arena alive without changing currentArena or focus", () => {
    const { studioCtx, arenas } = setup();
    const arena = arenas[0];
    const prevArena = studioCtx.currentArena;
    const prevFocused = studioCtx.focusedViewCtx();

    studioCtx.ensureArenaAliveInBackground(arena);

    expect(studioCtx.getArenaStatus(arena)).toBe("background");
    expect(studioCtx.currentArena).toBe(prevArena);
    expect(studioCtx.focusedViewCtx()).toBe(prevFocused);
  });

  // A class instance, not an object literal, to avoid mobx converting everything to observable
  class FakeViewCtx {
    isDisposed = false;
    constructor(
      readonly component: unknown,
      private readonly frame?: unknown
    ) {}
    arenaFrame() {
      return this.frame;
    }
    dispose() {
      this.isDisposed = true;
    }
  }

  it("tryGetLiveViewCtxForComponent finds a live ViewCtx in a non-current arena", () => {
    const { studioCtx } = setup();
    const comp = site.components.find((c) => getDedicatedArena(site, c))!;
    const fakeVc = new FakeViewCtx(comp) as unknown as ViewCtx;
    studioCtx.viewCtxs.push(fakeVc);

    expect(studioCtx.tryGetLiveViewCtxForComponent(comp)).toBe(fakeVc);
  });

  it("withBackgroundViewCtxForComponent runs the callback with a reused live ViewCtx", async () => {
    const { studioCtx } = setup();
    const comp = site.components.find((c) => getDedicatedArena(site, c))!;
    const arena = getDedicatedArena(site, comp)!;
    const fakeVc = new FakeViewCtx(
      comp,
      getArenaFrames(arena)[0]
    ) as unknown as ViewCtx;
    studioCtx.viewCtxs.push(fakeVc);

    const received = await studioCtx.withBackgroundViewCtxForComponent(
      comp,
      async (vc) => vc
    );
    expect(received).toBe(fakeVc);
  });

  it("garbage collects background arenas before user-visited ones", () => {
    const { studioCtx, arenas } = setup();
    const [userArena, bgArena] = arenas;
    expect(userArena).not.toBe(bgArena);

    // user visited userArena at some point. The background arena was touched
    // just now, but still needs to be evicted first.
    (studioCtx as any).arenaViewStates.set(userArena, {
      isAlive: true,
      lastAccess: 1,
      lastViewSnapshot: undefined,
    });
    studioCtx.ensureArenaAliveInBackground(bgArena);

    const savedLiveArenas = DEVFLAGS.liveArenas;
    try {
      DEVFLAGS.liveArenas = 1;
      (studioCtx as any).maybeGarbageCollectArenas();
    } finally {
      DEVFLAGS.liveArenas = savedLiveArenas;
    }

    expect(studioCtx.getArenaStatus(bgArena)).toBe("dead");
    expect(studioCtx.getArenaStatus(userArena)).toBe("cached");
  });

  it("withBackgroundViewCtxForComponent keeps the arena alive until the callback resolves", async () => {
    const { studioCtx, arenas } = setup();
    const [userArena, bgArena] = arenas;
    const bgComp = site.components.find(
      (c) => getDedicatedArena(site, c) === bgArena
    )!;
    const fakeVc = new FakeViewCtx(
      bgComp,
      getArenaFrames(bgArena)[0]
    ) as unknown as ViewCtx;
    studioCtx.viewCtxs.push(fakeVc);

    (studioCtx as any).arenaViewStates.set(userArena, {
      isAlive: true,
      lastAccess: 1,
      lastViewSnapshot: undefined,
    });
    studioCtx.ensureArenaAliveInBackground(bgArena);

    const savedLiveArenas = DEVFLAGS.liveArenas;
    try {
      DEVFLAGS.liveArenas = 1;
      let statusDuringRead: string | undefined;
      let userStatusDuringRead: string | undefined;
      await studioCtx.withBackgroundViewCtxForComponent(bgComp, async () => {
        // A GC triggered mid-read (e.g. the user switches arenas) must not evict the arena
        // whose ViewCtx we're reading, or promote the user's arena into the victim slot.
        (studioCtx as any).maybeGarbageCollectArenas();
        statusDuringRead = studioCtx.getArenaStatus(bgArena);
        userStatusDuringRead = studioCtx.getArenaStatus(userArena);
      });
      expect(statusDuringRead).not.toBe("dead");
      expect(userStatusDuringRead).toBe("cached");
      // Once the read completes the arena is unpinned; the trailing GC evicts it.
      expect(studioCtx.getArenaStatus(bgArena)).toBe("dead");
      expect(studioCtx.getArenaStatus(userArena)).toBe("cached");
    } finally {
      DEVFLAGS.liveArenas = savedLiveArenas;
    }
  });
});
