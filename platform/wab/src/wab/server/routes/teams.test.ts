import { Team } from "@/wab/server/entities/Entities";
import { mkApiTeam } from "@/wab/server/routes/teams";

describe("mkApiTeam", () => {
  it("has expected fields", () => {
    const team = {
      name: "Team Name",
    } as Team;
    const apiTeam = mkApiTeam(team);
    expect(apiTeam.name).toEqual("Team Name");
    expect(apiTeam.featureTier).toEqual(null);
    expect(apiTeam.uiConfig).toEqual({
      brand: {},
      canInsertBasics: undefined,
      canInsertBuiltinComponent: undefined,
      canInsertHostless: undefined,
      insertableTemplates: undefined,
      leftTabs: undefined,
      pageTemplates: undefined,
      projectConfigs: undefined,
      styleSectionVisibilities: undefined,
    });
    expect(apiTeam.onTrial).toEqual(false);
  });
  it("uses isTeamOnFreeTrial", () => {
    const team = {
      name: "Team Name",
      featureTier: {
        name: "Starter",
      },
      trialStartDate: new Date(),
    } as Team;
    const apiTeam = mkApiTeam(team);
    expect(apiTeam.name).toEqual("Team Name");
    expect(apiTeam.onTrial).toEqual(true);
  });
  it("inherits parent team's feature tier", () => {
    const team = {
      name: "Child Team",
      parentTeam: {
        name: "Parent Team",
        featureTier: {
          name: "Parent Feature Tier",
        },
      },
    } as Team;
    const apiTeam = mkApiTeam(team);
    expect(apiTeam.name).toEqual("Child Team");
    expect(apiTeam.featureTier?.name).toEqual("Parent Feature Tier");
  });
  it("can override parent's feature tier", () => {
    const team = {
      name: "Child Team",
      featureTier: {
        name: "Child Feature Tier",
      },
      parentTeam: {
        name: "Parent Team",
        featureTier: {
          name: "Parent Feature Tier",
        },
      },
    } as Team;
    const apiTeam = mkApiTeam(team);
    expect(apiTeam.name).toEqual("Child Team");
    expect(apiTeam.featureTier?.name).toEqual("Child Feature Tier");
  });
  it("merges with parent team's UI config", () => {
    const team = {
      name: "Child Team",
      uiConfig: {
        brand: {
          logoImgSrc: "https://child.com/logo",
        },
        canInsertHostless: false,
      },
      parentTeam: {
        name: "Parent Team",
        uiConfig: {
          brand: {
            logoImgSrc: "https://parent.com/logo",
            logoAlt: "Parent Logo Alt",
          },
          canInsertBasics: true,
          canInsertBuiltinComponent: false,
        },
      },
    } as Team;
    const apiTeam = mkApiTeam(team);
    expect(apiTeam.name).toEqual("Child Team");
    expect(apiTeam.uiConfig.brand?.logoImgSrc).toEqual(
      "https://child.com/logo"
    );
    expect(apiTeam.uiConfig.brand?.logoAlt).toEqual("Parent Logo Alt");
    expect(apiTeam.uiConfig.canInsertBasics).toEqual(true);
    expect(apiTeam.uiConfig.canInsertBuiltinComponent).toEqual(false);
    expect(apiTeam.uiConfig.canInsertHostless).toEqual(false);
  });
});
