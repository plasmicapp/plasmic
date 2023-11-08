import L from "lodash";
import { observable } from "mobx";
import { ArenaFrame, ensureKnownArenaFrame } from "../../classes";
import { assert, ensure, maybe, spawn } from "../../common";
import { getArenaFrames } from "../../shared/Arenas";
import { StudioCtx } from "./StudioCtx";
import { ViewCtx, ViewMode } from "./view-ctx";

export interface StudioViewportSnapshot {
  readonly focusedArenaFrame?: ArenaFrame;
  readonly translate: { x: number; y: number; z: number };
  readonly zoom: number;
}

export class LiveState {
  private _curLiveViewCtx = observable.box<ViewCtx | null>(null);
  private originalStudioState: StudioViewportSnapshot | undefined = undefined;
  private _viewMode = observable.box<ViewMode>(ViewMode.dev);

  constructor(private readonly sc: StudioCtx) {}

  async enterLive() {
    maybe((window as any).drift, (drift: any) => drift.hide());
    const initialVc = await this.getInitialViewCtx();
    await this.sc.changeUnsafe(() => {
      this._viewMode.set(ViewMode.live);
      this._curLiveViewCtx.set(initialVc);
      // Save the state of the studio.
      this.originalStudioState = this.sc.getCurrentStudioViewportSnapshot();
      // reset transform
      this.sc.setTransform({ scale: 1, translate3D: { x: 0, y: 0, z: 0 } });
    });
  }

  curLiveViewCtx() {
    return ensure(this._curLiveViewCtx.get());
  }

  tryNavFrame(next: boolean) {
    // no navigation in dev mode or pop up live mode
    if (!this.isLiveMode()) {
      return;
    }
    const currentArenaChildren = getArenaFrames(this.sc.currentArena);
    let index = currentArenaChildren.findIndex(
      (c) => c === this.curLiveViewCtx().arenaFrame()
    );
    assert(index !== -1);
    const numArenaFrames = currentArenaChildren.length;
    index = (index + numArenaFrames + (next ? 1 : -1)) % numArenaFrames;
    const arenaFrame = ensureKnownArenaFrame(currentArenaChildren[index]);
    spawn(
      this.sc.changeUnsafe(() => {
        const vc = ensure(
          this.sc.viewCtxs.find((vc) => vc.arenaFrame() === arenaFrame)
        );
        this._curLiveViewCtx.set(vc);
      })
    );
  }

  // Refresh live mode when changing to another arena
  async refresh() {
    if (!this.isLiveMode()) {
      return;
    }
    const liveViewCtx = await this.getInitialViewCtx();
    this._curLiveViewCtx.set(liveViewCtx);
    this.sc.setTransform({ scale: 1, translate3D: { x: 0, y: 0, z: 0 } });
  }

  exitLive() {
    maybe((window as any).drift, (drift: any) => drift.show());
    spawn(
      this.sc.changeUnsafe(() => {
        this._viewMode.set(ViewMode.dev);
        this._curLiveViewCtx.set(null);
        // We are switching from canvasClipper's "overflow: auto" to
        // "overflow: hidden". However, that switch didn't reset the scrollLeft
        // and scrollTop. So here we reset it manually.
        const clipper = this.sc.canvasClipper();
        clipper.scrollLeft = 0;
        clipper.scrollTop = 0;
        if (this.originalStudioState) {
          this.sc.restoreStudioViewportSnapshot(
            this.originalStudioState,
            false
          );
        }
      })
    );
    // We signal to the HoverBox to redraw itself at the next tick,
    // as we are just now bringing the canvas frames from display:none back
    // to displayed, and HoverBox doesn't work until the elements in
    // the frame have actually been rendered by the browser.
    L.defer(() => this.sc.styleChanged.dispatch());
  }

  async toggleLiveMode() {
    if (this._viewMode.get() === ViewMode.dev) {
      await this.enterLive();
    } else {
      this.exitLive();
    }
  }
  isLiveMode() {
    return this._viewMode.get() === ViewMode.live;
  }
  showDevControls() {
    return !this.isLiveMode();
  }

  private async getInitialViewCtx() {
    const arena = ensure(this.sc.currentArena);
    const focusedVc = this.sc.focusedViewCtx();
    if (focusedVc) {
      return focusedVc;
    }
    const children = getArenaFrames(arena);
    return await this.sc.awaitViewCtxForFrame(ensure(children[0]));
  }
}
