import { useTeamSubscription } from "@/wab/client/api-hooks";
import { AppCtx } from "@/wab/client/app-ctx";
import {
  TeamBillingAlert,
  TeamBillingErrorIcon,
} from "@/wab/client/components/dashboard/TeamBillingAlert";
import { ApiPermission, ApiTeam, TeamId, UserId } from "@/wab/shared/ApiSchema";
import { AccessLevel } from "@/wab/shared/EntUtil";
import { getSubscriptionStatus } from "@/wab/shared/billing/billing-util";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SWRConfig } from "swr";
import { Temporal } from "temporal-polyfill";
import { mock } from "vitest-mock-extended";

vi.mock("@/wab/client/contexts/AppContexts", () => ({
  useAppCtx: () => ({
    selfInfo: { id: "user" },
    perms: [{ teamId: "team", userId: "user", accessLevel: "owner" }],
  }),
}));

vi.mock("@/wab/client/api-hooks", () => ({ useTeamSubscription: vi.fn() }));

const teamId = "team" as TeamId;

function renderBanner(
  role: AccessLevel,
  status: "past_due" | "free",
  blocked: boolean,
  billingTeamId = teamId,
) {
  vi.mocked(useTeamSubscription).mockReturnValue({
    data: {
      team: mock<ApiTeam>({ id: teamId }),
      billingTeamId,
      subscriptionStatus: status,
      pastDueLastDay: Temporal.Now.plainDateISO("UTC")
        .add({ days: blocked ? -2 : 1 })
        .toString(),
    },
  } as ReturnType<typeof useTeamSubscription>);
  return renderToStaticMarkup(
    <TeamBillingAlert
      team={mock<ApiTeam>({
        id: teamId,
      })}
      perms={[
        mock<ApiPermission>({
          teamId,
          userId: "user" as UserId,
          accessLevel: role,
        }),
      ]}
    />,
  );
}

describe("billing alert", () => {
  it.each(["owner", "editor"] as const)("shows for %s", (role) => {
    const html = renderBanner(role, "past_due", false);
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/orgs/team/billing"');
    expect(html).toContain("Manage billing");
    expect(html).toContain("Editing is available through");
  });
  it.each(["designer", "content", "commenter", "viewer", "blocked"] as const)(
    "hides for %s",
    (role) => {
      expect(renderBanner(role, "past_due", false)).toBe("");
    },
  );
  it("shows paused editing after the deadline", () => {
    expect(renderBanner("owner", "past_due", true)).toContain(
      "Editing is paused",
    );
  });
  it("links inherited billing to the paying organization", () => {
    expect(
      renderBanner("editor", "past_due", false, "parent" as TeamId),
    ).toContain('href="/orgs/parent/billing"');
  });
  it("shows a switcher icon only for billing errors", () => {
    renderBanner("owner", "past_due", false);
    const renderIcon = () =>
      renderToStaticMarkup(
        <TeamBillingErrorIcon team={mock<ApiTeam>({ id: teamId })} />,
      );
    expect(renderIcon()).toContain('aria-label="Billing error"');
    expect(useTeamSubscription).toHaveBeenLastCalledWith(
      expect.anything(),
      teamId,
      { poll: false },
    );
    renderBanner("owner", "free", false);
    expect(renderIcon()).toBe("");
  });
  it("hides when payment is not past due", () => {
    expect(renderBanner("owner", "free", false)).toBe("");
  });
});

it("publishes a trial only after the matching team has loaded", async () => {
  const { useTeamSubscription: useActualTeamSubscription } =
    await vi.importActual<typeof import("@/wab/client/api-hooks")>(
      "@/wab/client/api-hooks",
    );
  const freeTeam = mock<ApiTeam>({ id: teamId, featureTier: null });
  const trialTeam = {
    ...freeTeam,
    featureTier: DEVFLAGS.freeTier,
    onTrial: true,
  };
  const api = {
    getTeamSubscription: vi.fn().mockResolvedValue({
      subscriptionStatus: "free",
      billingTeamId: teamId,
      pastDueLastDay: null,
    }),
    getTeam: vi.fn().mockResolvedValue({ team: freeTeam }),
  };
  const appCtx = mock<AppCtx>({ api: mock<AppCtx["api"]>(api) });
  const { result } = renderHook(
    () => useActualTeamSubscription(appCtx, teamId),
    {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          {children}
        </SWRConfig>
      ),
    },
  );
  await waitFor(() =>
    expect(result.current.data?.subscriptionStatus).toBe("free"),
  );
  let resolveTeam: ((value: { team: ApiTeam }) => void) | undefined;
  api.getTeam.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveTeam = resolve;
      }),
  );
  api.getTeamSubscription.mockResolvedValue({
    subscriptionStatus: "trial",
    billingTeamId: teamId,
    pastDueLastDay: null,
  });
  let refresh: ReturnType<typeof result.current.mutate>;
  await act(async () => {
    refresh = result.current.mutate();
  });
  expect(result.current.data?.subscriptionStatus).toBe("free");
  expect(result.current.data?.team).toBe(freeTeam);
  await act(async () => {
    ensure(resolveTeam, "Expected pending team request")({ team: trialTeam });
    await refresh;
  });
  const data = ensure(result.current.data, "Expected billing data");
  expect(data.subscriptionStatus).toBe("trial");
  expect(getSubscriptionStatus({ ...data.team, ...data })).toMatchObject({
    type: "valid",
  });
});
