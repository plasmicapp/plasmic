import { mockDeepAuto } from "@/wab/__testonly__/mock";
import { fakeStudioCtx } from "@/wab/client/__testonly__/fake-init-ctx";
import { createStyleTokensTool } from "@/wab/client/copilot/enterprise/tools/createStyleTokens";
import { deleteStyleTokensTool } from "@/wab/client/copilot/enterprise/tools/deleteStyleTokens";
import { navigateTool } from "@/wab/client/copilot/enterprise/tools/navigate";
import { StudioCtx, aiStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  ApiFeatureTier,
  ApiTeam,
  FeatureTierId,
  TeamId,
  UserId,
} from "@/wab/shared/ApiSchema";
import { getArenaFrames } from "@/wab/shared/Arenas";
import { generateSiteFromBundle } from "@/wab/shared/__testonly__/site-tests-utils";
import { Bundle } from "@/wab/shared/bundler";
import { withoutNils } from "@/wab/shared/common";
import { AiIdentity } from "@/wab/shared/copilot/copilot-tool-types";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ParamExportType, mkParam } from "@/wab/shared/core/lang";
import { getDedicatedArena } from "@/wab/shared/core/sites";
import { mkSlot, mkTplTag } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { typeFactory } from "@/wab/shared/model/model-util";
import { ok } from "neverthrow";

import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";

const TEAM_ID = "team123" as TeamId;

describe("model change queue failures", () => {
  it.each(["change", "changeObserved"] as const)(
    "%s rejects, rolls back, and continues processing after a thrown error",
    async (method) => {
      const { studioCtx } = fakeStudioCtx();
      try {
        const component = await studioCtx.changeUnsafe(() =>
          studioCtx.addComponent("Original", {
            type: ComponentType.Plain,
            noSwitchArena: true,
          }),
        );
        const failure = new Error("change failed");
        const change = () => {
          component.name = "Rolled back";
          throw failure;
        };
        const failed =
          method === "change"
            ? studioCtx.change(change)
            : studioCtx.changeObserved(() => [component], change);
        await expect(failed).rejects.toBe(failure);
        expect(component.name).toBe("Original");

        await expect(
          studioCtx.change(() => {
            component.name = "Recovered";
            return ok("done");
          }),
        ).resolves.toEqual(ok("done"));
        expect(component.name).toBe("Recovered");
        expect(studioCtx.hasPendingModelChanges()).toBe(false);
      } finally {
        studioCtx.dispose();
      }
    },
    5000,
  );
});

function mockTeam(overrides: Partial<ApiTeam>): ApiTeam {
  return {
    id: TEAM_ID,
    featureTierId: null,
    stripeCustomerId: null,
    onTrial: false,
    ...overrides,
  } as ApiTeam;
}

describe("chatCopilotEnabled", () => {
  function setup(team: ApiTeam) {
    return fakeStudioCtx({
      teams: [team],
      siteInfo: { teamId: TEAM_ID },
      devFlagOverrides: { enableChatCopilot: true },
    });
  }

  it("inherits an enterprise tier without a child Stripe customer", () => {
    const { studioCtx } = setup(
      mockTeam({
        parentTeamId: "parent" as TeamId,
        featureTier: { id: "enterprise" as FeatureTierId } as ApiFeatureTier,
      }),
    );
    expect(studioCtx.chatCopilotEnabled()).toBe(true);
  });

  it("allows paid plans but rejects trials and free teams", () => {
    expect(
      setup(
        mockTeam({ featureTierId: "paid" as FeatureTierId }),
      ).studioCtx.chatCopilotEnabled(),
    ).toBe(true);
    expect(
      setup(
        mockTeam({ featureTierId: "paid" as FeatureTierId, onTrial: true }),
      ).studioCtx.chatCopilotEnabled(),
    ).toBe(false);
    expect(setup(mockTeam({})).studioCtx.chatCopilotEnabled()).toBe(false);
    expect(
      setup(
        mockTeam({ featureTierId: DEVFLAGS.freeTier.id }),
      ).studioCtx.chatCopilotEnabled(),
    ).toBe(false);
  });

  it.each(["viewer", "commenter", "content", "editor"] as const)(
    "checks project access for %s",
    (accessLevel) => {
      const { studioCtx, appCtx } = setup(
        mockTeam({ featureTierId: "paid" as FeatureTierId }),
      );
      const userId = "customer" as UserId;
      appCtx.selfInfo = {
        id: userId,
        email: "customer@example.com",
      } as NonNullable<typeof appCtx.selfInfo>;
      studioCtx.siteInfo.createdById = "owner" as UserId;
      studioCtx.siteInfo.perms = [
        {
          projectId: studioCtx.siteInfo.id,
          userId,
          accessLevel,
        } as (typeof studioCtx.siteInfo.perms)[number],
      ];
      expect(studioCtx.chatCopilotEnabled()).toBe(
        accessLevel === "content" || accessLevel === "editor",
      );
    },
  );
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
      site.components.map((c) => getDedicatedArena(site, c)),
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
      private readonly frame?: unknown,
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
      getArenaFrames(arena)[0],
    ) as unknown as ViewCtx;
    studioCtx.viewCtxs.push(fakeVc);

    const received = await studioCtx.withBackgroundViewCtxForComponent(
      comp,
      async (vc) => vc,
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
      (c) => getDedicatedArena(site, c) === bgArena,
    )!;
    const fakeVc = new FakeViewCtx(
      bgComp,
      getArenaFrames(bgArena)[0],
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

describe("attachComponent", () => {
  afterEach(() => {
    delete (window as any).studioCtx;
  });

  it("observes sub components attached during a change", async () => {
    const { studioCtx } = fakeStudioCtx();
    (window as any).studioCtx = studioCtx;

    const select = mkComponent({
      name: "Select",
      tplTree: mkTplTag("div"),
      type: ComponentType.Plain,
    });
    const children = mkParam({
      name: "children",
      type: typeFactory.renderable(),
      exportType: ParamExportType.External,
      paramType: "slot",
    });
    const option = mkComponent({
      name: "Option",
      params: [children],
      tplTree: mkTplTag("div", mkSlot(children)),
      type: ComponentType.Plain,
      superComp: select,
    });

    await studioCtx.changeUnsafe(() => {
      studioCtx.tplMgr().attachComponent(select);
    });

    expect(studioCtx.site.components).toEqual(
      expect.arrayContaining([select, option]),
    );
    expect(studioCtx.observeComponents([select, option])).toBe(false);
  });
});

describe("aiStudioCtx", () => {
  const chat: AiIdentity = {
    client: "plasmic-ai",
    model: "claude-sonnet-5",
    outputFormat: "json",
  };
  const mcp: AiIdentity = {
    client: "claude-code",
    model: "claude-opus-5-5",
    outputFormat: "xml",
  };

  const brandColor = {
    tokens: [{ name: "Brand", type: "Color" as const, value: "#0a84ff" }],
  };

  function spyOnChangeOptions(studioCtx: StudioCtx) {
    // Nothing reads a change's identity in our codebase yet,
    // so we are just checking the opts each change starts with
    // to ensure the aiStudioCtx overrides are working correctly.
    const change = vi.spyOn(studioCtx, "_change");
    return () => change.mock.calls.map(([, opts]) => opts);
  }

  describe("adds the AI's identity and the description", () => {
    it("to changes the tool starts", async () => {
      const { studioCtx } = fakeStudioCtx();
      const changeOptions = spyOnChangeOptions(studioCtx);

      await createStyleTokensTool.execute(
        aiStudioCtx(studioCtx, mcp, "Create Style Tokens"),
        brandColor,
      );

      expect(changeOptions()).toEqual([
        { identity: mcp, description: "Create Style Tokens" },
      ]);
    });

    it("to changes SiteOps starts for the tool", async () => {
      const { studioCtx } = fakeStudioCtx();
      await createStyleTokensTool.execute(studioCtx, brandColor);
      const token = studioCtx.site.styleTokens.find((t) => t.name === "Brand")!;
      const changeOptions = spyOnChangeOptions(studioCtx);

      // The tool deletes through studioCtx.siteOps(), outside any change of its own.
      await deleteStyleTokensTool.execute(
        aiStudioCtx(studioCtx, mcp, "Delete Style Tokens"),
        { tokenUuids: [token.uuid] },
      );

      expect(changeOptions()).toEqual([
        { identity: mcp, description: "Delete Style Tokens" },
      ]);
    });

    it("to changes StudioCtx methods start for the tool", async () => {
      const { studioCtx } = fakeStudioCtx();
      // Leaving an arena snapshots its viewport.
      studioCtx.viewportCtx = mockDeepAuto<ViewportCtx>();
      const pricing = studioCtx.addComponent("Pricing", {
        type: ComponentType.Page,
        noSwitchArena: true,
      });
      studioCtx.addComponent("Home", { type: ComponentType.Page });
      const changeOptions = spyOnChangeOptions(studioCtx);

      // getViewCtxForComponent switches the arena with its own this.change().
      await navigateTool.execute(aiStudioCtx(studioCtx, mcp, "Navigate"), {
        componentUuid: pricing.uuid,
      });

      // Switching arenas also changes the URL, and Studio reacts to the new URL
      // with changes of its own (not the tool's), so we only check the first one.
      expect(changeOptions()[0]).toEqual({
        identity: mcp,
        description: "Navigate",
      });
    });
  });

  it("keeps each tool call's identity when calls overlap", async () => {
    const { studioCtx } = fakeStudioCtx();
    const changeOptions = spyOnChangeOptions(studioCtx);
    const chatCtx = aiStudioCtx(studioCtx, chat, "Insert HTML");
    const mcpCtx = aiStudioCtx(studioCtx, mcp, "Change Element");

    // The MCP tool's change lands between two of the chat tool's changes.
    await Promise.all([
      chatCtx.change(() => ok()),
      mcpCtx.change(() => ok()),
      chatCtx.change(() => ok()),
    ]);

    expect(changeOptions()).toEqual([
      { identity: chat, description: "Insert HTML" },
      { identity: mcp, description: "Change Element" },
      { identity: chat, description: "Insert HTML" },
    ]);
  });

  it("leaves changes made through the plain StudioCtx to the user", async () => {
    const { studioCtx } = fakeStudioCtx();
    const changeOptions = spyOnChangeOptions(studioCtx);
    const chatCtx = aiStudioCtx(studioCtx, chat, "Insert HTML");

    // The user's change lands between two of the tool's changes.
    await Promise.all([
      chatCtx.change(() => ok()),
      studioCtx.change(() => ok()),
      chatCtx.change(() => ok()),
    ]);

    expect(changeOptions()).toEqual([
      { identity: chat, description: "Insert HTML" },
      {},
      { identity: chat, description: "Insert HTML" },
    ]);
  });
});
