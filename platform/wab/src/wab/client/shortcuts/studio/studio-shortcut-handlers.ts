import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import { bindShortcutHandlers } from "@/wab/client/shortcuts/shortcut-handler";
import { STUDIO_SHORTCUTS } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { RightTabKey, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getArenaFrames } from "@/wab/shared/Arenas";
import { assert, mod } from "@/wab/shared/common";
import { getSiteArenas } from "@/wab/shared/core/sites";
import { LeftTabKey } from "@/wab/shared/ui-config-utils";
import L from "lodash";

/**
 * Shortcuts should only get handled if this function returns true.
 * Ideally, these checks shouldn't be needed, but we have these issues:
 *
 * 1. Preview mode (i.e. !studioCtx.isDevMode) is basically drawn on top of
 *    Studio, so we have lots of code that work conditionally.
 * 2. We have lots of code that focuses on <body>, so we have to attach handlers
 *    to <body> as well. This is problematic because many modals/popups get
 *    inserted into <body>, where shortcuts should not work.
 *
 * TODO: Resolve above issues and remove this function
 */
export function shouldHandleStudioShortcut(studioCtx: StudioCtx) {
  return (_event: KeyboardEvent, element: Element): boolean => {
    // Issue 1: Don't handle if not in dev mode
    if (!studioCtx.isDevMode) {
      return false;
    }

    // Issue 2: Don't handle if focus is in <body> but not in <div.studio>
    // <body>                   // YES
    //   <div class="studio" /> // YES
    //   <div class="popup" />  // NO
    // </body>
    if (document.body !== element && document.body.contains(element)) {
      const studioEl = document.body.querySelector("div.studio");
      if (studioEl && !studioEl.contains(element)) {
        return false;
      }
    }

    return true;
  };
}

/**
 * Binds shortcut handlers that only require a `StudioCtx`.
 * More shortcut handlers can be found in `ViewEditor`.
 */
export function bindStudioShortcutHandlers(studioCtx: StudioCtx) {
  const toggleLeftTab = (tabKey: LeftTabKey) => {
    if (studioCtx.leftTabKey === tabKey) {
      studioCtx.switchLeftTab(undefined);
    } else {
      studioCtx.switchLeftTab(tabKey);
    }
  };

  const switchArenaByDelta = (sc: StudioCtx, delta: number) => {
    return sc.changeUnsafe(() => {
      const currentArena = sc.currentArena!;
      const allArenas = getSiteArenas(sc.site);
      let index = allArenas.indexOf(currentArena);
      index = mod(index + delta, allArenas.length);
      let incomingArena = allArenas[index];
      if (sc.isLiveMode) {
        // In live mode, we can't switch to an arena without frames
        for (const _ of L.range(allArenas.length)) {
          if (getArenaFrames(incomingArena).length === 0) {
            index = mod(index + delta, allArenas.length);
            incomingArena = allArenas[index];
          } else {
            break;
          }
        }
        assert(
          getArenaFrames(incomingArena).length !== 0,
          "incomingArena should have at least one frame."
        );
      }
      sc.switchToArena(incomingArena);
    });
  };

  return bindShortcutHandlers(
    document.body,
    STUDIO_SHORTCUTS,
    {
      SAVE: async (e) => {
        e.preventDefault();
        await studioCtx.save();
      },
      UNDO: async (e) => {
        e.preventDefault();
        return studioCtx.undo();
      },
      REDO: async (e) => {
        e.preventDefault();
        return studioCtx.redo();
      },
      RECT: async () => {
        if (studioCtx.currentArenaEmpty) {
          return;
        }
        return studioCtx.changeUnsafe(() => {
          studioCtx.setPointerState("rect");
        });
      },
      STACK: async () => {
        if (studioCtx.currentArenaEmpty) {
          return;
        }
        return studioCtx.changeUnsafe(() => {
          studioCtx.setPointerState("stack");
        });
      },
      HORIZ_STACK: async () => {
        if (studioCtx.currentArenaEmpty) {
          return;
        }
        return studioCtx.changeUnsafe(() => {
          studioCtx.setPointerState("hstack");
        });
      },
      VERT_STACK: async () => {
        if (studioCtx.currentArenaEmpty) {
          return;
        }
        return studioCtx.changeUnsafe(() => {
          studioCtx.setPointerState("vstack");
        });
      },
      TEXT: async () => {
        if (studioCtx.currentArenaEmpty) {
          return;
        }
        return studioCtx.changeUnsafe(() => {
          studioCtx.setPointerState("text");
        });
      },
      ZOOM_IN: async (e) => {
        e.preventDefault();
        return studioCtx.changeUnsafe(() => {
          studioCtx.tryZoomWithDirection(1);
        });
      },
      ZOOM_OUT: async (e) => {
        e.preventDefault();
        return studioCtx.changeUnsafe(() => {
          studioCtx.tryZoomWithDirection(-1);
        });
      },
      ZOOM_RESET: async (e) => {
        e.preventDefault();
        return studioCtx.changeUnsafe(() => {
          studioCtx.tryZoomWithScale(1);
        });
      },
      ZOOM_TO_FIT: async () => {
        return studioCtx.changeUnsafe(() => {
          studioCtx.tryZoomToFitArena();
        });
      },
      ZOOM_TO_SELECTION: async () => {
        return studioCtx.changeUnsafe(async () => {
          await studioCtx.tryZoomToFitSelection();
        });
      },
      FOCUS_FRAME: async () => {
        return studioCtx.changeUnsafe(() => {
          studioCtx.centerFocusedFrame();
        });
      },
      FOCUS_NEXT_FRAME: async () => {
        return studioCtx.changeUnsafe(() => {
          if (!studioCtx.isLiveMode) {
            studioCtx.focusNextFrame();
          }
        });
      },
      FOCUS_PREV_FRAME: async () => {
        return studioCtx.changeUnsafe(() => {
          if (!studioCtx.isLiveMode) {
            studioCtx.focusPrevFrame();
          }
        });
      },
      TOGGLE_FOCUSED_MODE: async () => {
        return studioCtx.changeUnsafe(() => studioCtx.toggleFocusedMode());
      },
      TOGGLE_INTERACTIVE_MODE: async () => {
        return studioCtx.changeUnsafe(() => {
          if (studioCtx.focusedMode) {
            studioCtx.isInteractiveMode = !studioCtx.isInteractiveMode;
          }
        });
      },
      TOGGLE_UI_COPILOT: async () => {
        if (studioCtx.uiCopilotEnabled()) {
          studioCtx.openUiCopilotDialog(!studioCtx.showUiCopilot);
        }
      },
      TOGGLE_COPILOT_CHAT: async () => {
        if (studioCtx.chatCopilotEnabled()) {
          await studioCtx.appCtx.topFrameApi?.toggleCopilotChat();
        }
      },
      SWITCH_TO_COPILOT_TAB: async () => {
        return (
          studioCtx.appCtx.appConfig.copilotTab &&
          studioCtx.changeUnsafe(() => {
            toggleLeftTab("copilot");
          })
        );
      },
      SWITCH_TO_TREE_TAB: async () => {
        return studioCtx.changeUnsafe(() => {
          toggleLeftTab("outline");
        });
      },
      SEARCH_PROJECT_ARENAS: async () => {
        return studioCtx.changeUnsafe(() => {
          studioCtx.showProjectPanel();
          studioCtx.focusOnProjectSearchInput();
        });
      },
      SWITCH_TO_LINT_TAB: async () => {
        return studioCtx.changeUnsafe(() => {
          toggleLeftTab("lint");
        });
      },
      CLOSE_LEFT_PANEL: async () => {
        return studioCtx.changeUnsafe(() => {
          if (!studioCtx.leftTabKey) {
            studioCtx.restoreLastLeftTab();
          } else {
            studioCtx.switchLeftTab(undefined);
          }
        });
      },
      SWITCH_TO_SETTINGS_TAB: async () => {
        return studioCtx.changeUnsafe(() =>
          studioCtx.switchRightTab(RightTabKey.settings)
        );
      },
      SWITCH_TO_DESIGN_TAB: async () => {
        return studioCtx.changeUnsafe(() =>
          studioCtx.switchRightTab(RightTabKey.style)
        );
      },
      SWITCH_TO_COMPONENT_TAB: async () => {
        return studioCtx.changeUnsafe(() =>
          studioCtx.switchRightTab(RightTabKey.component)
        );
      },
      SHOW_SHORTCUTS: () => {
        studioCtx.toggleShortcutsModal();
      },
      OUTLINE_MODE: () => {
        const vc = studioCtx.focusedViewCtx();
        if (vc) {
          vc.canvasCtx.setOutlineMode(!vc.canvasCtx.isOutlineMode());
        }
      },
      DESELECT: async (e) => {
        const sc = studioCtx;
        if (sc.app.isDragging()) {
          // Let the drag handlers handle the escape event.
        } else if (sc.showStackOfParents) {
          // Just hide the parent stack
          sc.showStackOfParents = false;
        } else {
          await sc.changeUnsafe(() => {
            if (sc.freestyleState()) {
              sc.setPointerState("move");
            } else if (sc.dragInsertState()) {
              sc.setDragInsertState(undefined);
            } else if (sc.isLiveMode) {
              sc.toggleDevControls();
            } else if (
              document.activeElement &&
              document.activeElement !== document.body
            ) {
              (document.activeElement as HTMLElement).blur();
            } else if (!e.cancelBubble) {
              // Because mousetrap and React both set their handlers on
              // document, if a React key handler called e.stopPropagation()
              // on ESCAPE, this mousetrap handler will still be called.
              // But, thankfully, we can check if an event's stopPropagation()
              // has been called by checking the cancelBubble flag!
              // If no one else has handled this ESCAPE, then de-select whatever
              // we're currently selecting on the canvas.
              const vc = sc.focusedViewCtx();
              if (vc) {
                vc.setStudioFocusBySelectable(null);
                vc.setViewCtxHoverBySelectable(null);
                vc.studioCtx.setStudioFocusOnFrame({
                  frame: undefined,
                  autoZoom: false,
                });
                if (vc.currentComponentCtx()) {
                  vc.setCurrentComponentCtx(null);
                }
              }
            }
          });
        }
      },
      PREV_ARENA: () => {
        return switchArenaByDelta(studioCtx, -1);
      },
      NEXT_ARENA: () => {
        return switchArenaByDelta(studioCtx, 1);
      },
      RENAME_ELEMENT: (e) => {
        e.preventDefault();
        studioCtx.tryStartRenamingFocused();
      },
      SHOW_ADD_DRAWER: async (e) => {
        e.preventDefault();
        const sc = studioCtx;
        return sc.changeUnsafe(() => sc.setShowAddDrawer(true));
      },
      SHOW_VARIANTS_DRAWER: async (e) => {
        e.preventDefault();
        const sc = studioCtx;
        return sc.changeUnsafe(() => sc.setShowVariantsDrawer(true));
      },
      TOGGLE_VARIANTS_RECORDING: (e) => {
        e.preventDefault();
        const sc = studioCtx;
        const vc = sc.focusedViewCtx();
        if (vc) {
          vc.change(() => {
            const vcontroller = makeVariantsController(vc.studioCtx);
            if (vcontroller) {
              vcontroller.onToggleTargetingOfActiveVariants();
            }
          });
        }
      },
      TOGGLE_PREVIEW_MODE: async () => {
        return studioCtx.changeUnsafe(() => studioCtx.toggleDevControls());
      },
    },
    shouldHandleStudioShortcut(studioCtx)
  );
}
