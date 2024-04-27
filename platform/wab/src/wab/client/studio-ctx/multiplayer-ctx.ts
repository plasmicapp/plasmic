import { PLAYER_COLORS } from "@/wab/client/components/studio/GlobalCssVariables";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { asyncOneAtATime, ensure, xDifference } from "@/wab/common";
import {
  ApiUser,
  PlayerViewInfo,
  ServerPlayerInfo,
} from "@/wab/shared/ApiSchema";
import { isEqual } from "lodash";
import { observable, runInAction } from "mobx";

interface PlayerDataBase {
  color: (typeof PLAYER_COLORS)[number];
  viewInfo?: PlayerViewInfo;
}

interface NormalPlayerData extends PlayerDataBase {
  type: "NormalUser";
  user: Readonly<ApiUser>;
}

interface AnonPlayerData extends PlayerDataBase {
  type: "AnonUser";
  user?: undefined;
}

export type PlayerData = NormalPlayerData | AnonPlayerData;

function isNormalPlayerData(data: PlayerData): data is NormalPlayerData {
  return data.type === "NormalUser";
}

export class MultiplayerCtx {
  private _selfId = observable.box(-1);
  constructor(private studioCtx: StudioCtx) {}

  get appCtx() {
    return this.studioCtx.appCtx;
  }

  updateSelfId(id: number) {
    this._selfId.set(id);
    this.playerIdToData.delete(id);
  }

  get selfId() {
    return this._selfId.get();
  }

  knowsSelf() {
    return this.selfId !== -1;
  }

  private readonly playerIdToData = observable.map<number, PlayerData>(
    undefined,
    { deep: true }
  );

  getAllPlayerIds() {
    return [...this.playerIdToData.keys()];
  }

  getAllPlayerData() {
    return [...this.playerIdToData];
  }

  getPlayerDataById(playerId: number) {
    return this.playerIdToData.get(playerId);
  }

  updateSessions = asyncOneAtATime(async (sessions: ServerPlayerInfo[]) => {
    // Fetch missing user data
    const userById = new Map(
      [...this.playerIdToData.values()]
        .filter(isNormalPlayerData)
        .map((player) => [player.user.id, player.user])
    );
    const dataToFetch = sessions
      .filter(
        (player) =>
          player.playerId !== this.selfId &&
          !this.playerIdToData.has(player.playerId) &&
          player.type === "NormalUser" &&
          !userById.has(player.userId)
      )
      .map((player) => player.userId!);
    if (dataToFetch.length > 0) {
      const users = await this.appCtx.api.getUsersById(dataToFetch);
      users.users.forEach((user) => userById.set(user.id, user));
    }

    runInAction(() => {
      // Remove disconnected players
      xDifference(
        this.playerIdToData.keys(),
        sessions.map(({ playerId }) => playerId)
      ).forEach((id) => this.playerIdToData.delete(id));

      sessions.forEach((player) => {
        if (player.playerId !== this.selfId) {
          const existing = this.playerIdToData.get(player.playerId);
          if (!existing || existing.user?.id != player.userId) {
            // Handle new players
            const commonData: PlayerDataBase = {
              color:
                PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
              viewInfo: player.viewInfo,
            };
            if (player.type === "AnonUser") {
              this.playerIdToData.set(player.playerId, {
                type: "AnonUser",
                ...commonData,
              });
            } else {
              this.playerIdToData.set(player.playerId, {
                type: "NormalUser",
                user: ensure(
                  userById.get(player.userId),
                  "Should have fetched all missing data"
                ),
                ...commonData,
              });
            }
          } else {
            // Update existing players
            const playerData = ensure(
              this.playerIdToData.get(player.playerId),
              `Expected ${player.playerId} to exist since \`existing\` is truthy: ` +
                existing
            );
            // Update ViewInfo, trying to avoid unnecessary rerenders
            if (playerData.viewInfo && player.viewInfo) {
              // Update SelectionInfo
              if (
                !isEqual(
                  playerData.viewInfo.selectionInfo,
                  player.viewInfo.selectionInfo
                )
              ) {
                playerData.viewInfo.selectionInfo =
                  player.viewInfo.selectionInfo;
              }
              // Update CursorInfo
              if (
                !isEqual(
                  playerData.viewInfo.cursorInfo,
                  player.viewInfo.cursorInfo
                )
              ) {
                playerData.viewInfo.cursorInfo = player.viewInfo.cursorInfo;
              }
              // Update Branch
              if (playerData.viewInfo.branchId !== player.viewInfo.branchId) {
                playerData.viewInfo.branchId = player.viewInfo.branchId;
              }
              // Update Arena
              if (
                !isEqual(
                  playerData.viewInfo.arenaInfo,
                  player.viewInfo.arenaInfo
                )
              ) {
                playerData.viewInfo.arenaInfo = player.viewInfo.arenaInfo;
              }
              // Update PositionInfo
              if (
                !isEqual(
                  playerData.viewInfo.positionInfo,
                  player.viewInfo.positionInfo
                )
              ) {
                playerData.viewInfo.positionInfo = player.viewInfo.positionInfo;
              }
            } else if (!!playerData.viewInfo !== !!player.viewInfo) {
              playerData.viewInfo = player.viewInfo;
            }
          }
        }
      });
    });
  }, undefined);
}
