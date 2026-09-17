import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { PlasmicStarterGroup } from "@/wab/client/plasmic/plasmic_kit/PlasmicStarterGroup";
import {
  DefaultTutorialsSectionProps,
  PlasmicTutorialsSection,
  PlasmicTutorialsSection__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTutorialsSection";
import { getExtraData, updateExtraDataJson } from "@/wab/shared/ApiSchemaUtil";
import { ensure, spawn } from "@/wab/shared/common";
import * as React from "react";
import { Helmet } from "react-helmet";

export type TutorialsSectionProps = DefaultTutorialsSectionProps &
  PlasmicTutorialsSection__OverridesType;

export function TutorialsSection({ ...props }: TutorialsSectionProps) {
  const appCtx = useAppCtx();
  const selfInfo = ensure(appCtx.selfInfo, "Dashboard requires a user");

  const tutorials = appCtx.appConfig.tutorials;
  if (!tutorials) {
    return null;
  }

  const workspaceId = appCtx.personalWorkspace?.id;

  return (
    <>
      {/* @ts-expect-error Helmet's props don't declare children */}
      <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Bungee&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <PlasmicTutorialsSection
        {...props}
        isInitiallyCollapsed={getExtraData(selfInfo).collapseStarters}
        onIsCollapsedChange={(value) =>
          spawn(
            appCtx.api.updateSelfInfo(
              updateExtraDataJson(selfInfo, { collapseStarters: !!value })
            )
          )
        }
        starterGroup={{ as: PlasmicStarterGroup }}
        tutorialPortfolio={{
          tag: "tutorial-portfolio",
          baseProjectId: tutorials.portfolio,
          workspaceId,
        }}
        game={{
          name: (
            <>
              Play <span className="game-name">Plasmic Levels</span>
            </>
          ),
          tag: "game",
          baseProjectId: tutorials.game,
          workspaceId,
        }}
        codegenQuickstart={{
          tag: "codegen-quickstart",
          href: tutorials.codegenQuickstart,
        }}
      />
    </>
  );
}
