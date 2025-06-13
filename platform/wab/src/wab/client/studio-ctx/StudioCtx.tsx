import { LEFT_PANE_INIT_WIDTH } from "@/wab/client/ClientConstants";
import { DragInsertManager } from "@/wab/client/Dnd";
import {
  handleError,
  reportError,
  showError,
} from "@/wab/client/ErrorNotifications";
import { ProjectDependencyManager } from "@/wab/client/ProjectDependencyManager";
import { zoomJump } from "@/wab/client/Zoom";
import { invalidationKey } from "@/wab/client/api";
import { getProjectReleases } from "@/wab/client/api-hooks";
import { storageViewAsKey } from "@/wab/client/app-auth/constants";
import {
  UU,
  mkProjectLocation,
  parseProjectLocation,
} from "@/wab/client/cli-routes";
import { LocalClipboard } from "@/wab/client/clipboard/local";
import { syncCodeComponentsAndHandleErrors } from "@/wab/client/code-components/code-components";
import { CodeFetchersRegistry } from "@/wab/client/code-fetchers";
import {
  showForbiddenError,
  showReloadError,
  showSaveErrorRecoveredNotice,
} from "@/wab/client/components/Messages";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { SiteOps } from "@/wab/client/components/canvas/site-ops";
import {
  InsertRelLoc,
  getFocusedInsertAnchor,
  getPreferredInsertLocs,
} from "@/wab/client/components/canvas/view-ops";
import { TplCommentThread } from "@/wab/client/components/comments/utils";
import {
  clearDarkMask,
  createDarkMask,
} from "@/wab/client/components/darkMask";
import { PreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import {
  PaywallError,
  maybeShowPaywall,
} from "@/wab/client/components/modals/PricingModal";
import { OmnibarState } from "@/wab/client/components/omnibar/Omnibar";
import {
  DataPickerTypesSchema,
  extraTsFilesSymbol,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { TraitRegistry } from "@/wab/client/components/splits/TraitRegistry";
import gridFramesLayoutStyles from "@/wab/client/components/studio/arenas/GridFramesLayout.module.sass";
import {
  getSortedHostLessPkgs,
  getVersionForCanvasPackages,
} from "@/wab/client/components/studio/studio-bundles";
import { adjustGridStyleForCurZoom } from "@/wab/client/components/style-controls/GridEditor";
import { makeVariantsController } from "@/wab/client/components/variants/VariantsController";
import {
  AlertData,
  AlertSpec,
} from "@/wab/client/components/widgets/plasmic/AlertBanner";
import { personalProjectPaywallMessage } from "@/wab/client/components/widgets/plasmic/ShareDialogContent";
import { frameToScalerRect } from "@/wab/client/coords";
import { DbCtx, WithDbCtx } from "@/wab/client/db";
import {
  AddFakeItem,
  AddTplItem,
  ExtraInfoOpts,
  INSERTABLES_MAP,
} from "@/wab/client/definitions/insertables";
import {
  cachedJQSelector,
  getTextWidth,
  isCanvasIframeEvent,
  scriptExec,
  setElementStyles,
} from "@/wab/client/dom-utils";
import { fixupChrome, fixupForChanges } from "@/wab/client/fixes-post-change";
import { FontManager } from "@/wab/client/fonts";
import {
  getRootSubHostVersion,
  getRootSubReact,
} from "@/wab/client/frame-ctx/windows";
import { checkDepPkgHosts } from "@/wab/client/init-ctx";
import { postInsertableTemplate } from "@/wab/client/insertable-templates";
import { PLATFORM } from "@/wab/client/platform";
import { requestIdleCallbackAsync } from "@/wab/client/requestidlecallback";
import { plasmicExtensionAvailable } from "@/wab/client/screenshot-util";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import {
  COMMENTS_DIALOG_RIGHT_ZOOM_PADDING,
  CommentsCtx,
} from "@/wab/client/studio-ctx/comments-ctx";
import { ComponentCtx } from "@/wab/client/studio-ctx/component-ctx";
import { MultiplayerCtx } from "@/wab/client/studio-ctx/multiplayer-ctx";
import {
  SpotlightAndVariantsInfo,
  ViewCtx,
} from "@/wab/client/studio-ctx/view-ctx";
import {
  StyleMgr,
  UpsertStyleChanges,
  summaryToStyleChanges,
} from "@/wab/client/style-mgr";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { TutorialStateFlags } from "@/wab/client/tours/tutorials/tutorials-types";
import { trackEvent } from "@/wab/client/tracking";
import { UndoLog, UndoRecord, ViewStateSnapshot } from "@/wab/client/undo-log";
import {
  getHostUrl,
  maybeToggleTrailingSlash,
} from "@/wab/client/utils/app-hosting-utils";
import { drainQueue } from "@/wab/commons/asyncutil";
import { arrayReversed, removeFromArray } from "@/wab/commons/collections";
import {
  withConsumer,
  withProvider,
} from "@/wab/commons/components/ContextUtil";
import { safeCallbackify } from "@/wab/commons/control";
import { unwrap } from "@/wab/commons/failable-utils";
import { isLatest, latestTag, lt } from "@/wab/commons/semver";
import { DeepReadonly } from "@/wab/commons/types";
import { UnauthorizedError } from "@/wab/shared/ApiErrors/errors";
import {
  ApiBranch,
  ApiPermission,
  ApiProject,
  ApiUser,
  ArenaType,
  BranchId,
  CopilotInteractionId,
  InitServerInfo,
  MainBranchId,
  ServerSessionsInfo,
  TemplateSpec,
  UpdatePlayerViewRequest,
} from "@/wab/shared/ApiSchema";
import {
  AnyArena,
  FrameViewMode,
  IArenaFrame,
  cloneArenaFrame,
  doesFrameVariantMatch,
  ensureActivatedScreenVariantsForArena,
  ensureActivatedScreenVariantsForFrameByWidth,
  getArenaFrames,
  getArenaName,
  getArenaType,
  getArenaUuidOrName,
  getFrameHeight,
  getGridRowLabels,
  isComponentArena,
  isDedicatedArena,
  isHeightAutoDerived,
  isMixedArena,
  isPageArena,
  normalizeMixedArenaFrames,
  setFocusedFrame,
  syncArenaFrameSize,
  updateAutoDerivedFrameHeight,
} from "@/wab/shared/Arenas";
import { AccessLevel, accessLevelRank } from "@/wab/shared/EntUtil";
import {
  PkgVersionInfo,
  PkgVersionInfoMeta,
  SiteInfo,
} from "@/wab/shared/SharedApi";
import { isSlot, tryGetMainContentSlotTarget } from "@/wab/shared/SlotUtils";
import { addEmptyQuery } from "@/wab/shared/TplMgr";
import { VariantCombo, isVariantSettingEmpty } from "@/wab/shared/Variants";
import { AddItemKey } from "@/wab/shared/add-item-keys";
import {
  Bundle,
  BundledInst,
  FastBundler,
  checkBundleFields,
  checkRefsInBundle,
} from "@/wab/shared/bundler";
import { UnsafeBundle, getBundle } from "@/wab/shared/bundles";
import {
  allCodeLibraries,
  allCustomFunctions,
  computedProjectFlags,
  usedHostLessPkgs,
} from "@/wab/shared/cached-selectors";
import {
  getBuiltinComponentRegistrations,
  isBuiltinCodeComponent,
} from "@/wab/shared/code-components/builtin-code-components";
import {
  CodeComponentsRegistry,
  HighlightInteractionRequest,
  customFunctionId,
  registeredFunctionId,
  syncPlumeComponent,
} from "@/wab/shared/code-components/code-components";
import {
  AsyncCallable,
  arrayEqIgnoreOrder,
  asOne,
  assert,
  asyncMaxAtATime,
  asyncOneAtATime,
  asyncTimeout,
  ensure,
  ensureHTMLElt,
  ensureType,
  isNonNil,
  last,
  maybe,
  mkShortId,
  removeWhere,
  spawn,
  spawnWrapper,
  swallow,
  switchType,
  tuple,
  withTimeout,
  withoutNils,
  xDifference,
  xGroupBy,
} from "@/wab/shared/common";
import {
  ensureActivatedScreenVariantsForComponentArenaFrame,
  getComponentArenaBaseFrame,
} from "@/wab/shared/component-arenas";
import { RootComponentVariantFrame } from "@/wab/shared/component-frame";
import {
  CodeComponent,
  ComponentType,
  PageComponent,
  allComponentVariants,
  extractParamsFromPagePath,
  getRealParams,
  isCodeComponent,
  isFrameComponent,
  isPageComponent,
  isPlainComponent,
} from "@/wab/shared/core/components";
import { tryExtractJson } from "@/wab/shared/core/exprs";
import { JsonValue } from "@/wab/shared/core/lang";
import {
  ComponentContext,
  ModelChange,
  RecordedChanges,
  emptyRecordedChanges,
  filterPersistentChanges,
  mergeRecordedChanges,
} from "@/wab/shared/core/observable-model";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";
import {
  isSelectable,
  makeSelectableFullKey,
} from "@/wab/shared/core/selection";
import {
  allGlobalVariants,
  getAllSiteFrames,
  getArenaByNameOrUuidOrPath,
  getDedicatedArena,
  getSiteArenas,
  isHostLessPackage,
  isTplAttachedToSite,
  isValidArena,
  siteIsEmpty,
} from "@/wab/shared/core/sites";
import { SlotSelection } from "@/wab/shared/core/slots";
import { SplitStatus } from "@/wab/shared/core/splits";
import {
  taggedUnbundle,
  unbundleProjectDependency,
  unbundleSite,
} from "@/wab/shared/core/tagged-unbundle";
import {
  EventHandlerKeyType,
  ancestorsUp,
  flattenTpls,
  isTplComponent,
  isTplContainer,
  isTplNamable,
  isTplSlot,
  tplChildren,
  trackComponentRoot,
  trackComponentSite,
} from "@/wab/shared/core/tpls";
import { undoChanges } from "@/wab/shared/core/undo-util";
import { ValComponent, ValNode } from "@/wab/shared/core/val-nodes";
import {
  ALL_QUERIES,
  dataSourceTemplateToString,
  mkDataSourceOpExpr,
  mkDataSourceTemplate,
} from "@/wab/shared/data-sources-meta/data-sources";
import { AddItemPrefs, getSimplifiedStyles } from "@/wab/shared/default-styles";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import {
  DEVFLAGS,
  InsertableTemplatesGroup,
  InsertableTemplatesItem,
} from "@/wab/shared/devflags";
import { DataSourceUser } from "@/wab/shared/dynamic-bindings";
import { Box, Pt } from "@/wab/shared/geom";
import { cloneInsertableTemplateComponent } from "@/wab/shared/insertable-templates";
import { InsertableTemplateComponentExtraInfo } from "@/wab/shared/insertable-templates/types";
import { instUtil } from "@/wab/shared/model/InstUtil";
import * as classes from "@/wab/shared/model/classes";
import {
  Arena,
  ArenaChild,
  ArenaFrame,
  Component,
  ComponentArena,
  DataSourceTemplate,
  ObjInst,
  PageArena,
  ProjectDependency,
  StyleToken,
  TemplatedString,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  VariantGroup,
  isKnownArenaFrame,
  isKnownComponentArena,
  isKnownProjectDependency,
  isKnownVariantSetting,
} from "@/wab/shared/model/classes";
import { modelSchemaHash } from "@/wab/shared/model/classes-metas";
import {
  ChangeSummary,
  ChangesType,
  summarizeChanges,
} from "@/wab/shared/model/model-change-util";
import { reorderPageArenaCols } from "@/wab/shared/page-arenas";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import {
  DeletedAssetsSummary,
  getEmptyDeletedAssetsSummary,
  undoChangesAndResolveConflicts,
  updateSummaryFromDeletedInstances,
} from "@/wab/shared/server-updates-utils";
import {
  INITIAL_VERSION_NUMBER,
  calculateSemVer,
  compareSites,
  extractSplitStatusDiff,
} from "@/wab/shared/site-diffs";
import {
  InvariantError,
  assertSiteInvariants,
} from "@/wab/shared/site-invariants";
import { naturalSort } from "@/wab/shared/sort";
import {
  LEFT_TAB_PANEL_KEYS,
  LeftTabKey,
  LeftTabUiKey,
  UiConfig,
  getLeftTabPermission,
  mergeUiConfigs,
} from "@/wab/shared/ui-config-utils";
import {
  DataOp,
  executePlasmicDataOp,
  makeCacheKey,
  makeQueryCacheKey,
} from "@plasmicapp/data-sources";
import * as Sentry from "@sentry/browser";
import { message, notification } from "antd";
import { ArgsProps } from "antd/lib/notification";
import asynclib from "async";
import cn from "classnames";
import stringify from "fast-stringify";
import { Location } from "history";
import $ from "jquery";
import {
  debounce,
  groupBy,
  head,
  isNil,
  keyBy,
  mapValues,
  maxBy,
  memoize,
  partition,
  uniq,
} from "lodash";
import assign from "lodash/assign";
import defer from "lodash/defer";
import isEqual from "lodash/isEqual";
import orderBy from "lodash/orderBy";
import {
  IObservableValue,
  ObservableMap,
  autorun,
  flow,
  makeObservable,
  observable,
  reaction,
  runInAction,
  when,
} from "mobx";
import { computedFn } from "mobx-utils";
import React, { useContext } from "react";
import semver from "semver";
import * as Signals from "signals";
import { mutate } from "swr";
import { FailableArgParams, IFailable, failable } from "ts-failable";

(window as any).dbg.classes = classes;

const MAX_SAVE_RETRIES = 300; // Saves every 2 seconds means retry for 10 minutes
const DEFAULT_ZOOM_PADDING = 40;

interface StudioCtxArgs {
  dbCtx: DbCtx;
}

interface ZoomState {
  readonly clientPt: Pt;
  readonly scalerPt: Pt;
}

interface WheelZoomState extends ZoomState {
  // These are used for zooming by wheel
  readonly startScreenX: number;
  readonly startScreenY: number;
  lastZoomEventTimestamp: number;
}

interface PanningState {
  readonly initScreenX: number;
  readonly initScreenY: number;
  readonly initScrollX: number;
  readonly initScrollY: number;
  readonly initiatedByMiddleButton: boolean;
}

export class FreestyleState {
  constructor(readonly spec: AddTplItem) {}
}

export type PointerState =
  | "move"
  | "rect"
  | "hstack"
  | "vstack"
  | "text"
  | "stack";

export class DragInsertState {
  constructor(readonly dragMgr: DragInsertManager, readonly spec: AddTplItem) {}
}

interface ArenaViewInfo {
  lastAccess: number;
  isAlive: boolean;
  lastViewSnapshot: StudioViewportSnapshot | undefined;
}

interface StudioViewportSnapshot {
  readonly focusedArenaFrame?: ArenaFrame;
  readonly scroll: Pt;
  readonly scale: number;
}

export type StudioAppUser = Pick<
  DataSourceUser,
  | "email"
  | "externalId"
  | "roleId"
  | "roleIds"
  | "roleName"
  | "roleNames"
  | "isLoggedIn"
  | "properties"
  | "customProperties"
>;

export interface StudioChangeOpts {
  // If you are calling StudioCtx.change() from a React event handler, and you are
  // reading values from the event, you should pass that event in here.  This is
  // because StudioCtx.change() may occur asynchronously, and because React
  // recycles the event objects, by the time your change function is called,
  // the event object may have been freed.  Passing this in means if StudioCtx
  // knows that your change function will be called asynchronously, it will call
  // event.persist() for you so that it will not be reused by React.  This should
  // happen pretty rarely (more likely in cypress tests than real usage).
  // Note also that you should only need to do this for React events; if you're
  // using jquery events or raw browser events, they don't get reused in this way.
  event?: React.SyntheticEvent;

  // Some changes are internal fixes that shouldn't create a new entry in the
  // undo log. If this flag is true, the model changes will be added to the last
  // entry in the undo log (or ignored if there's no entry yet), and changes to
  // the view state will be ignored.
  // In general, this flag shouldn't be used, except for situation such as:
  // - Some asynchronous fixes, e.g. create vsettings after the frame loads;
  // - Reactions to other changes, such as fixes made by a resize observer;
  // - Fixes made to the data model when initializing Studio.
  noUndoRecord?: boolean;
}

enum SaveResult {
  StopSaving = "StopSaving",
  SkipUpToDate = "SkipUpToDate",
  SkipIsChanging = "SkipIsChanging",
  Throttled = "Throttled",
  Success = "Success",
  GatewayError = "GatewayError",
  UnknownError = "UnknownError",
  TimedOut = "TimedOut",
  TriedEditProtectedMain = "TriedEditProtectedMain",
}

export enum PublishResult {
  SaveFailed = "SaveFailed",
  OutOfDate = "OutOfDate",
  SkipAlreadyPublished = "SkipAlreadyPublished",
  PreFilling = "PreFilling",
  Success = "Success",
  UnknownError = "UnknownError",
  // eslint-disable-next-line @typescript-eslint/no-shadow
  PaywallError = "PaywallError",
}

export interface SaveTplAsPresetState {
  // This is the adapted tpl, i.e. it has only one variant setting.
  tpl: TplComponent;
  vc: ViewCtx;
  dom?: HTMLElement;
}

export interface PresetDrawerState {
  component: Component;
  // unique id of the state. Used to distinguish different drawer.
  uid: number;
}

type ModelChangeRequest =
  | ArbitraryModelChangeRequest
  | UndoModelChangeRequest
  | RedoModelChangeRequest
  | FetchModelUpdatesRequest;

interface ArbitraryModelChangeRequest<Result = any> {
  type: "change";
  changeFn: () => IFailable<Result, any>;
  opts?: StudioChangeOpts;
}

interface UndoModelChangeRequest {
  type: "undo";
}

interface RedoModelChangeRequest {
  type: "redo";
}

interface FetchModelUpdatesRequest {
  type: "fetchModelUpdates";
}

let nextPresetDrawerId = 1;
export const genPresetDrawerId = () => {
  return nextPresetDrawerId++;
};

class UnsupportedServerUpdate extends Error {
  name: "UnsupportedServerUpdate";
  constructor(m: string) {
    super(m);
  }
}

export function calculateNextVersionKey(studioCtx: StudioCtx) {
  return invalidationKey(
    "calculateNextPublishVersion",
    studioCtx.branchInfo()?.id
  );
}

export enum RightTabKey {
  style = "style",
  settings = "settings",
  "old-settings" = "old-settings",
  comments = "comments",
  component = "component",
}

const THUMBNAIL_DURATION = 1000 * 60 * 5; // 5 minutes to recompute thumbnail
const RECENT_ARENAS_LIMIT = 5;

export class StudioCtx extends WithDbCtx {
  //
  // Keep track of modifier keys and space keys as they are pressed
  //

  private static SPACE = 32;
  private static META = 91;
  private static SHIFT = 16;
  private static CTRL = 17;
  private static ALT = 18;
  private disposals: (() => void)[] = [];
  _dbCtx: DbCtx;
  readonly commentsCtx: CommentsCtx;
  readonly clipboard = new LocalClipboard();
  fontManager: FontManager;
  previewCtx: PreviewCtx | undefined;
  _viewportCtx = observable.box<ViewportCtx | null>(null);
  get viewportCtx() {
    return this._viewportCtx.get();
  }
  set viewportCtx(value: ViewportCtx | null) {
    this._viewportCtx.set(value);
  }

  studioIsVisible = false;
  latestVariantCreated: Variant | undefined = undefined;
  latestVariantGroupCreated: VariantGroup | undefined = undefined;

  private hostLessRegistry: CodeComponentsRegistry;
  private installedHostLessPkgs = observable.set<string>();
  private hostLessPkgsFrame: HTMLIFrameElement;
  private hostLessPkgsLock = Promise.resolve();

  //
  // Currently-displayed tabs on the left and right panels
  //
  private _xLeftTabKey: IObservableValue<LeftTabKey | undefined> =
    observable.box(undefined);

  readonly hostPageHtml: Promise<string>;

  constructor(args: StudioCtxArgs) {
    super();

    makeObservable(this, {
      studioIsVisible: observable,
      latestVariantCreated: observable,
      isAtTip: observable,
      _changeCounter: observable,
      _savedChangeCounter: observable,
      _isUnlogged: observable,
    });

    ({ dbCtx: this._dbCtx } = args);
    this.commentsCtx = new CommentsCtx(this);

    this.rightTabKey = this.appCtx.appConfig.rightTabs
      ? RightTabKey.settings
      : RightTabKey.style;

    this.getInitialLeftTabKey()
      .then((key) => {
        this.leftTabKey = key;
      })
      .catch((e) => console.error(e));
    this.setHostLessPkgs();

    this.bundler()
      .allIidsByUuid(this.siteInfo.id)
      .forEach((iid) => this._savedIids.add(iid));

    this.asyncSaver = asyncOneAtATime(
      this.trySave.bind(this),
      SaveResult.Throttled
    );
    // We keep this timer enabled even if we are in read-only mode, in case the
    // user keeps making changes.
    //
    // Usually, we immediately get a non-error notice.  Then, when we try
    // editing, we get an error.  After that, we don't show any more errors.
    //
    // This could be better (we can keep erroring as the user makes changes) but
    // we should really just move away from this mode of allowing the user to
    // continue making edits.  (And longer term, need real-time collaboration.)
    this.asyncSaverTimer = window.setInterval(() => {
      if (DEVFLAGS.autoSave && this.canEditProject()) {
        spawn(
          this.asyncSaver().then((r) => {
            console.log("Save result is", r);
            if (r === SaveResult.StopSaving) {
              window.clearInterval(this.asyncSaverTimer);
            }
          })
        );
      }
    }, 2000);

    this._serverUpdatesSummary = getEmptyDeletedAssetsSummary();
    this.undoLog = new UndoLog(
      this.site,
      this.recorder,
      this._serverUpdatesSummary
    );

    // handleInitialRoute will create the first undo record
    spawn(this.handleInitialRoute());

    this.projectDependencyManager = new ProjectDependencyManager(this);

    // styleMgr must be instantiated after ProjectDependencyManager, as
    // it makes use of TPL_COMPONENT_ROOT updates that ProjectDependencyManager
    // will perform
    this.styleMgr = new StyleMgr(this);

    this.fontManager = new FontManager(this.site);
    this.fontManager.installAllUsedFonts([$(document.head)]);

    this.isDocs = !!UU.projectDocs.parse(location.pathname, false);

    spawn(
      this.getProjectReleases().then((releases) =>
        this.releases.push(...releases)
      )
    );

    this.disposals.push(
      this.appCtx.history.listen((location) => {
        spawn(this.handleRouteChange(location));
      }),
      autorun(
        async () => {
          const arenaFrames = getArenaFrames(this.previousArena);
          if (!isKnownComponentArena(this.previousArena)) {
            return;
          }
          if (arenaFrames.length === 0) {
            return;
          }
          const arenaFrame = arenaFrames[0];
          const viewCtx = this.tryGetViewCtxForFrame(arenaFrame);
          if (!viewCtx || !isPlainComponent(viewCtx.component)) {
            return;
          }
          const currentComponent = viewCtx.currentComponent();

          if (!this.hasCachedThumbnail(currentComponent.uuid)) {
            try {
              const thumbnail = await viewCtx.canvasCtx.getThumbnail();
              this.saveThumbnail(currentComponent.uuid, thumbnail);
            } catch (e) {
              debugger;
            }
          }
        },
        {
          name: "StudioCtx.setComponentThumbnails",
        }
      ),
      autorun(
        async () => {
          const projectName = this.siteInfo.name;
          const branch = this.dbCtx().branchInfo;
          const branchName = branch ? branch.name : MainBranchId;
          const version = this.dbCtx().pkgVersionInfoMeta?.version;
          const arenaName = this.currentArena
            ? getArenaName(this.currentArena)
            : undefined;

          let title = `${projectName} - Plasmic`;
          if (arenaName) {
            if (version && !isLatest(version)) {
              title = `${arenaName} (${branchName}@${version}) - ${projectName} - Plasmic`;
            } else if (branch) {
              title = `${arenaName} (${branchName}) - ${projectName} - Plasmic`;
            } else {
              title = `${arenaName} - ${projectName} - Plasmic`;
            }
          }
          await this.appCtx.topFrameApi?.setDocumentTitle(title);
        },
        {
          name: "StudioCtx.setDocumentTitle",
        }
      ),
      reaction(
        () => [this.currentArena, getAllSiteFrames(this.site)],
        () => defer(() => this.framesChanged.dispatch())
      ),
      autorun(
        () => {
          if (!this.isAtTip) {
            this.blockChanges = true;
            if (this.alertBannerState.get() !== AlertSpec.Watch) {
              createDarkMask(this);
            }
            spawn(this.multiplayerCtx.updateSessions([]));
            spawn(this.stopListeningForSocketEvents());
          }
        },
        { name: "StudioCtx.createDarkMask" }
      ),
      autorun(
        () => {
          if (!this.canEditProject() || !this.canEditBranch()) {
            this.blockChanges = true;
          } else {
            this.blockChanges = false;
          }
        },
        { name: "StudioCtx.updateBlockChanges" }
      ),
      autorun(
        () => {
          if (!isDedicatedArena(this.currentArena)) {
            return;
          }

          const focusPreference = this.focusedMode;
          this.focusPreference.set(focusPreference);
          spawn(
            this.appCtx.api.addStorageItem(
              this.mkFocusPreferenceKey(),
              focusPreference ? "true" : "false"
            )
          );
        },
        { name: "StudioCtx.updateFocusPreference" }
      ),
      reaction(
        () => [getSiteArenas(this.site)],
        () => {
          this.recentArenas = this.recentArenas.filter((arena) =>
            isValidArena(this.site, arena)
          );
        },
        { name: "StudioCtx.fixRecentArenas" }
      ),
      ...(this.appCtx.appConfig.incrementalObservables
        ? [
            autorun(
              () => {
                const currentArena = this.currentArena;
                if (!currentArena) {
                  return;
                }
                const componentsToObserve = isDedicatedArena(currentArena)
                  ? [currentArena.component]
                  : currentArena.children.map(
                      (child) => child.container.component
                    );
                this.dbCtx().maybeObserveComponents(
                  componentsToObserve,
                  ComponentContext.Arena
                );
              },
              { name: "StudioCtx.observeCurrentArena" }
            ),
            autorun(
              () => {
                const currentViewCtxComponent =
                  this.focusedViewCtx()?.currentComponent();
                if (!currentViewCtxComponent) {
                  return;
                }
                const componentsToObserve = [currentViewCtxComponent];
                this.dbCtx().maybeObserveComponents(
                  componentsToObserve,
                  ComponentContext.View
                );
              },
              { name: "StudioCtx.observeCurrentViewCtx" }
            ),
          ]
        : []),
      autorun(() => {
        if (!isHostLessPackage(this.site)) {
          this.updatePkgsList(usedHostLessPkgs(this.site));
        }
      }),
      reaction(
        () => this.isTransforming(),
        () => {
          // Things that should be fixed upon canvas transform
          this.fixRuler();
          this.adjustDevEnv(this.zoom);
        }
      )
    );

    const hostPageUrl = (toggleTrailingSlash: boolean) =>
      maybeToggleTrailingSlash(
        toggleTrailingSlash,
        this.getHostUrl({ fixHostOrigin: true })
      );

    const fetchHostPageHtml = async () => {
      const fetchUrl = async (url: string) => {
        const res = await fetch(url, {
          redirect: "follow",
          headers: this.siteInfo.extraData?.customHostConfig?.headers,
        });
        return await res.text();
      };

      try {
        return await fetchUrl(hostPageUrl(false));
      } catch (err) {
        return await fetchUrl(hostPageUrl(true));
      }
    };

    this.hostPageHtml = fetchHostPageHtml();
  }

  private setHostLessPkgs() {
    this.hostLessPkgsFrame = document.createElement("iframe");
    this.hostLessPkgsFrame.style.display = "none";
    document.body.appendChild(this.hostLessPkgsFrame);
    const hostLessWindow = ensure(
      this.hostLessPkgsFrame.contentWindow,
      "the hostless window must be non null"
    );
    (hostLessWindow as any).__Sub = (window as any).__Sub;
    this.hostLessRegistry = new CodeComponentsRegistry(
      hostLessWindow,
      getBuiltinComponentRegistrations()
    );
    this.installedHostLessPkgs.clear();
  }

  private async getInitialLeftTabKey() {
    const existingLeftTabKey = await this.appCtx.api.getStorageItem(
      this.leftTabKeyLocalStorageKey()
    );
    const filteredKey = LEFT_TAB_PANEL_KEYS.find(
      (key) => key === existingLeftTabKey
    );
    return filteredKey;
  }

  async updateCcRegistry(pkgs: string[]) {
    const previousFetch = this.hostLessPkgsLock;
    this.hostLessPkgsLock = new Promise(
      spawnWrapper(async (resolve: () => void) => {
        await previousFetch;
        const pkgsData = await getSortedHostLessPkgs(
          pkgs,
          getVersionForCanvasPackages(this.hostLessPkgsFrame.contentWindow)
        );
        runInAction(() => {
          // We run in action because `installedHostLessPkgs` is observable
          // so we want computed values to re-compute only after all packages
          // have been installed and the `ccRegistry` is cleared
          for (const [pkg, pkgModule] of pkgsData) {
            if (!this.installedHostLessPkgs.has(pkg)) {
              const hostLessWindow = ensure(
                this.hostLessPkgsFrame.contentWindow,
                "hostless window must be non null"
              );
              scriptExec(hostLessWindow, pkgModule);
              this.installedHostLessPkgs.add(pkg);
            }
          }
          // Clear the memoized map
          this.hostLessRegistry.clear();
        });
        resolve();
      })
    );
    await this.hostLessPkgsLock;
  }

  private updatePkgsList(pkgs: string[]) {
    if (pkgs.some((pkg) => !this.installedHostLessPkgs.has(pkg))) {
      spawn(this.updateCcRegistry(pkgs));
    }
  }

  getHostLessComponentsMap() {
    return this.hostLessRegistry.getRegisteredCodeComponentsMap();
  }

  getHostLessContextsMap() {
    return this.hostLessRegistry.getRegisteredContextsMap();
  }

  getHostUrl(opts?: { fixHostOrigin?: boolean }) {
    return getHostUrl(
      this.siteInfo,
      this.branchInfo(),
      this.appCtx.appConfig,
      opts?.fixHostOrigin
    );
  }

  get hoverBoxControlledObj() {
    const vc = this.focusedViewCtx();

    if (!vc) {
      return this.focusedFrame();
    }
    const frame = vc.arenaFrame();
    const obj = vc.focusedSelectable();

    if (!obj) {
      if (vc.focusedTpl()) {
        // We have a focused tpl that is hidden. Don't select the frame!
        return undefined;
      }
      return frame;
    }

    if (
      obj instanceof ValNode &&
      vc.getViewOps().isRootNodeOfStretchFrame(obj.tpl)
    ) {
      // If we're focused on the root node of a stretching frame, then HoverBox is really
      // controlling the position and size of the frame, not the root node
      return frame;
    }

    return obj;
  }

  get hoverBoxControlledObjs() {
    const vc = this.focusedViewCtx();

    if (!vc) {
      return [this.focusedFrame()];
    }
    const frame = vc.arenaFrame();
    const obj = vc.focusedSelectables();

    const focusedTpls = vc.focusedTpls();
    assert(
      obj.length === focusedTpls.length,
      "focusedSelectable and focusedTpls should have the same length."
    );

    if (
      obj.every((sel, i) => sel === undefined && focusedTpls[i] === undefined)
    ) {
      return [frame];
    }

    if (
      obj.length === 1 &&
      obj[0] instanceof ValNode &&
      vc.getViewOps().isRootNodeOfStretchFrame(obj[0].tpl)
    ) {
      // If we're focused on the root node of a stretching frame, then HoverBox is really
      // controlling the position and size of the frame, not the root node
      return [frame];
    }

    return obj;
  }

  /** Default arena to use (e.g. arena not specified in URL, current arena deleted). */
  private firstArena(): AnyArena | undefined {
    // prefer custom/mixed arenas
    if (this.site.arenas.length > 0) {
      return this.site.arenas[0];
    }

    const firstPageOrComponent =
      this.site.components.find((comp) => comp.pageMeta?.path === "/") ||
      this.site.components.find((comp) => isPageComponent(comp)) ||
      this.site.components.find((comp) => isPlainComponent(comp));
    return firstPageOrComponent
      ? this.getDedicatedArena(firstPageOrComponent)
      : undefined;
  }

  switchToFirstArena() {
    this.switchToArena(this.firstArena(), { replace: true });
  }

  finishedLoading() {
    this._dbCtx.recorder.setExtraListener(() =>
      assert(
        (this._isChanging && this.recorder.isRecording) ||
          (this._isUndoing && this.recorder.isRecording) ||
          (this._isRefreshing && this.recorder.isRecording) ||
          this._isRestoring,
        "Invariant Failed: Unexpected model change"
      )
    );
  }

  dbCtx() {
    return this._dbCtx;
  }

  siteOps() {
    return new SiteOps(this);
  }

  projectFlags() {
    return computedProjectFlags(this.site);
  }

  async refreshSiteInfo() {
    const {
      project,
      perms,
      owner,
      latestRevisionSynced,
      hasAppAuth,
      appAuthProvider,
      workspaceTutorialDbs,
      isMainBranchProtected,
    } = await this.appCtx.api.getSiteInfo(this.siteInfo.id);
    this.dbCtx().setSiteInfo({
      ...project,
      perms,
      owner,
      latestRevisionSynced,
      hasAppAuth,
      appAuthProvider,
      workspaceTutorialDbs,
      isMainBranchProtected,
    });
    return this.siteInfo;
  }

  changeFrameSize({
    frame = this.focusedViewCtx()!.arenaFrame(),
    dim,
    amount,
  }: {
    dim: "width" | "height";
    amount: number;
    frame?: ArenaFrame;
  }) {
    frame[dim] = amount;

    if (dim === "width") {
      if (isComponentArena(this.currentArena) && !this.focusedMode) {
        ensureActivatedScreenVariantsForComponentArenaFrame(
          this.site,
          this.currentArena,
          frame
        );
      } else {
        ensureActivatedScreenVariantsForFrameByWidth(this.site, frame);
      }
    } else {
      if (isHeightAutoDerived(frame)) {
        updateAutoDerivedFrameHeight(frame, amount);
      }
    }
  }

  spreadNewFrameSize(frame: ArenaFrame) {
    syncArenaFrameSize(
      this.site,
      ensure(this.currentArena, "current arena must exist"),
      frame
    );
    reorderPageArenaCols(this.site);

    // When we update frame sizes on a component arena,
    // if updating height, all frames starting on the second row,
    // will "move"; if updating width, all frames starting on
    // second column, will "move" too.
    // We need to dispatch a signal to make sure the hover box will
    // have its position updated.
    defer(() => this.framesChanged.dispatch());

    this.tryZoomToFitArena();
  }

  isPositionManagedFrame(frame: ArenaFrame) {
    return this.focusedMode || (frame.left == null && frame.top == null);
  }

  /**
   * @deprecated use {@link getRootSubReact} instead.
   */
  getRootSubReact() {
    return getRootSubReact();
  }

  getPlumeSite() {
    return this.projectDependencyManager.plumeSite;
  }

  //
  // Change management -- entrypoint for all model and view changes
  //
  private _isChanging = false;
  private _isUndoing = false;
  private _isRestoring = false;
  private _isRefreshing = false;
  private _changeOpts: StudioChangeOpts[] = [];

  isChanging() {
    return this._isChanging;
  }

  /**
   * @deprecated
   * Don't use this function; you should either await or explicitly spawn.
   * This is for old callsites that we didn't decide what to do yet and might
   * require some refactoring.
   * @param f
   * @param opts
   */
  changeSpawn(f: () => void, opts: StudioChangeOpts = {}) {
    spawn(this.changeUnsafe(f, opts));
  }

  /**
   * @deprecated Use {@link change} to deal with typed errors
   * @param f
   * @param opts
   * @returns
   */
  async changeUnsafe<Result = void>(
    f: () => Result,
    opts: StudioChangeOpts = {}
  ) {
    const result = await this.change<any, Result>(({ success, failure }) => {
      try {
        const res = f();
        if ((res as unknown) instanceof Promise) {
          reportError(
            new Error("Change function cannot be async"),
            "Async changeFn"
          );
        }
        return success(res);
      } catch (err) {
        return failure(err);
      }
    }, opts);
    return result.match({
      success: (res) => res,
      failure: (err) => {
        throw err;
      },
    });
  }

  async change<E = never, Result = void>(
    f: (args: FailableArgParams<Result, E>) => IFailable<Result, E>,
    opts: StudioChangeOpts = {}
  ): Promise<IFailable<Result, E>> {
    return this._change(f, opts);
  }

  /**
   * Observes a list of component before applying the changes
   */
  async changeObserved<E = never, Result = void>(
    c: () => Component[],
    f: (args: FailableArgParams<Result, E>) => IFailable<Result, E>,
    opts: StudioChangeOpts = {}
  ): Promise<IFailable<Result, E>> {
    if (!this.appCtx.appConfig.incrementalObservables) {
      return this._change(f, opts);
    }
    const changedComponents = c();
    this.dbCtx().maybeObserveComponents(changedComponents);
    return this._change(f, opts);
  }

  async _change<E = never, Result = void>(
    f: (args: FailableArgParams<Result, E>) => IFailable<Result, E>,
    opts: StudioChangeOpts = {}
  ): Promise<IFailable<Result, E>> {
    if (this._isChanging) {
      /* reportError(
        new Error("There shouldn't be nested calls of .change()"),
        "Nested changeFn"
      ); */
      this._changeOpts.push(opts);
      const res = failable<Result, E>((args) => f(args));
      await drainQueue(this.modelChangeQueue);
      return res;
    } else {
      if (!this.modelChangeQueue.idle() && opts.event) {
        if (opts.event.persist) {
          console.log("Async change; persisting event", opts.event);
          opts.event.persist();
        } else {
          console.warn(
            "Async change, but no event.persist(); change was wrapped in another async change call."
          );
        }
      }
      let actualRes: any;
      const res = new Promise<IFailable<Result, E>>((resolve, reject) => {
        this.modelChangeQueue.push<IFailable<Result, E>, Error>(
          {
            type: "change",
            changeFn: () => {
              const iFailable = failable<Result, E>((args) => f(args));
              if (!iFailable.result.isError) {
                actualRes = iFailable.result.value;
              }
              return iFailable;
            },
            opts,
          },
          (err, result) => {
            if (err != null) {
              reject(err);
            } else {
              assert(result, "");
              resolve(
                ensure(
                  result.map((_r) => actualRes),
                  "if you don't find a result, it should throw an error"
                )
              );
            }
          }
        );
      });
      (this.modelChangeQueue as any).process();
      await drainQueue(this.modelChangeQueue);
      return res;
    }
  }

  private changeInternal<E>(
    f: () => IFailable<void, E>,
    opts: StudioChangeOpts = {}
  ) {
    assert(!this._isChanging, "isChanging should be false");
    return failable<void, E>(({ success, failure }) => {
      // Save some view state about each ViewCtx, so we know which of them
      // will need to be re-evaluated after f().
      const previousComponentCtxs = new Map<ViewCtx, ComponentCtx | null>(
        this.viewCtxs.map((vc) => tuple(vc, vc.currentComponentCtx()))
      );
      const vcToSpotlightAndVariantsInfo = new Map<
        ViewCtx,
        SpotlightAndVariantsInfo
      >(this.viewCtxs.map((vc) => tuple(vc, vc.getSpotlightAndVariantsInfo())));
      const showPlaceholderBeforeChange = this._showSlotPlaceholder.get();
      const isInteractiveModeBeforeChange = this.isInteractiveMode;

      // First, we perform a runInAction for f(), as well as all associated
      // changes that are mutating the top-level observables (specifically,
      // all the TplNodes and view-level observables, but not the ValNodes)
      const maybeSummary = runInAction(() =>
        failable<
          {
            summary: ChangeSummary;
            styleChanges: UpsertStyleChanges | undefined;
          },
          E
        >(({ success: suc, failure: fail }) => {
          this._isChanging = true;
          this._changeOpts = [opts];
          try {
            const maybeChanges = this.recorder.withRecording<E>(f);
            if (maybeChanges.result.isError) {
              return fail(maybeChanges.result.error);
            }

            const [newChanges, summary] = fixupForChanges(
              this,
              maybeChanges.result.value
            );

            if (newChanges.changes.length > 0) {
              if (!this.isUnlogged()) {
                logChangedNodes("CHANGES:", newChanges.changes, false);
                console.log("Change summary", summary);
              }
            }

            const styleChanges = this.syncAfterChanges(summary);

            // Record the changes to undo log before we kick off the evaluators.
            // That's because evaluators may invoke some postEval() handlers that
            // will create new undo records (for example, viewCtx.selectNewTpl),
            // and those new records may need to be merged with this record here.
            if (this.isUnlogged()) {
              this._queuedUnloggedChanges = mergeRecordedChanges(
                this._queuedUnloggedChanges,
                newChanges
              );
            } else if (opts.noUndoRecord) {
              if (this.canUndo()) {
                this.undoLog.appendChangesToLastRecord({
                  changes: newChanges,
                  view: this.currentViewState(),
                });
              }
              this.addToChangeRecords(newChanges);
            } else {
              this.recordAndMarkDirty(newChanges);
            }

            return suc({ summary, styleChanges });
          } finally {
            this._isChanging = false;
          }
        })
      );

      if (maybeSummary.result.isError) {
        return failure(maybeSummary.result.error);
      }

      const { summary, styleChanges } = maybeSummary.result.value;

      // Next, we evaluate the ViewCtxs that need to be evaluated.  By now,
      // after the above runInAction, changes that happened would've marked
      // the dependencies of evaluation as stale.

      const focusedVC = this.focusedViewCtx();

      const showPlaceholderChanged =
        showPlaceholderBeforeChange !== this._showSlotPlaceholder.get();
      const interactiveModeChanged =
        isInteractiveModeBeforeChange !== this.isInteractiveMode;

      const shouldEvaluate = (vc: ViewCtx) => {
        return this.shouldEvaluateViewCtx(vc, {
          summary,
          showPlaceholderChanged,
          interactiveModeChanged,
          previousComponentCtx: previousComponentCtxs.get(vc),
          previousVcInfo: vcToSpotlightAndVariantsInfo.get(vc),
        });
      };

      const shouldRestyle = (vc: ViewCtx) => {
        // Should update vc style if it's never had styles before,
        // or if there has been style changes
        return !vc.valState().maybeValSysRoot() || !!styleChanges;
      };

      // give precedence to the focused viewCtx so that the postEvalTasks added
      // to the current viewCtx is not cleared when current viewCtx is being
      // evaluated
      this.viewCtxs.forEach((vc) => {
        vc.scheduleSync({
          eval: shouldEvaluate(vc),
          styles: shouldRestyle(vc),
          asap: vc === focusedVC,
        });
      });

      return success();
    });
  }

  observeComponents(components: Component[]) {
    return this.dbCtx().maybeObserveComponents(components);
  }

  private _isDocs = observable.box(false);

  set isDocs(v: boolean) {
    this._isDocs.set(v);
  }

  get isDocs() {
    return this._isDocs.get();
  }

  private addToChangeRecords(changes: RecordedChanges) {
    if (changes.changes.length > 0) {
      // If there were actual model changes, mark as dirty
      this._changeRecords.push(changes);
      this._changeCounter += 1;
    }
  }

  recordAndMarkDirty(changes: RecordedChanges) {
    const allChanges = mergeRecordedChanges(
      this._queuedUnloggedChanges,
      changes
    );
    this.undoLog.record(this.createUndoRecord(allChanges));
    this._queuedUnloggedChanges = emptyRecordedChanges();
    this.addToChangeRecords(allChanges);

    if (this.blockChanges && !emptyChanges(allChanges)) {
      // Undo all model changes since we are not saving
      this.blockChanges = false;
      defer(() => this.undo().then(() => (this.blockChanges = true)));
    }
  }

  _isUnlogged = false;
  private _queuedUnloggedChanges: RecordedChanges = emptyRecordedChanges();
  stopUnlogged() {
    this._isUnlogged = false;
    if (!this._isChanging) {
      // If we're not in a change block, then record the changes that were previoulsy
      // unlogged.  Else we let the outer change block do it.
      this.recordAndMarkDirty(emptyRecordedChanges());
    }
  }

  startUnlogged() {
    this._isUnlogged = true;
  }

  isUnlogged() {
    return this._isUnlogged;
  }

  hasPendingModelChanges() {
    return !this.modelChangeQueue.idle();
  }

  async awaitEval() {
    await drainQueue(this.modelChangeQueue);
    await Promise.all(this.viewCtxs.map((vc) => vc.awaitSync()));
  }

  private modelChangeQueue = (() => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const asyncQueue = asynclib.queue<
      ModelChangeRequest,
      IFailable<void, Error> | undefined,
      Error
    >(
      safeCallbackify(async (request: ModelChangeRequest) => {
        if (request.type === "change") {
          const result = this.changeInternal(request.changeFn, request.opts);
          if (result.result.isError) {
            showError(result.result.error);
          }
          return result;
        } else if (request.type === "fetchModelUpdates") {
          await this.fetchUpdatesInternal();
          return undefined;
        } else {
          await this.restoreUndoRecordInternal(request.type);
          return undefined;
        }
      }),
      1
    );
    asyncQueue.error((error, _task) => {
      handleError(error);
      throw error;
    });
    return asyncQueue;
  })();

  //
  // Managing all ViewCtxs in the current view, one for each artboard
  //

  /** Observable list of ViewCtxs */
  viewCtxs = observable.array<ViewCtx>();

  private frame2ViewCtx = computedFn(
    () =>
      new Map<ArenaFrame, ViewCtx>(
        [...this.viewCtxs].map((vc) => [vc.arenaFrame(), vc] as const)
      ),
    { name: "frame2ViewCtx" }
  );

  tryGetViewCtxForFrame = computedFn(
    (frame: ArenaFrame | undefined) => {
      return frame && this.frame2ViewCtx().get(frame);
    },
    { name: "tryGetViewCtxForFrame" }
  );

  private frameToViewCtxPromise = new Map<
    ArenaFrame,
    [Promise<ViewCtx>, (vc: ViewCtx) => void]
  >();
  async awaitViewCtxForFrame(frame: ArenaFrame) {
    const vc = this.tryGetViewCtxForFrame(frame);
    if (vc) {
      return vc;
    }

    if (this.frameToViewCtxPromise.get(frame)) {
      return ensure(
        this.frameToViewCtxPromise.get(frame),
        "you should find a viewCtx from the frame"
      )[0];
    }

    let resolve;
    const promise = new Promise<ViewCtx>((res) => (resolve = res));
    this.frameToViewCtxPromise.set(frame, tuple(promise, resolve));
    return promise;
  }

  pruneInvalidViewCtxs() {
    const allLiveFrames = new Set(
      getSiteArenas(this.site)
        .filter((arena) => this.isArenaAlive(arena))
        .flatMap((arena) => getArenaFrames(arena))
    );
    const liveVcs = this.viewCtxs.filter((vc) =>
      allLiveFrames.has(vc.arenaFrame())
    );

    if (liveVcs.length !== this.viewCtxs.length) {
      const disposedVcs = this.viewCtxs.filter((vc) => !liveVcs.includes(vc));
      disposedVcs.forEach((vc) => vc.dispose());
      console.log("PRUNING VCs", disposedVcs);
      this.viewCtxs.replace(liveVcs);
    }

    for (const frame of this.frameToViewCtxPromise.keys()) {
      if (!allLiveFrames.has(frame)) {
        this.frameToViewCtxPromise.delete(frame);
      }
    }

    const focusedVc = this.focusedViewCtx();
    if (focusedVc && !this.viewCtxs.includes(focusedVc)) {
      this.setStudioFocusOnFrame({ frame: undefined });
    }
  }

  disposeViewCtx(vc: ViewCtx) {
    this.viewCtxs.replace([...this.viewCtxs].filter((v) => v !== vc));
    vc.dispose();
    const focusedVc = this.focusedViewCtx();
    if (focusedVc && !this.viewCtxs.includes(focusedVc)) {
      this.setStudioFocusOnFrame({ frame: undefined });
    }
  }

  dispose() {
    this.disposals.forEach((d) => d());
    this.clearUndoLog();
    this.viewInfoObserverDispose?.();
    this.watchPlayerDispose?.();
    this.dbCtx().dispose();
    this.viewCtxs.forEach((vc) => vc.dispose());
    this.viewCtxs.clear();
    this.commentsCtx.dispose();
    window.clearInterval(this.asyncSaverTimer);
    spawn(this.stopListeningForSocketEvents());
  }

  // Does not require running inside `studioCtx.change`
  createViewCtx(frame: ArenaFrame, canvasCtx: CanvasCtx) {
    const existing = this.tryGetViewCtxForFrame(frame);

    if (existing) {
      removeFromArray(this.viewCtxs, existing);
      existing.dispose();
    }

    const viewCtx = new ViewCtx({
      studioCtx: this,
      viewportCtx: this.viewportCtx!,
      canvasCtx,
      arenaFrame: frame,
    });

    this.viewCtxs.push(viewCtx);

    if (this.frameToViewCtxPromise.has(frame)) {
      const [_promise, resolve] = ensure(
        this.frameToViewCtxPromise.get(frame),
        "you should find a viewCtx from the frame"
      );
      resolve(viewCtx);
      this.frameToViewCtxPromise.delete(frame);
    }

    // If we're currently focused on the frame but just now created the viewCtx for
    // that frame, then also focus on this viewCtx
    if (frame === this.focusedFrame()) {
      this.setStudioFocusOnFrame({ frame: frame, autoZoom: false });

      // As part of initialization, make sure we have the appropriate variant
      // settings created for this viewCtx now in focus.  For example, maybe
      // the user created a new variant while focused on some leaf element, and
      // then reloads the page.  By default, we will focus on the frame, and
      // possibly the root element of the frame if it's a "Stretch" frame; in
      // that case, we'll want to make sure the root element has the right
      // variant setting for the new variant, as that's what we'll be displaying
      // in the right tab.

      // `fixupChrome` might change the data model creating new variant
      // settings. As we might not be running inside studioCtx.change, we call
      // it here.
      spawn(this.changeUnsafe(() => fixupChrome(this), { noUndoRecord: true }));
    }

    viewCtx.scheduleSync({
      styles: true,
      eval: true,
    });
    return viewCtx;
  }

  //
  // Managing arena
  //

  private _currentArena = observable.box<AnyArena | null>(null);
  private _recentArenas = observable.box<AnyArena[]>([]);

  get currentArena() {
    return this._currentArena.get();
  }

  set currentArena(arena: AnyArena | null) {
    if (arena) {
      const fixedRecentArenas = this.recentArenas.filter((a) => {
        return a !== arena && isValidArena(this.site, a);
      });
      fixedRecentArenas.push(arena);
      if (fixedRecentArenas.length > RECENT_ARENAS_LIMIT) {
        fixedRecentArenas.shift();
      }
      this.recentArenas = fixedRecentArenas;
    }
    this._currentArena.set(arena);
  }

  get previousArena() {
    const recentLength = this.recentArenas.length;
    return recentLength >= 2 ? this.recentArenas[recentLength - 1] : null;
  }

  get recentArenas() {
    return this._recentArenas.get();
  }

  set recentArenas(arenas: AnyArena[]) {
    this._recentArenas.set(arenas);
  }

  get currentComponent() {
    return isDedicatedArena(this.currentArena)
      ? this.currentArena.component
      : undefined;
  }

  private arenaViewStates = observable.map<AnyArena, ArenaViewInfo>();

  getCurrentStudioViewportSnapshot(): StudioViewportSnapshot {
    return {
      focusedArenaFrame: this.focusedViewCtx()?.arenaFrame(),
      scroll: this.viewportCtx!.scroll(),
      scale: this.viewportCtx!.scale(),
    };
  }

  restoreStudioViewportSnapshot(
    snapshot: StudioViewportSnapshot,
    restoreFrameFocus: boolean
  ) {
    if (restoreFrameFocus) {
      this.setStudioFocusOnFrame({
        frame: snapshot.focusedArenaFrame,
        autoZoom: false,
      });
    }

    this.viewportCtx!.enqueueTransform(snapshot.scale, snapshot.scroll, false);
  }

  canEditComponent(component: Component) {
    return !this.contentEditorMode || component.editableByContentEditor;
  }

  getSortedPageArenas = computedFn(() => {
    return naturalSort(this.site.pageArenas, (it) => it.component.name).filter(
      (arena) => this.canEditComponent(arena.component)
    );
  });

  getSortedMixedArenas = computedFn(() => {
    return this.contentEditorMode ? [] : this.site.arenas;
  });

  getSortedComponentArenas = computedFn(() => {
    const componentArenas: ComponentArena[] = [];
    const addComponentArena = (compArena: ComponentArena) => {
      componentArenas.push(compArena);
      for (const subComp of compArena.component.subComps) {
        const subArena = this.getDedicatedArena(subComp) as
          | ComponentArena
          | undefined;
        if (subArena) {
          addComponentArena(subArena);
        }
      }
    };
    for (const compArena of naturalSort(
      this.site.componentArenas,
      (it) => it.component.name
    )) {
      if (compArena.component.superComp) {
        // Sub-components are added when dealing with super components
        continue;
      }

      if (!this.canEditComponent(compArena.component)) {
        continue;
      }

      addComponentArena(compArena);
    }
    return componentArenas;
  });

  /** Switches the branch and version only. */
  switchToBranch(
    branch: ApiBranch | undefined,
    pkgVersionInfoMeta?: PkgVersionInfoMeta,
    opts?: { replace?: boolean }
  ) {
    return this.switchRoute({
      branch,
      pkgVersionInfoMeta,
      arena: this.currentArena,
      ...opts,
    });
  }

  /** Switches the branch version only. */
  switchToBranchVersion(
    pkgVersionInfoMeta: PkgVersionInfoMeta | undefined,
    opts?: { replace?: boolean }
  ) {
    return this.switchToBranch(
      this.dbCtx().branchInfo,
      pkgVersionInfoMeta,
      opts
    );
  }

  refreshFocusedFrameArena() {
    assert(
      isDedicatedArena(this.currentArena) && this.currentArena._focusedFrame,
      "Can't refresh: not in focus mode"
    );

    this.currentArena._focusedFrame = cloneArenaFrame(
      this.currentArena._focusedFrame
    );
    this.refreshFetchedDataFromPlasmicQuery();
  }

  /**
   * Switches the arena only, synchronously updating currentArena and the route.
   *
   * This method needs to be synchronous, to ensure the undo log
   * can batch arena and view changes in the same record.
   */
  switchToArena(
    arena: Arena | PageArena | ComponentArena | null | undefined,
    opts?: {
      noFocusedModeChange?: boolean;
      replace?: boolean;
      stopWatching?: boolean;
    }
  ) {
    if (isDedicatedArena(arena) && !this.canEditComponent(arena.component)) {
      const error = new Error(
        `Tried to switch to an component arena as a content editor without access to it`
      );
      console.error(error);
      Sentry.captureException(error);
      return;
    } else if (isMixedArena(arena) && this.contentEditorMode) {
      const error = new Error(
        `Tried to switch to an mixed arena as a content editor`
      );
      console.error(error);
      Sentry.captureException(error);
      return;
    }

    this.changeArena(arena ?? null, {
      noFocusedModeChange: opts?.noFocusedModeChange,
    });
    this.switchRoute({
      branch: this.dbCtx().branchInfo,
      pkgVersionInfoMeta: this.dbCtx().pkgVersionInfoMeta,
      arena: arena ?? null,
      replace: opts?.replace,
      stopWatching: opts?.stopWatching,
    });
  }

  /**
   * Switches the route, if target location's path is different.
   * @param branch branch to load, undefined for main branch
   * @param pkgVersionInfoMeta pkg version in branch to load, undefined for latest version
   * @param arena arena to load, null for empty projects with no arenas
   * @param replace pushes by default, true to replace
   * @param stopWatching stops watching by default, false to continue watching
   */
  private switchRoute({
    branch,
    pkgVersionInfoMeta,
    arena,
    replace,
    stopWatching,
  }: {
    branch: ApiBranch | undefined;
    pkgVersionInfoMeta: PkgVersionInfoMeta | undefined;
    arena: AnyArena | null;
    replace?: boolean;
    stopWatching?: boolean;
  }) {
    const branchName = branch?.name || MainBranchId;
    const branchVersion = pkgVersionInfoMeta?.version || latestTag;
    if (arena) {
      const arenaType = switchType(arena)
        .when(Arena, () => "custom" as const)
        .when([ComponentArena, PageArena], (v) =>
          isKnownComponentArena(v) ? ("component" as const) : ("page" as const)
        )
        .result();
      const arenaUuidOrName = getArenaUuidOrName(arena);
      const arenaName = getArenaName(arena);
      const slug = arenaName
        .replaceAll(/(^\W+|\W+$)/g, "")
        .replaceAll(/\W+/g, "-");
      this.switchRouteRaw({
        branchName,
        branchVersion,
        arenaType,
        arenaUuidOrName,
        slug,
        replace,
        stopWatching,
      });
    } else {
      // Arena could be null/undefined if the project has no arenas (i.e. 0 pages/components)
      this.switchRouteRaw({
        branchName,
        branchVersion,
        arenaType: undefined,
        arenaUuidOrName: undefined,
        slug: undefined,
        replace,
        stopWatching,
      });
    }
  }

  /**
   * Switches the route, using raw string values, if target location's path is different.
   *
   * You probably want to use `switchRoute` or an even higher level alternative like `switchToArena` instead.
   */
  private switchRouteRaw({
    branchName,
    branchVersion,
    arenaType,
    arenaUuidOrName,
    slug,
    replace = false,
    stopWatching = true,
  }: {
    branchName: string;
    branchVersion: string;
    arenaType: ArenaType | undefined;
    arenaUuidOrName: string | undefined;
    slug: string | undefined;
    replace?: boolean;
    stopWatching?: boolean;
  }) {
    if (stopWatching) {
      this.setWatchPlayerId(null);
    }

    const location = mkProjectLocation({
      projectId: this.siteInfo.id,
      slug,
      branchName,
      branchVersion,
      arenaType,
      arenaUuidOrNameOrPath: arenaUuidOrName,
    });

    if (replace) {
      this.appCtx.history.replace(location);
    } else {
      this.appCtx.history.push(location);
    }
  }

  private async handleInitialRoute() {
    // initialize initialFocusPreference first, which handleRouteChange depends on
    const focusPreference = await this.appCtx.api.getStorageItem(
      this.mkFocusPreferenceKey()
    );
    if (!isNil(focusPreference)) {
      this.focusPreference.set(focusPreference === "true");
    }

    await this.handleRouteChange(this.appCtx.history.location);
  }

  private async handleRouteChange(location: Location) {
    const match = parseProjectLocation(location);
    if (match) {
      const {
        branchName,
        branchVersion,
        arenaType,
        arenaUuidOrNameOrPath,
        isPreview,
      } = match;
      await this.handleBranchChange(branchName, branchVersion);
      if (!isPreview) {
        // We don't want to render the arenas in preview mode, for performance
        // and to avoid setting the zoom level when the arena is not rendered.
        await this.handleArenaChange(arenaType, arenaUuidOrNameOrPath);
      }
    } else {
      // We are in other path such as `projectDocs`. We can skip updating state since we're not being shown right now.
    }
  }

  private async handleBranchChange(branchName: string, branchVersion: string) {
    const currentBranchName = this.dbCtx().branchInfo?.name ?? MainBranchId;
    const currentBranchVersion =
      this.dbCtx().pkgVersionInfoMeta?.version ?? latestTag;
    if (
      branchName === currentBranchName &&
      branchVersion === currentBranchVersion
    ) {
      return;
    }

    // Given branch name, look up branch
    let branch: ApiBranch | undefined = undefined;
    if (branchName !== MainBranchId) {
      const branches = await this.appCtx.api.listBranchesForProject(
        this.siteInfo.id
      );
      branch = branches.branches.find((b) => b.name === branchName);
      if (!branch) {
        this.switchToBranch(undefined, undefined, { replace: true });
        return;
      }
    }

    // Given branch version, look up pkg version
    let pkgVersionInfoMeta: PkgVersionInfoMeta | undefined = undefined;
    let editMode = true;
    if (branchVersion !== "latest") {
      const { pkg } = await this.appCtx.api.getPkgByProjectId(this.siteInfo.id);
      if (!pkg) {
        this.switchToBranch(branch, undefined, { replace: true });
        return;
      }
      try {
        const resp = await this.appCtx.api.getPkgVersionMeta(
          pkg.id,
          branchVersion,
          branch?.id
        );
        pkgVersionInfoMeta = resp.pkg;
        editMode = false; // cannot edit when viewing previous pkg version
      } catch (e) {
        if (e.name === "NotFoundError") {
          this.switchToBranch(branch, undefined, { replace: true });
          return;
        } else {
          throw e;
        }
      }
    }
    await this.loadVersion(pkgVersionInfoMeta, editMode, branch);
    this.handleBranchProtectionAlert();
  }

  private async handleArenaChange(
    arenaType: ArenaType | undefined,
    arenaName: string | undefined,
    opts?: StudioChangeOpts
  ) {
    return this.change(({ success }) => {
      const currentArena = this.currentArena;
      if (!arenaType && !arenaName) {
        // A route without arenaType and arenaName is valid for projects without any arenas.
        //
        // We can't call switchToFirstArena() because it always redirects
        // and would cause an infinite redirect for projects without any arenas.
        // Instead, we only call switchToArena() if the first arena exists.
        const firstArena = this.firstArena();
        if (firstArena) {
          this.switchToArena(firstArena, { replace: true });
        } else {
          if (currentArena !== null) {
            this.changeArena(null);
          }
        }
      } else if (!arenaName) {
        // User probably typed in the wrong URL. Focus on the first arena.
        this.switchToFirstArena();
      } else {
        // Lookup the target arena.
        const targetArena = getArenaByNameOrUuidOrPath(
          this.site,
          arenaName,
          arenaType
        );
        if (!targetArena) {
          // Arena is missing/invalid. Focus on the first arena.
          this.switchToFirstArena();
        } else if (currentArena !== targetArena) {
          // Current arena is different. Focus on target arena.
          this.changeArena(targetArena);
        }
      }
      return success();
    }, opts);
  }

  private changeArena(
    arena: AnyArena | null,
    opts?: {
      noFocusedModeChange?: boolean;
    }
  ) {
    try {
      const prevFocusedViewCtx = this.focusedViewCtx();
      const prevArena = this.currentArena;

      if (prevFocusedViewCtx && prevArena) {
        this.arenaViewStates.set(prevArena, {
          isAlive: true,
          lastAccess: new Date().getTime(),
          lastViewSnapshot: this.getCurrentStudioViewportSnapshot(),
        });
      }

      // Normalize mixed arena frames so min top/left is 0.
      if (isMixedArena(arena)) {
        normalizeMixedArenaFrames(arena);
      }

      this.viewportCtx?.setArena(arena);
      this.currentArena = arena;
      if (!arena) {
        return;
      }

      let viewState = this.arenaViewStates.get(arena);
      if (!viewState) {
        viewState = {
          isAlive: true,
          lastAccess: new Date().getTime(),
          lastViewSnapshot: undefined,
        };
      }
      this.arenaViewStates.set(arena, {
        ...viewState,
        isAlive: true,
      });

      if (!this.watchPlayerId) {
        if (viewState.lastViewSnapshot) {
          this.restoreStudioViewportSnapshot(viewState.lastViewSnapshot, true);

          // We dispatch a framesChanged event, as new frames are now rendered,
          // so that hoverbox can position itself properly
          defer(() => this.framesChanged.dispatch());
        } else {
          if (isDedicatedArena(arena) && !opts?.noFocusedModeChange) {
            // Dedicated/focused based on the following order of precedence
            // 1. Design mode only for read-only users (see https://app.shortcut.com/plasmic/story/37124)
            // 2. Match the previous arena, if it's a dedicated arena
            // 3. Match the focus preference in local storage
            // 4. Heuristic: app = focused, website = dedicated
            const focusedMode = !this.canEditProject()
              ? false
              : isDedicatedArena(prevArena)
              ? !!prevArena._focusedFrame
              : this.focusPreference.get() ?? this.siteInfo.hasAppAuth;
            if (focusedMode) {
              const newFocusedFrame = setFocusedFrame(this.site, arena);
              ensureActivatedScreenVariantsForFrameByWidth(
                this.site,
                newFocusedFrame
              );
            }
          }

          const firstFrame: IArenaFrame | undefined = getArenaFrames(arena)[0];
          this.setStudioFocusOnFrame({
            frame: firstFrame,
            autoZoom: false,
          });

          defer(() => {
            this.tryZoomToFitArena();
          });
        }
      }

      // If not in focused mode, leave interactive mode.
      if (!isDedicatedArena(arena) || !arena._focusedFrame) {
        this.isInteractiveMode = false;
      }

      // If there were still outstanding canvas load requests for this arena,
      // go fulfill them now!
      this.drainCanvasFrameForArena(arena);

      return;
    } finally {
      this.maybeGarbageCollectArenas();
    }
  }

  isArenaAlive = computedFn(
    (arena: AnyArena) => {
      return this.arenaViewStates.get(arena)?.isAlive ?? false;
    },
    { name: "isArenaAlive" }
  );

  isArenaVisible = computedFn(
    (arena: AnyArena) => {
      return this.currentArena === arena;
    },
    { name: "isArenaVisible" }
  );

  addArena(prefix?: string) {
    const arena = this.tplMgr().addArenaWithPrefix(prefix);
    this.switchToArena(arena);
    return arena;
  }

  private maybeGarbageCollectArenas() {
    // We only keep at most MAX_ALIVE_ARENAS "alive" -- that is, keep their ViewCtx
    // running for fast switching.  Once we exceed this number, we start unloading
    // arenas that had been least recently accessed.
    const allArenas = new Set(getSiteArenas(this.site));
    for (const key of [...this.arenaViewStates.keys()]) {
      if (!allArenas.has(key)) {
        this.arenaViewStates.delete(key);
      }
    }
    if (this.arenaViewStates.size > DEVFLAGS.liveArenas) {
      const entries = Array.from(this.arenaViewStates.entries());
      const arenasToFree = orderBy(
        entries.filter(([arena, _info]) => arena !== this.currentArena),
        ([_arena, info]) => info.lastAccess,
        "asc"
      ).slice(0, this.arenaViewStates.size - DEVFLAGS.liveArenas);
      for (const [arena, info] of arenasToFree) {
        console.log("Garbage collecting arena", getArenaName(arena));
        this.arenaViewStates.set(arena, {
          ...info,
          isAlive: false,
        });
      }
      this.pruneInvalidViewCtxs();
    }
  }

  get currentArenaEmpty() {
    return getArenaFrames(this.currentArena).length === 0;
  }

  addComponent(
    name: string,
    {
      type,
      plumeTemplateId,
      insertableTemplateInfo,
      noSwitchArena,
    }: {
      type: ComponentType;
      plumeTemplateId?: string;
      insertableTemplateInfo?: InsertableTemplateComponentExtraInfo;
      noSwitchArena?: boolean;
    }
  ) {
    assert(
      type === ComponentType.Plain || type === ComponentType.Page,
      "component should be plain or page"
    );

    const frame =
      type === ComponentType.Plain
        ? AddItemKey.componentFrame
        : AddItemKey.pageFrame;

    const makeComponent = () => {
      if (plumeTemplateId) {
        const comp = this.tplMgr().clonePlumeComponent(
          this.projectDependencyManager.plumeSite,
          plumeTemplateId,
          name,
          true
        );
        syncPlumeComponent(this, comp).match({
          success: (x) => x,
          failure: (err) => {
            throw err;
          },
        });
        return comp;
      } else if (insertableTemplateInfo) {
        const { component: comp, seenFonts } = cloneInsertableTemplateComponent(
          this.site,
          insertableTemplateInfo,
          this.projectDependencyManager.plumeSite
        );
        postInsertableTemplate(this, seenFonts);
        return comp;
      } else {
        return this.tplMgr().addComponent({
          name,
          type,
          styles: getSimplifiedStyles(frame, this.getAddItemPrefs()),
        });
      }
    };

    const component = makeComponent();

    // Segment track
    trackEvent("Create component", {
      projectName: this.siteInfo.name,
      componentName: name,
      type,
      action: "add-component",
      plumeTemplateId,
      plumeType: component.plumeInfo?.type,
      insertableComponent: insertableTemplateInfo?.component.name,
    });

    if (!noSwitchArena) {
      this.switchToComponentArena(component);
    }

    return component;
  }

  //
  // Manage currently-focused frame and element
  //

  private _xFocusedFrame = observable.box<ArenaFrame | undefined>();
  private _xFocusedViewCtx = observable.box<ViewCtx | undefined>();

  // This only sets the high level focus for the studio, i.e. viewCtx and frame.
  private setHighLevelFocusOnly(
    viewCtx: ViewCtx | undefined,
    frame: ArenaFrame | undefined
  ) {
    const curFocusedViewCtx = this.focusedViewCtx();
    if (curFocusedViewCtx && (viewCtx !== curFocusedViewCtx || frame)) {
      curFocusedViewCtx.clearViewCtxFocus();
    }
    this._xFocusedViewCtx.set(viewCtx);

    this._xFocusedFrame.set(frame);
  }

  focusedViewCtx() {
    return this._xFocusedViewCtx.get();
  }

  focusedOrFirstViewCtx() {
    return (
      this.focusedViewCtx() ??
      (isDedicatedArena(this.currentArena)
        ? this.tryGetViewCtxForFrame(getArenaFrames(this.currentArena)[0])
        : undefined)
    );
  }

  // Set the studio focus to focus on the frame object. This clears focus inside
  // the viewCtx too (if something was selected).
  setStudioFocusOnFrame({
    frame,
    autoZoom,
  }: {
    frame: ArenaFrame | undefined;
    autoZoom?: boolean;
  }) {
    this.setHighLevelFocusOnly(this.tryGetViewCtxForFrame(frame), frame);

    // If this is a stretch frame, then we focus on the root node instead
    if (frame && frame.viewMode === FrameViewMode.Stretch) {
      const vc = this.tryGetViewCtxForFrame(frame);
      if (vc) {
        vc.setStudioFocusByTpl(frame.container.component.tplTree);
      }
    }

    if (frame && autoZoom) {
      this.tryZoomToFitFrame(frame, this.zoom);
    }
  }

  // Set the studio focus to focus only on the frame object, not on the root node.
  setStudioFocusOnlyOnFrame(frame: ArenaFrame | undefined) {
    this.setHighLevelFocusOnly(this.tryGetViewCtxForFrame(frame), frame);
  }

  // In this case, the focus is inside a viewCtx. Set the viewCtx with the
  // focus.
  setStudioFocusOnViewCtxContent(viewCtx: ViewCtx) {
    this.setHighLevelFocusOnly(viewCtx, undefined);
  }

  /**
   * Set studio focus on the frame contents (but not the frame itself).
   */
  setStudioFocusOnFrameContents(frame: ArenaFrame | undefined) {
    this.setHighLevelFocusOnly(this.tryGetViewCtxForFrame(frame), undefined);
  }

  async setStudioFocusOnTpl(
    component: Component,
    tpl: TplNode,
    variants?: VariantCombo
  ) {
    // If the current focused ViewCtx is already on the target component and no variant switching is needed
    const currentViewCtx = this.focusedViewCtx();
    if (currentViewCtx?.component === component && !variants) {
      currentViewCtx.setStudioFocusByTpl(tpl);
      return;
    }

    // when component is a frame (artboard) or we're in a custom arena
    if (isFrameComponent(component) || isMixedArena(this.currentArena)) {
      const arenasToSearch = isFrameComponent(component)
        ? this.site.arenas
        : this.currentArena
        ? [this.currentArena]
        : [];

      const arenaFramePairs = withoutNils(
        arenasToSearch.map((arena) => {
          const baseFrame = getArenaFrames(arena).find(
            (frame) => frame.container.component === component
          );
          const frame = variants?.length
            ? this.getArenaFrameForSetOfVariants(arena, variants)?.frame
            : baseFrame;
          return frame ? { arena, frame } : undefined;
        })
      );

      const match = arenaFramePairs[0];
      if (match) {
        const { arena, frame } = match;

        // If it's an artboard, switch to its arena
        if (isFrameComponent(component)) {
          await this.change(({ success }) => {
            this.switchToArena(arena);
            return success();
          });
        }

        const viewCtx = await this.awaitViewCtxForFrame(frame);
        if (viewCtx) {
          viewCtx.setStudioFocusByTpl(tpl);
        }
        return;
      }
    }

    const arena = unwrap(
      await this.change<void, AnyArena | null>(({ success }) => {
        const switchedArena =
          this.switchToComponentArena(component) ?? this.currentArena;
        return success(switchedArena);
      })
    );

    if (arena) {
      assert(
        isPageArena(arena) || isComponentArena(arena),
        "Current arena should be a page or component arena"
      );
      const baseFrame = getComponentArenaBaseFrame(arena);
      const hasVariants = !!variants?.length;
      const arenaDetails = hasVariants
        ? this.getArenaFrameForSetOfVariants(arena, variants) ??
          this.getComponentFrameForSetOfVariantsInCustomArenas(
            arena.component,
            variants
          )
        : null;
      const frame = arenaDetails?.frame ?? baseFrame;

      let viewCtx: ViewCtx | undefined = undefined;
      if (this.focusedMode) {
        const vcontroller = makeVariantsController(this);
        if (vcontroller && variants?.length) {
          await this.change(
            ({ success }) => {
              vcontroller.onActivateCombo(variants);
              vcontroller.onToggleTargetingOfActiveVariants();
              return success();
            },
            { noUndoRecord: true }
          );
        }
        // In focus mode, there's guaranteed to be only one visible ViewCtx, so always use that.
        viewCtx = this.focusedOrFirstViewCtx();
      }

      // switch to custom arena, as awaitViewCtxForFrame cannot create viewCtx for non visible custom arena
      if (
        arenaDetails &&
        arenaDetails?.arena !== arena &&
        isMixedArena(arenaDetails?.arena)
      ) {
        await this.change(({ success }) => {
          this.switchToArena(arenaDetails?.arena);
          return success();
        });
      }
      viewCtx = viewCtx ?? (await this.awaitViewCtxForFrame(frame));
      if (viewCtx) {
        viewCtx.setStudioFocusByTpl(tpl);
      }
    }
  }

  getArenaFrameForSetOfVariants(
    arena: AnyArena,
    variants: VariantCombo
  ): { arena: AnyArena; frame: ArenaFrame } | undefined {
    const frames = getArenaFrames(arena);
    const components = new Set<Component>();
    if (isMixedArena(arena)) {
      for (const frame of frames) {
        components.add(frame.container.component);
      }
    } else {
      components.add(arena.component);
    }
    for (const component of components) {
      const allComponentVariantsMap = keyBy(
        allComponentVariants(component),
        (v) => v.uuid
      );
      const allGlobalVariantsMap = keyBy(
        allGlobalVariants(this.site, { includeDeps: "direct" }),
        (v) => v.uuid
      );

      for (const frame of frames) {
        if (
          doesFrameVariantMatch(
            frame,
            variants,
            allComponentVariantsMap,
            allGlobalVariantsMap
          )
        ) {
          return { arena, frame };
        }
      }
    }

    return undefined;
  }

  getComponentFrameForSetOfVariantsInCustomArenas(
    component: Component,
    variants: VariantCombo
  ): { arena: AnyArena; frame: ArenaFrame } | undefined {
    const allComponentVariantsMap = keyBy(
      allComponentVariants(component),
      (v) => v.uuid
    );
    const allGlobalVariantsMap = keyBy(
      allGlobalVariants(this.site, { includeDeps: "direct" }),
      (v) => v.uuid
    );
    const customArenas = this.getSortedMixedArenas();
    for (const customArena of customArenas) {
      const customArenaFrames = getArenaFrames(customArena);
      for (const customArenaFrame of customArenaFrames) {
        if (customArenaFrame.container.component === component) {
          if (
            doesFrameVariantMatch(
              customArenaFrame,
              variants,
              allComponentVariantsMap,
              allGlobalVariantsMap
            )
          ) {
            return { arena: customArena, frame: customArenaFrame };
          }
        }
      }
    }

    return undefined;
  }

  /** Returns frame the StudioCtx is focused on, if only focused on frame and not selectables */
  focusedFrame() {
    return this._xFocusedFrame.get();
  }

  /** Returns frame of whatever content StudioCtx is focused on */
  focusedContentFrame() {
    return this.focusedFrame() ?? this.focusedViewCtx()?.arenaFrame();
  }

  get leftTabKey() {
    return this._xLeftTabKey.get();
  }
  set leftTabKey(key: LeftTabKey | undefined) {
    this._xLeftTabKey.set(key);
  }

  private _xLastLeftTabKey: LeftTabKey = "outline";
  get lastLeftTabKey() {
    return this._xLastLeftTabKey;
  }
  set lastLeftTabKey(key: LeftTabKey) {
    this._xLastLeftTabKey = key;
  }

  private _showCommentsPanel = observable.box(false);

  get showCommentsPanel() {
    return this._showCommentsPanel.get();
  }

  toggleCommentsPanel() {
    this._showCommentsPanel.set(!this.showCommentsPanel);
  }

  private _showUiCopilot = observable.box(false);

  get showUiCopilot() {
    return this._showUiCopilot.get();
  }

  openUiCopilotDialog(isOpen: boolean) {
    this._showUiCopilot.set(isOpen);
  }

  private _xLeftPaneWidth = observable.box(LEFT_PANE_INIT_WIDTH);
  get leftPaneWidth() {
    if (!this.leftTabKey) {
      return 0;
    }
    return this._xLeftPaneWidth.get();
  }
  set leftPaneWidth(width: number) {
    this._xLeftPaneWidth.set(width);
  }

  private _xRightTabKey = observable.box<RightTabKey | undefined>(undefined);
  private lastElementRightTabKey:
    | Extract<RightTabKey, RightTabKey.style | RightTabKey.settings>
    | undefined;
  get rightTabKey() {
    return this._xRightTabKey.get();
  }
  set rightTabKey(key: RightTabKey | undefined) {
    this._xRightTabKey.set(key);
    if (key === RightTabKey.style || key === RightTabKey.settings) {
      this.lastElementRightTabKey = key;
    }
  }

  switchLeftTab(
    tabKey: LeftTabKey | undefined,
    opts?: { highlight?: boolean }
  ) {
    if (tabKey) {
      this.lastLeftTabKey = tabKey;
      this.appCtx.api
        .addStorageItem(this.leftTabKeyLocalStorageKey(), tabKey)
        .catch((e) => console.error(e));
    } else {
      this.appCtx.api
        .removeStorageItem(this.leftTabKeyLocalStorageKey())
        .catch((e) => console.error(e));
    }
    this.leftTabKey = tabKey;
    if (opts?.highlight) {
      this.highlightLeftPanel();
    }
  }

  switchRightTab(tabKey: RightTabKey) {
    this.rightTabKey = tabKey;
  }

  switchToTreeTab() {
    this.switchLeftTab("outline");
  }

  switchToDesignTab() {
    this.switchRightTab(RightTabKey.style);
  }

  restoreLastElementTab() {
    if (
      this.lastElementRightTabKey &&
      this.rightTabKey &&
      ![RightTabKey.style, RightTabKey.settings].includes(this.rightTabKey)
    ) {
      this.switchRightTab(this.lastElementRightTabKey);
    }
  }

  private _isShortcutsModalOpen = observable.box(false);
  isShortcutsModalOpen = () => {
    return this._isShortcutsModalOpen.get();
  };
  openShortcutsModal = () => {
    this._isShortcutsModalOpen.set(true);
  };
  closeShortcutsModal = () => {
    this._isShortcutsModalOpen.set(false);
  };
  toggleShortcutsModal = () => {
    this._isShortcutsModalOpen.set(!this._isShortcutsModalOpen.get());
  };

  private _projectSearchInputRef = observable.box(
    React.createRef<HTMLInputElement>()
  );

  get projectSearchInputRef() {
    return this._projectSearchInputRef.get();
  }

  focusOnProjectSearchInput() {
    when(
      () => !!this.projectSearchInputRef.current,
      () => this.projectSearchInputRef.current?.focus()
    );
  }

  //
  // Managing live state
  //
  get showDevControls() {
    return this.isDevMode;
  }
  get isLiveMode() {
    return this.previewCtx?.isLive;
  }
  get isDevMode() {
    return !this.isLiveMode && !this.isDocs;
  }

  private _isInteractiveMode = observable.box(false);
  get isInteractiveMode() {
    return this._isInteractiveMode.get();
  }
  set isInteractiveMode(interactive: boolean) {
    this._isInteractiveMode.set(interactive);
    for (const viewCtx of this.viewCtxs) {
      viewCtx.canvasCtx.setInteractiveMode(interactive);
    }
  }

  private _isAutoOpenMode = observable.box(true);
  get isAutoOpenMode() {
    return !this.isDraggingObject() && this._isAutoOpenMode.get();
  }
  set isAutoOpenMode(autoOpen: boolean) {
    this._isAutoOpenMode.set(autoOpen);
  }
  toggleAutoOpenMode() {
    this.isAutoOpenMode = !this.isAutoOpenMode;
    this.viewCtxs.forEach((vc) => vc.resetAutoOpenState());
  }

  shouldHideUIOverlay(includeResizing = true): boolean {
    return Boolean(
      this.freestyleState() ||
        this.dragInsertState() ||
        this.isResizingFocusedArenaFrame ||
        !this.showDevControls ||
        this.screenshotting ||
        this.isTransforming() ||
        (includeResizing && this.isResizeDragging)
    );
  }

  private _showCommentsOverlay = observable.box(true);
  get showCommentsOverlay() {
    return this._showCommentsOverlay.get();
  }
  set showCommentsOverlay(show: boolean) {
    this._showCommentsOverlay.set(show);
  }
  toggleShowCommentsOverlay() {
    this.showCommentsOverlay = !this.showCommentsOverlay;
  }

  //
  // Manage parent stack display
  //
  private _showStackOfParents = observable.box(false);

  set showStackOfParents(value: boolean) {
    this._showStackOfParents.set(value);
  }

  get showStackOfParents() {
    return this._showStackOfParents.get();
  }

  shouldShowArenaFrame = (arenaChild: ArenaChild) => {
    if (!this.isDevMode) {
      return false;
    }

    if (!isKnownArenaFrame(arenaChild)) {
      return false;
    }

    const currentArenaFrames = getArenaFrames(this.currentArena);
    return currentArenaFrames?.includes(arenaChild);
  };

  async getPreviewInitialViewCtx() {
    const arena = ensure(this.currentArena, "current arena must be non null");
    const focusedVc = this.focusedViewCtx();
    if (focusedVc) {
      return focusedVc;
    }
    const children = getArenaFrames(arena);
    return await this.awaitViewCtxForFrame(
      ensure(children[0], "you must have at least one arena frame")
    );
  }

  toggleDevControls() {
    assert(this.previewCtx, "Cannot toggle live mode without a previewCtx.");
    spawn(this.previewCtx.toggleLiveMode());
  }

  /**
   * Cache information for interactions
   */
  private $stepsCache = observable.map<string, any>();
  private interactionEventArgsCache = new Map<number, any[]>();

  save$stepValue = (interactionUuid: string, stepValue: any) => {
    this.$stepsCache.set(interactionUuid, stepValue);
  };

  getCached$stepValue = (interactionUuid: string) => {
    return this.$stepsCache.get(interactionUuid);
  };

  hasCached$stepValue = (interactionUuid: string) => {
    return this.$stepsCache.has(interactionUuid);
  };

  saveInteractionArgs = (eventHandlerUid: number, ...eventArgs: any) => {
    this.interactionEventArgsCache.set(eventHandlerUid, eventArgs);
  };

  getCachedInteractionArgs = (eventHandlerUid: number) => {
    return this.interactionEventArgsCache.get(eventHandlerUid);
  };

  hasCachedInteractionArgs = (eventHandlerUid: number) => {
    return this.interactionEventArgsCache.has(eventHandlerUid);
  };

  private keyDown = new Map<number, boolean>();
  markKeydown = (which: number) => {
    this.keyDown[which] = true;
    if (which === StudioCtx.SPACE) {
      this.showPannableCursor();
    }
  };

  markKeyup = (which: number) => {
    this.keyDown[which] = false;
    if (which === StudioCtx.SPACE) {
      this.hidePannableCursor();
      if (this.panningState && !this.panningState.initiatedByMiddleButton) {
        this.endPanning();
      }
    }
  };
  isSpaceDown = () => this.keyDown[StudioCtx.SPACE];
  isShiftDown = () => this.keyDown[StudioCtx.SHIFT];
  isMetaDown = () => this.keyDown[StudioCtx.META];
  isCtrlDown = () => this.keyDown[StudioCtx.CTRL];
  isAltDown = () => this.keyDown[StudioCtx.ALT];
  isKeyDown = (which: number) => this.keyDown[which];

  tryUpdateKeyboardStatus = (e: MouseEvent) => {
    if (e.ctrlKey) {
      this.markKeydown(StudioCtx.CTRL);
    } else {
      this.markKeyup(StudioCtx.CTRL);
    }
    if (e.metaKey) {
      this.markKeydown(StudioCtx.META);
    } else {
      this.markKeyup(StudioCtx.META);
    }
    if (e.altKey) {
      this.markKeydown(StudioCtx.ALT);
    } else {
      this.markKeyup(StudioCtx.ALT);
    }
  };
  private isCtrlOrMetaDown = () =>
    this.keyDown[StudioCtx.CTRL] || this.keyDown[StudioCtx.META];

  //
  // Managing the "Omnibar"
  //
  private _omnibarState = observable<OmnibarState>({
    show: false,
    includedGroupKeys: undefined,
    excludedGroupKeys: undefined,
  });
  getOmnibarState(): OmnibarState {
    return this._omnibarState;
  }
  hideOmnibar(): void {
    this._omnibarState.show = false;
    this._omnibarState.includedGroupKeys = undefined;
  }
  showOmnibar(): void {
    this._omnibarState.show = true;
    this._omnibarState.includedGroupKeys = undefined;
  }
  showPresetsModal(component: CodeComponent): void {
    this._omnibarState.show = true;
    this._omnibarState.includedGroupKeys = ["presets-" + component.uuid];
  }

  //
  // Branching
  //
  showBranching() {
    const team = this.appCtx
      .getAllTeams()
      .find((t) => t.id === this.siteInfo.teamId);
    return (
      this.appCtx.appConfig.branching ||
      (this.siteInfo.teamId &&
        this.appCtx.appConfig.branchingTeamIds.includes(
          this.siteInfo.teamId
        )) ||
      (team?.parentTeamId &&
        this.appCtx.appConfig.branchingTeamIds.includes(team.parentTeamId))
    );
  }

  //
  // Comments
  //
  showComments() {
    const team = this.appCtx
      .getAllTeams()
      .find((t) => t.id === this.siteInfo.teamId);
    const accessLevel = getAccessLevelToResource(
      { type: "project", resource: this.siteInfo },
      this.appCtx.selfInfo,
      this.siteInfo.perms
    );
    return (
      this.appCtx.appConfig.comments ||
      (accessLevelRank(accessLevel) >= accessLevelRank("commenter") &&
        ((this.siteInfo.teamId &&
          this.appCtx.appConfig.commentsTeamIds.includes(
            this.siteInfo.teamId
          )) ||
          (team?.parentTeamId &&
            this.appCtx.appConfig.commentsTeamIds.includes(team.parentTeamId))))
    );
  }

  //
  // Managing the "Add Drawer"
  //
  private _showAddDrawer = observable.box(false);
  showAddDrawer() {
    return (
      this._showAddDrawer.get() ||
      !!this.onboardingTourState.flags.forceAddDrawerOpen
    );
  }
  setShowAddDrawer(show: boolean) {
    this._showInlineAddDrawer.set(false);
    this._showAddDrawer.set(show);
  }

  //
  // Managing the "Inline Add Drawer"
  //
  private _showInlineAddDrawer = observable.box(false);
  showInlineAddDrawer = () => this._showInlineAddDrawer.get();
  setShowInlineAddDrawer = (show: boolean) => {
    this._showInlineAddDrawer.set(show);
    if (this.appCtx.appConfig.insert2022Q4) {
      this._showAddDrawer.set(show);
    }
  };

  //
  // Managing focused mode
  //
  get focusedMode() {
    return (
      isDedicatedArena(this.currentArena) && !!this.currentArena._focusedFrame
    );
  }

  toggleFocusedMode = () => {
    if (!isDedicatedArena(this.currentArena)) {
      return;
    }

    if (this.focusedMode) {
      this.turnFocusedModeOff();
    } else {
      this.turnFocusedModeOn();
    }
  };

  turnFocusedModeOn = () => {
    const currentArena = this.currentArena;
    if (!isDedicatedArena(currentArena) || currentArena._focusedFrame) {
      return;
    }

    const newFocusedFrame = setFocusedFrame(
      this.site,
      currentArena,
      this.focusedContentFrame()
    );
    ensureActivatedScreenVariantsForFrameByWidth(this.site, newFocusedFrame);
    this.setStudioFocusOnFrame({ frame: newFocusedFrame, autoZoom: false });
    setTimeout(() => {
      this.tryZoomToFitArena();
    }, 0);
  };

  turnFocusedModeOff = () => {
    const currentArena = this.currentArena;
    if (!isDedicatedArena(currentArena) || !currentArena._focusedFrame) {
      return;
    }

    this.isInteractiveMode = false;
    currentArena._focusedFrame = null;

    ensureActivatedScreenVariantsForArena(this.site, currentArena);

    const firstFrame: ArenaFrame | undefined = getArenaFrames(currentArena)[0];
    this.setStudioFocusOnFrame({ frame: firstFrame, autoZoom: false });
    setTimeout(() => {
      this.tryZoomToFitArena();
    }, 0);
  };

  private mkFocusPreferenceKey = () => {
    return `plasmic.focused.${this.siteInfo.id}`;
  };

  private leftTabKeyLocalStorageKey = () => {
    return `plasmic.leftTabKey.${this.siteInfo.id}`;
  };

  /**
   * Initially set to the value in local storage of mkFocusPreferenceKey.
   *
   * Note `undefined` is a valid value and means there is no focus preference.
   */
  private readonly focusPreference = observable.box<boolean | undefined>(
    undefined
  );

  getDataSource = memoize((sourceId: string) =>
    this.appCtx.api.getDataSourceById(sourceId)
  );

  refreshFetchedDataFromPlasmicQuery = (invalidateKey?: string) => {
    this.mutateDataOp(invalidateKey);
    this.viewCtxs.forEach((vc) =>
      vc?.refreshFetchedDataFromPlasmicQuery(invalidateKey)
    );
    // Also refresh the data for the current window, so we update data from DataSourceOpPicker preview
    const maybeExistingMutateAllKeysFn = (window as any).__SWRMutateAllKeys;
    if (typeof maybeExistingMutateAllKeysFn === "function") {
      maybeExistingMutateAllKeysFn(invalidateKey);
    }
  };

  shouldHidePreselectBox() {
    return (
      this.isDraggingObject() ||
      this.screenshotting ||
      this.isResizingFocusedArenaFrame
    );
  }

  // Managing Content Editor Mode
  isContentEditor() {
    return isContentEditor(this.appCtx.selfInfo, this.siteInfo);
  }

  getAddItemPrefs() {
    return this.site.activeTheme?.addItemPrefs as AddItemPrefs | undefined;
  }

  private _contentEditorMode = observable.box(false);

  get contentEditorMode() {
    return (
      this.isContentEditor() ||
      DEVFLAGS.contentEditorMode ||
      this._contentEditorMode.get()
    );
  }

  getCurrentUiConfig(): UiConfig {
    if (this.contentEditorMode) {
      return mergeUiConfigs(
        this.siteInfo.uiConfig,
        this.siteInfo.contentCreatorConfig
      );
    } else {
      return mergeUiConfigs(this.siteInfo.uiConfig);
    }
  }

  getLeftTabPermission(tab: LeftTabUiKey) {
    return getLeftTabPermission(this.getCurrentUiConfig(), tab, {
      isContentCreator: this.contentEditorMode,
    });
  }

  toggleContentEditorMode() {
    if (!this.contentEditorMode) {
      // Turn it on
      this._contentEditorMode.set(true);
      if (
        (isDedicatedArena(this.currentArena) &&
          !this.canEditComponent(this.currentArena.component)) ||
        isMixedArena(this.currentArena)
      ) {
        this.switchToFirstArena();
      }
    } else {
      // Turn it off
      this._contentEditorMode.set(false);
    }
  }

  // Component thumbnail management

  private _thumbnailsCache: ObservableMap<string, [string, number]> =
    observable.map(new Map());

  saveThumbnail = (componentUuid: string, thumbnail: string) => {
    this._thumbnailsCache.set(componentUuid, [thumbnail, Date.now()]);
  };

  getCachedThumbnail = (componentUuid: string) => {
    return this._thumbnailsCache.get(componentUuid)?.[0];
  };

  hasCachedThumbnail = (componentUuid: string) => {
    const cachedThumbnail = this._thumbnailsCache.get(componentUuid);
    if (
      !cachedThumbnail ||
      Date.now() - cachedThumbnail[1] > THUMBNAIL_DURATION
    ) {
      return false;
    }
    return true;
  };

  //
  // Managing the Variants switcher drawer
  //
  private _showVariantsDrawer = observable.box(false);
  get showVariantsDrawer() {
    return this._showVariantsDrawer.get();
  }
  setShowVariantsDrawer = (show: boolean) => this._showVariantsDrawer.set(show);

  //
  // Dealing with studio-wide viewport DOM elements and sizes
  //

  private _$canvasClipper = cachedJQSelector(".canvas-editor__canvas-clipper");
  private _$canvas = cachedJQSelector(".canvas-editor__canvas");
  private _$canvasScaler = cachedJQSelector(".canvas-editor__scaler");

  canvasClipper() {
    return ensureHTMLElt(this.maybeCanvasClipper());
  }

  maybeCanvasClipper() {
    return this._$canvasClipper()[0] as HTMLElement | undefined;
  }

  private canvas() {
    return ensureHTMLElt(this.maybeCanvas());
  }

  private maybeCanvas() {
    return this._$canvas()[0];
  }

  private canvasScaler() {
    return ensureHTMLElt(this.maybeCanvasScaler());
  }

  private maybeCanvasScaler() {
    return this._$canvasScaler()[0];
  }

  currentViewportMidpt() {
    return (this.viewportCtx?.visibleScalerBox() ?? Box.zero()).midpt();
  }

  //
  // Managing viewport
  //

  private _$ruler?: JQuery;
  private $ruler() {
    if (!this._$ruler) {
      this._$ruler = $(".canvas-editor__canvas-clipper-grid");
    }
    return this._$ruler;
  }

  private fixRuler() {
    const $ruler = this.$ruler();
    if (this.isTransforming() || this.zoom < 4) {
      $ruler.hide();
    } else {
      const viewportCtx = this.viewportCtx!;
      const scale = viewportCtx.scale();
      const canvasPadding = viewportCtx.canvasPadding();
      const scroll = viewportCtx.scroll();
      const clipperBox = viewportCtx.clipperBox();

      const remainder = (n: number) => n - Math.trunc(n / scale + 1) * scale;
      const t = canvasPadding.sub(scroll);
      $ruler.show().css({
        backgroundSize: `${scale}px ${scale}px`,
        transform: `translate3d(${remainder(t.x)}px, ${remainder(t.y)}px, 0px)`,
        width: clipperBox.width() + 2 * scale,
        height: clipperBox.height() + 2 * scale,
      });
    }
  }

  centerFocusedFrame(maxZoom?: number) {
    const frame =
      this.focusedFrame() ??
      maybe(this.focusedViewCtx(), (vc) => vc.arenaFrame());
    if (frame) {
      this.tryZoomToFitFrame(frame, maxZoom);
    }
  }

  focusNextFrame() {
    const curFrame = maybe(this.focusedViewCtx(), (vc) => vc.arenaFrame());
    const frames = getArenaFrames(this.currentArena).filter(
      (c): c is ArenaFrame => isKnownArenaFrame(c)
    );
    const curIndex = curFrame ? frames.indexOf(curFrame) : undefined;
    const nextIndex =
      curIndex === undefined ? 0 : (curIndex + 1) % frames.length;
    this.setStudioFocusOnFrame({ frame: frames[nextIndex], autoZoom: true });
    this.centerFocusedFrame();
  }

  focusPrevFrame() {
    const curFrame = maybe(this.focusedViewCtx(), (vc) => vc.arenaFrame());
    const frames = getArenaFrames(this.currentArena).filter(
      (c): c is ArenaFrame => isKnownArenaFrame(c)
    );
    const curIndex = curFrame ? frames.indexOf(curFrame) : undefined;
    const prevIndex =
      curIndex === undefined || curIndex === 0
        ? frames.length - 1
        : curIndex - 1;
    this.setStudioFocusOnFrame({ frame: frames[prevIndex], autoZoom: true });
    this.centerFocusedFrame();
  }

  private adjustDevEnv = (scale: number) => {
    const $devEnv = $(".canvas-editor__hoverbox-scroller");
    // const $hoverbox = $devEnv.find(".hoverbox");
    // if ($hoverbox.length > 0) {
    //   invertTransform($hoverbox, scale);
    // }
    // const $preselectBox = $devEnv.find(".PreselectBox");
    // if ($preselectBox.length > 0) {
    //   invertTransform($preselectBox, scale);
    // }
    adjustGridStyleForCurZoom(scale);
    adjustSpotLightDueToZoom(scale);

    $devEnv.find(".MeasureTool__Line").each((index, elt) => {
      invertTransform($(elt), this.zoom);
    });
  };

  //
  // Manage scrolling and panning
  //
  private panningState?: PanningState;

  endPanning = () => {
    this.panningState = undefined;
    this.hidePanningCursor();
  };

  isPanning = () => {
    return !!this.panningState;
  };

  startPanning = (e: MouseEvent) => {
    const initScroll = this.viewportCtx!.scroll();
    this.panningState = {
      initScreenX: e.screenX,
      initScreenY: e.screenY,
      initScrollX: initScroll.x,
      initScrollY: initScroll.y,
      initiatedByMiddleButton: e.button === 1,
    };
    this.showPanningCursor(e);
  };

  tryPanning = (e: MouseEvent) => {
    const s = this.panningState;
    s !== undefined &&
      this.viewportCtx!.scrollTo(
        new Pt(
          s.initScrollX + s.initScreenX - e.screenX,
          s.initScrollY + s.initScreenY - e.screenY
        )
      );
    return s !== undefined;
  };

  showPanningCursor = (e: MouseEvent) => {
    // Because it is expensive in recalculating style when we add a class
    // to the root of all artboards right when we start panning, we do
    // so only to the body of whatever received the click event
    const doc = (e.target as HTMLElement).ownerDocument;
    if (doc === document) {
      this.canvasClipper().classList.add("panning-grabbing");
    } else {
      doc.body.classList.add("panning-grabbing");
    }
  };
  hidePanningCursor = () => {
    // After panning, we remove panning-grabbing from all possible
    // bodys that we may have added to 😅
    this.canvasClipper().classList.remove("panning-grabbing");
    for (const vc of this.viewCtxs) {
      vc.canvasCtx.$body()[0].classList.remove("panning-grabbing");
    }
  };

  showPannableCursor = () => {
    this.canvasClipper().classList.add("panning-grabbable");
    for (const vc of this.viewCtxs) {
      vc.canvasCtx.$body()[0].classList.add("panning-grabbable");
    }
  };
  hidePannableCursor = () => {
    this.canvasClipper().classList.remove("panning-grabbable");
    for (const vc of this.viewCtxs) {
      vc.canvasCtx.$body()[0].classList.remove("panning-grabbable");
    }
  };

  private _ccRegistry = new CodeComponentsRegistry(
    window.parent,
    getBuiltinComponentRegistrations()
  );
  private _codeFetchersRegistry = new CodeFetchersRegistry(window.parent);

  get codeComponentsRegistry() {
    return this._ccRegistry;
  }

  get codeFetchersRegistry() {
    return this._codeFetchersRegistry;
  }

  getRegisteredContextsMap() {
    return this._ccRegistry.getRegisteredComponentsAndContextsMap();
  }

  getContextsRegistration() {
    return [
      ...(swallow(() => this.codeComponentsRegistry.getRegisteredContexts()) ??
        []),
      ...(swallow(() => this.hostLessRegistry.getRegisteredContexts()) ?? []),
    ];
  }

  getCodeComponentsRegistration() {
    return [
      ...(swallow(() =>
        this.codeComponentsRegistry.getRegisteredCodeComponents()
      ) ?? []),
      ...(swallow(() => this.hostLessRegistry.getRegisteredCodeComponents()) ??
        []),
    ];
  }

  getCodeComponentsAndContextsRegistration() {
    return [
      ...this.getCodeComponentsRegistration(),
      ...this.getContextsRegistration(),
    ];
  }

  getCodeComponentMeta(comp: Component) {
    return this.getCodeComponentsRegistration().find(
      ({ meta }) => meta.name === comp.name
    )?.meta;
  }

  getTokenRegistration(token: classes.StyleToken) {
    if (token.regKey) {
      const key = token.regKey;
      return (
        swallow(() =>
          this.codeComponentsRegistry.getRegisteredTokensMap().get(key)
        ) ||
        swallow(() => this.hostLessRegistry.getRegisteredTokensMap().get(key))
      );
    }
    return undefined;
  }

  getRegisteredFunctions() {
    return [
      ...(swallow(() => this.codeComponentsRegistry.getRegisteredFunctions()) ??
        []),
      ...(swallow(() => this.hostLessRegistry.getRegisteredFunctions()) ?? []),
    ];
  }

  getRegisteredFunctionsMap() {
    return new Map([
      ...Array.from(this._ccRegistry.getRegisteredFunctionsMap().entries()),
      ...Array.from(
        this.hostLessRegistry.getRegisteredFunctionsMap().entries()
      ),
    ]);
  }

  getRegisteredLibraries() {
    return [
      ...(swallow(() => this.codeComponentsRegistry.getRegisteredLibraries()) ??
        []),
      ...(swallow(() => this.hostLessRegistry.getRegisteredLibraries()) ?? []),
    ];
  }

  private _traitRegistry = new TraitRegistry(window.parent);
  get traitRegistry() {
    return this._traitRegistry;
  }
  getRegisteredTraits() {
    return this._traitRegistry.getRegisteredTraits();
  }

  isTransforming() {
    return this.viewportCtx?.isTransforming() ?? false;
  }

  //
  // Manage zooming
  //

  get zoom() {
    return this.viewportCtx?.scale() ?? 1;
  }

  // Used when zoom by wheel
  private wheelZoomState?: WheelZoomState;
  handleCanvasWheel = (e: WheelEvent) => {
    // Called when e came from studio and not a canvas iframe
    if (this.canvasClipper().contains(e.target as HTMLElement)) {
      this.handleWheel(e, e.clientX, e.clientY);
    }
  };

  handleWheel = (e: WheelEvent, topClientX: number, topClientY: number) => {
    const isZooming = e.ctrlKey || e.metaKey;
    if (this.isInteractiveMode && !isZooming) {
      return;
    }
    if (this.isLiveMode && isZooming) {
      // disallow zooming in normal live mode too.
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (getArenaFrames(this.currentArena).length === 0) {
      // No canvas operation when the arena is empty.
      if (isZooming) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    this.setWatchPlayerId(null);

    if (isZooming) {
      this.handleWheelZoom(e, topClientX, topClientY);
    } else {
      this.handleWheelScroll(e, topClientX, topClientY);
    }
  };

  private handleWheelScroll = (
    e: WheelEvent,
    _topClientX: number,
    _topClientY: number
  ) => {
    const [deltaX, deltaY] =
      PLATFORM === "osx" || !e.shiftKey
        ? [e.deltaX, e.deltaY]
        : // If not on Mac OS and shift is pressed,
          // we swap deltas to scroll horizontally
          [e.deltaY * 0.5, e.deltaX * 0.5];

    this.viewportCtx!.scrollBy(new Pt(deltaX, deltaY));

    const shouldAbsorbMove = () => {
      // We normally do want to absorb the wheel event that we are handling as
      // a canvas move.  This is normally also the case if it came from the canvas,
      // because if the wheel event happened over a scrollable panel, we don't want
      // the browser to actually scroll the panel (as we want to move the canvas
      // instead.)  The ONLY exception is when a wheel event moves the cursor from
      // within the canvas frame to outside the canvas frame! In this case, if we
      // do absorb the event, then the browser will no longer fire any more wheel
      // events after the cursor is outside the canvas frame, leading to a dead stop
      // in panning motion.  There must be some default action the browser is taking
      // that is somehow allowing the wheel event to keep firing after the cursor
      // has left the canvas frame, so we take care to _not_ cancel that specific
      // event.
      if (isCanvasIframeEvent(e)) {
        const frame = e.view?.frameElement as HTMLElement | undefined;
        if (frame) {
          const scaledDeltaX = deltaX / this.zoom;
          const scaledDeltaY = deltaY / this.zoom;
          const newClientX = e.clientX + scaledDeltaX;
          const newClientY = e.clientY + scaledDeltaY;
          // Use a 1-pixel cushion because when newClientX is something like 0.4,
          // browser may regard the event as outside of the iframe as well
          if (
            newClientX <= 1 ||
            newClientX >= frame.offsetWidth - 1 ||
            newClientY <= 1 ||
            newClientY >= frame.offsetHeight - 1
          ) {
            return false;
          }
        }
      }
      return true;
    };

    if (shouldAbsorbMove()) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private handleWheelZoom = (
    e: WheelEvent,
    topClientX: number,
    topClientY: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const now = new Date().getTime();
    if (
      this.wheelZoomState === undefined ||
      !this.isContinuousWheelZooming(e, now)
    ) {
      const zoomState = this.doComputeZoomState(new Pt(topClientX, topClientY));
      this.wheelZoomState = {
        ...zoomState,
        startScreenX: e.screenX,
        startScreenY: e.screenY,
        lastZoomEventTimestamp: now,
      };
    } else {
      this.wheelZoomState.lastZoomEventTimestamp = now;
    }

    const curScale = this.zoom;
    const isWheelByMouseMiddleButton = this.isCtrlOrMetaDown();

    // When ctrl or meta is pressed, wheel event is generated by the mouse's
    // middle key. In that case, we re-align the minDelta with the device.
    const getMinDeltaY = () => {
      if (PLATFORM === "osx") {
        return isWheelByMouseMiddleButton ? 4 : 0.7;
      } else {
        return isWheelByMouseMiddleButton ? 79.5 : 2.29;
      }
    };
    const normalizedDeltaY = e.deltaY / getMinDeltaY();
    // The factor for one notch operation. The higher, the more scale per notch
    // can make. We make zooming by mouse zoom faster than trackpad.
    const scaleFactor = isWheelByMouseMiddleButton ? 2.5 : 0.5;
    const scaleDelta = (normalizedDeltaY * curScale * scaleFactor) / 100;
    // keep the scale precision to 0.00001
    const newScale = Math.trunc((curScale - scaleDelta) * 100000) / 100000;
    this.tryZoomAtFixedPos(newScale, this.wheelZoomState);
  };

  // Compute zoomState to keep the focus at clientX/clientY in the current
  // topmost window's viewport.
  doComputeZoomState = (clientPt: Pt) => {
    const scalerPt = this.viewportCtx!.clientToScaler(clientPt);
    return { clientPt, scalerPt };
  };

  tryZoomWithScale = (scale: number): void => {
    // Zoom under the center of the canvas viewport
    // TODO zoom under the current position of the cursor?
    this.viewportCtx!.scaleAtMidPt(scale);
  };

  tryZoomWithDirection = (dir: -1 | 1): void => {
    this.tryZoomWithScale(zoomJump(this.zoom, dir));
  };

  private isContinuousWheelZooming = (e: WheelEvent, now: number) => {
    return (
      this.wheelZoomState !== undefined &&
      e.screenX === this.wheelZoomState.startScreenX &&
      e.screenY === this.wheelZoomState.startScreenY &&
      this.wheelZoomState.lastZoomEventTimestamp !== undefined &&
      now - this.wheelZoomState.lastZoomEventTimestamp < 200
    );
  };

  tryZoomAtFixedPos = (scale: number, zoomState: ZoomState): void => {
    this.viewportCtx!.scaleAtFixedPt(
      scale,
      zoomState.scalerPt,
      zoomState.clientPt
    );
  };

  getArenaFrameScalerRect(frame: ArenaFrame) {
    if (frame.left != null && frame.top != null) {
      // Absolutely laid out, so we always know the scaler rect
      return {
        top: frame.top,
        left: frame.left,
        width: frame.width,
        height: getFrameHeight(frame),
      };
    }

    // Automatically laid out, so we need to query the DOM for
    // the scaler rect
    const frameElt = this.getFrameElement(frame);
    if (!frameElt) {
      return undefined;
    }

    // Check frameElt.offsetParent to make sure it is visible
    // (not display:none) and that the arena is shown (not visibility:hidden),
    // so we can trust its actual bounding box
    const clientRect = frameElt.getBoundingClientRect();
    if (clientRect.height === 0 || clientRect.width === 0) {
      // When we initially switch to an arena, our clientRect will be zero-sized because
      // of the scale(0) transform on the ancestor canvas-editor__frames and the browser
      // hasn't had a chance to re-draw yet
      return undefined;
    }
    const scalerRect = this.viewportCtx!.clientToScaler(
      Box.fromRect(clientRect)
    ).rect();
    return scalerRect;
  }

  /** Returns element of frame if rendered and visible. */
  private getFrameElement(frame: ArenaFrame) {
    const frameElt = document.querySelector(
      `[data-frame-id="${frame.uid}"]`
    ) as HTMLElement | null;
    if (
      frameElt &&
      frameElt.offsetParent &&
      $(frameElt).parents(".canvas-editor__frames").css("visibility") !==
        "hidden"
    ) {
      return frameElt;
    } else {
      return null;
    }
  }

  tryZoomToFitArena() {
    const arena = this.currentArena;
    if (!arena) {
      return;
    }

    const viewportCtx = this.viewportCtx;
    if (!viewportCtx) {
      // Window hasn't fully initialized yet, try again after 10ms
      setTimeout(() => this.tryZoomToFitArena(), 10);
      return;
    }

    viewportCtx.zoomToScalerBox(
      Box.zero().withSizeOfPt(viewportCtx.arenaScalerSize()),
      {
        maxScale: 1,
        minPadding: {
          left: DEFAULT_ZOOM_PADDING + this.getArenaGridLabelsWidth(),
          right: DEFAULT_ZOOM_PADDING,
          top: DEFAULT_ZOOM_PADDING,
          bottom: DEFAULT_ZOOM_PADDING,
        },
        ignoreHeight: this.focusedMode,
      }
    );
  }

  tryZoomToFitSelection() {
    const focusedFrame = this.focusedFrame();
    if (focusedFrame) {
      this.tryZoomToFitFrame(focusedFrame);
      return;
    }

    const vc = this.focusedViewCtx();
    if (!vc) {
      return;
    }

    const $focusedDom = vc.focusedDomElt();
    if (!$focusedDom?.length) {
      return;
    }

    this.tryZoomToFitDomElement($focusedDom[0]);
  }

  tryZoomToFitDomElement(element: HTMLElement) {
    const vc = this.focusedViewCtx();
    if (!vc) {
      return;
    }

    // Adjust right zoom padding if the comments dialog is open
    const rightZoomPadding =
      this.commentsCtx.openedNewThread() || this.commentsCtx.openedThread()
        ? COMMENTS_DIALOG_RIGHT_ZOOM_PADDING
        : DEFAULT_ZOOM_PADDING;

    const scalerRect = frameToScalerRect(element.getBoundingClientRect(), vc);
    this.viewportCtx!.zoomToScalerBox(Box.fromRect(scalerRect), {
      minPadding: {
        left: DEFAULT_ZOOM_PADDING,
        right: rightZoomPadding,
        top: DEFAULT_ZOOM_PADDING,
        bottom: DEFAULT_ZOOM_PADDING,
      },
    });
  }

  tryZoomToFitTpl(tpl: TplNode) {
    const vc = this.focusedViewCtx();
    if (!vc) {
      return;
    }
    const [_, doms] = vc.maybeDomsForTpl(tpl, {
      ignoreFocusedCloneKey: true,
    });
    if (doms?.length) {
      this.tryZoomToFitDomElement(doms[0]);
    }
  }

  tryZoomToFitFrame(frame: ArenaFrame, maxZoom?: number) {
    const viewportCtx = this.viewportCtx;
    const scalerRect = this.getArenaFrameScalerRect(frame);
    if (viewportCtx && scalerRect) {
      viewportCtx.zoomToScalerBox(Box.fromRect(scalerRect), {
        maxScale: maxZoom,
        minPadding: DEFAULT_ZOOM_PADDING,
      });
    } else {
      // Frame hasn't been rendered yet, so try again next tick
      defer(() => this.tryZoomToFitFrame(frame, maxZoom));
    }
  }

  private getArenaGridLabelsWidth() {
    const arenaGridLabels = getGridRowLabels(this.currentArena);

    if (arenaGridLabels.length === 0) {
      return 0;
    }

    const longestLabel = maxBy(arenaGridLabels, (it) => it.length) ?? "";

    const labelClassNames = cn(
      gridFramesLayoutStyles.rowLabel,
      gridFramesLayoutStyles.rowLabelInner
    );

    return getTextWidth(longestLabel, labelClassNames);
  }

  readonly multiplayerCtx = new MultiplayerCtx(this);

  private readonly cursorLocation = observable.box<{
    left: number;
    top: number;
  } | null>(null);

  private _watchPlayerId = observable.box<number | null>(null);

  get watchPlayerId() {
    return this._watchPlayerId.get();
  }

  setWatchPlayerId(v: number | null) {
    this._watchPlayerId.set(v);
  }

  updateCursorLocation(pos: { left: number; top: number } | null) {
    const cur = this.cursorLocation.get();
    if ((!cur && !pos) || (cur?.left === pos?.left && cur?.top === pos?.top)) {
      return;
    }
    this.cursorLocation.set(pos);
  }

  private viewInfoObserverDispose: (() => void) | undefined = undefined;
  private watchPlayerDispose: (() => void) | undefined = undefined;

  private shouldSyncWithOtherPlayers = () => {
    return this.editMode;
  };

  /**
   * Start listening for changes to this project on the server.
   */
  async startListeningForSocketEvents() {
    const api = this.appCtx.api;
    let connected = false;
    const eventListeners = {
      connect: async () => {
        // upon connection, subscribe to changes for argument projects
        connected = true;
        await api.emit("subscribe", {
          namespace: "projects",
          projectIds: [this.siteInfo.id],
          studio: true,
        });
        if (this.isAtTip) {
          if (this.canSendMultiplayerInfo()) {
            if (this.viewInfoObserverDispose) {
              this.viewInfoObserverDispose();
            }
            this.viewInfoObserverDispose = autorun(
              () => {
                const focusedVc = this.focusedViewCtx();
                const frameUuid = focusedVc?.arenaFrame().uuid;
                const selectable = this.hoverBoxControlledObj;
                const selectableKey = isSelectable(selectable)
                  ? makeSelectableFullKey(selectable)
                  : undefined;
                const cursor = this.cursorLocation.get();
                const position =
                  this.viewportCtx?.visibleScalerBox().rect() ?? null;

                const branchInfo = this.branchInfo();
                const data: UpdatePlayerViewRequest = {
                  projectId: this.siteInfo.id,
                  branchId: branchInfo ? branchInfo.id : null,
                  arena: this.currentArena
                    ? {
                        type: getArenaType(this.currentArena),
                        uuidOrName: getArenaUuidOrName(this.currentArena),
                        focused: this.focusedMode,
                      }
                    : null,
                  cursor:
                    cursor && this.editMode && !this.isLiveMode
                      ? {
                          left: cursor.left,
                          top: cursor.top,
                        }
                      : null,
                  selection:
                    frameUuid && this.editMode && !this.isLiveMode
                      ? {
                          selectableFrameUuid: frameUuid,
                          selectableKey,
                        }
                      : null,
                  position: position,
                };
                spawn(api.emit("view", data));
              },
              { name: "StudioCtx.syncView", delay: 200 }
            );
          }
          if (this.watchPlayerDispose) {
            this.watchPlayerDispose();
          }
          this.watchPlayerDispose = autorun(
            () => {
              if (this.watchPlayerId) {
                const playerData = this.multiplayerCtx.getPlayerDataById(
                  this.watchPlayerId
                );
                if (!playerData) {
                  this.setWatchPlayerId(null);
                  return;
                }

                // TODO: https://app.shortcut.com/plasmic/story/37322
                if (playerData.viewInfo?.arenaInfo?.focused) {
                  this.setWatchPlayerId(null);
                  return;
                }

                spawn(this.goToPlayer(this.watchPlayerId, true));
              }
            },
            { name: "StudioCtx.watchPlayer", delay: 200 }
          );
        }
      },
      initServerInfo: (data: InitServerInfo) => {
        const oudatedSchema = modelSchemaHash !== data.modelSchemaHash;
        const outdatedBundle =
          data.bundleVersion !== this.appCtx.lastBundleVersion;
        this.multiplayerCtx.updateSelfId(data.selfPlayerId);
        if (oudatedSchema || outdatedBundle) {
          this.alertBannerState.set(AlertSpec.OutOfDate);
          spawn(this.changeUnsafe(() => (this.isAtTip = false)));
        }
      },
      commentsUpdate: async () => {
        await this.commentsCtx.fetchComments();
      },
      update: async (data: any) => {
        // Just run syncProjects() for now when any project has been updated
        console.log(
          `Project ${data.projectId} updated to revision ${data.revisionNum}`
        );

        if (!this.editMode) {
          return;
        }

        if (
          this.pendingSavedRevisionNum === undefined ||
          this.pendingSavedRevisionNum < data.revisionNum
        ) {
          if (this.shouldSyncWithOtherPlayers()) {
            if (this.isAtTip) {
              await this.fetchUpdates();
            }
          } else {
            if (this.alertBannerState.get() === AlertSpec.Watch) {
              await this.fetchUpdatesWatch();
            } else if (this.isAtTip) {
              console.log(
                `Edit lock stolen.  pendingSavedRevisionNum is ${this.pendingSavedRevisionNum} but got ${data.revisionNum}`
              );
              this.alertBannerState.set(AlertSpec.ConcurrentEdit);
              await this.changeUnsafe(() => (this.isAtTip = false));
            }
          }
        } else if (this.pendingSavedRevisionNum === data.revisionNum) {
          // The ACKs have now caught up to the latest pending save.
          this.pendingSavedRevisionNum = undefined;
        }
      },
      players: (data: ServerSessionsInfo) =>
        this.isAtTip && this.multiplayerCtx.updateSessions(data.sessions),
      error: (err) => {
        console.log("Error received from socket", err);
      },
      disconnect: async () => {
        await this.multiplayerCtx.updateSessions([]);
      },
      publish: (data: PkgVersionInfoMeta) =>
        (this.releases.length === 0 || this.releases[0].id !== data.id) &&
        this.releases.unshift(data),
      hostlessDataVersionUpdate: (data: any) => {
        if (data.hostlessDataVersion !== this.dbCtx().hostlessDataVersion) {
          this.alertBannerState.set(AlertSpec.OutOfDate);
          this.isAtTip = false;
        }
      },
    };

    const eventNames = Object.keys(eventListeners);
    // We intentionally loop forever until someone calls stopListeningForRevisions.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { eventName, data } = await api.listenSocket(eventNames, connected);
      await eventListeners[eventName](data);
    }
  }

  /**
   * Returns true if the onwer of the project is a plasmic dev or if this is a normal user.
   * This is used to avoid sending multiplayer info from plasmic devs to other users when
   * debugging an user project.
   */
  canSendMultiplayerInfo() {
    return (
      isAdminTeamEmail(this.siteInfo.owner?.email, this.appCtx.appConfig) ||
      !isAdminTeamEmail(this.appCtx.selfInfo?.email, this.appCtx.appConfig)
    );
  }

  async stopListeningForSocketEvents() {
    await this.appCtx.api.closeSocket();
  }

  /** Continuously called when player data changes. */
  async goToPlayer(playerId: number, smooth?: boolean) {
    const playerData = this.multiplayerCtx.getPlayerDataById(playerId);
    const branchId = playerData?.viewInfo?.branchId;
    const arenaInfo = playerData?.viewInfo?.arenaInfo;
    const position = playerData?.viewInfo?.positionInfo;
    if (!arenaInfo || !position) {
      return;
    }

    // TODO: https://app.shortcut.com/plasmic/story/37322
    if (arenaInfo.focused) {
      return;
    }

    let branch: ApiBranch | undefined = undefined;
    if (branchId) {
      // Given branchId, lookup branch name

      // Try using the current branch first
      const currentBranch = this.dbCtx().branchInfo;
      if (currentBranch?.id === branchId) {
        branch = currentBranch;
      } else {
        // Else make network call for branches
        const { branches } = await this.appCtx.api.listBranchesForProject(
          this.siteInfo.id
        );
        branch = branches.find((b) => (b.id = branchId));
        if (!branch) {
          return; // Give up on watching player
        }
      }
    }

    // TODO: support following to previous versions?
    if (branch !== this.dbCtx().branchInfo) {
      await this.loadVersion(
        undefined /* undefined loads latest version */,
        true,
        branch
      );
    }

    const changeResult = await this.change<void, AnyArena>(
      ({ success, failure }) => {
        const arena = getArenaByNameOrUuidOrPath(
          this.site,
          arenaInfo.uuidOrName,
          arenaInfo.type
        );
        if (!arena) {
          return failure();
        }

        // TODO: https://app.shortcut.com/plasmic/story/37322
        if (isDedicatedArena(arena)) {
          arena._focusedFrame = null;
        }

        this.switchToArena(arena, { stopWatching: false });

        return success(arena);
      },
      {
        noUndoRecord: true,
      }
    );
    if (changeResult.result.isError) {
      return; // Give up on watching player
    }

    const arena = changeResult.result.value;

    this.viewportCtx?.zoomToScalerBox(Box.fromRect(position), {
      smooth,
    });
    const selection = playerData?.viewInfo?.selectionInfo;
    const arenaFrame = selection
      ? getArenaFrames(arena).find(
          (frame) => frame.uuid === selection.selectableFrameUuid
        )
      : undefined;
    if (!arenaFrame) {
      this.setStudioFocusOnFrameContents(undefined);
      this.focusReset.dispatch();
      return;
    }
    const viewCtx = await this.awaitViewCtxForFrame(arenaFrame);
    if (viewCtx) {
      viewCtx.selectFromSelectionId(selection?.selectableKey);
    }
  }

  private _focusedBottomModalIndex = observable.box<number | undefined>();

  get focusedBottomModalIndex() {
    return this._focusedBottomModalIndex.get();
  }

  setFocusedBottomModalIndex(v: number | undefined) {
    this._focusedBottomModalIndex.set(v);
  }

  isBottomModalFocused() {
    return this.focusedBottomModalIndex != null;
  }

  //
  // Manage undo / redo
  //
  undoLog: UndoLog;

  createViewStateUndoRecord() {
    this.undoLog.record(this.createUndoRecord());
  }

  canUndo() {
    return this.undoLog.canUndo();
  }

  async undo() {
    assert(!this._isChanging, "isChanging should be false");
    if (this.isBottomModalFocused()) {
      // If the bottom modal is open, the user was more likely trying to undo
      // some settings there and not in Studio.
      return;
    }
    if (this.undoLog.canUndo()) {
      await this.modelChangeQueue.push({ type: "undo" });
      defer(() => this.framesChanged.dispatch());
    }
  }

  canRedo() {
    return this.undoLog.canRedo();
  }

  async redo() {
    assert(!this._isChanging, "isChanging should be false");
    if (this.isBottomModalFocused()) {
      return;
    }
    if (this.undoLog.canRedo()) {
      await this.modelChangeQueue.push({ type: "redo" });
      defer(() => this.framesChanged.dispatch());
    }
  }

  private createUndoRecord(changes?: RecordedChanges): UndoRecord {
    return {
      changes: changes || emptyRecordedChanges(),
      view: this.currentViewState(),
    };
  }

  private async restoreUndoRecordInternal(type: "undo" | "redo") {
    const previousComponentCtxs = new Map<ViewCtx, ComponentCtx | null>(
      this.viewCtxs.map((vc) => tuple(vc, vc.currentComponentCtx()))
    );
    const vcToSpotlightAndVariantsInfo = new Map<
      ViewCtx,
      SpotlightAndVariantsInfo
    >(this.viewCtxs.map((vc) => tuple(vc, vc.getSpotlightAndVariantsInfo())));

    const restoreStudioView = (view: ViewStateSnapshot) => {
      const focusedArena = getSiteArenas(this.site).find(
        (it) => it === view.focusedArena
      );

      if (!focusedArena) {
        return;
      }

      if (this.currentArena !== focusedArena) {
        this.switchToArena(focusedArena, {
          noFocusedModeChange: true, // undo record should have the correct focused mode state
        });
      }

      if (!focusedArena) {
        return;
      }

      if (view.focusedFrame && !view.focusedOnFrame) {
        // If there's a focused object, then we defer for ViewCtx.restoreViewState to restore
        return;
      } else if (view.focusedFrame) {
        // Focused just on the frame
        this.setStudioFocusOnFrame({
          frame: view.focusedFrame,
          autoZoom: false,
        });
      } else {
        // Focused on nothing
        this.setStudioFocusOnFrame({ frame: undefined, autoZoom: false });
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const sc = this;
    const update = flow(function* () {
      if (type === "undo" && !sc.undoLog.canUndo()) {
        notification.error({ message: "Cannot undo anymore." });
        return {};
      }
      if (type === "redo" && !sc.undoLog.canRedo()) {
        notification.error({ message: "Cannot redo anymore." });
        return {};
      }
      if (sc.blockChanges) {
        return {};
      }
      const record = type === "undo" ? sc.undoLog.undo() : sc.undoLog.redo();
      console.log(`Restore ${type} record`, record);

      console.log("Done restoring, pruning...");
      // Trim the ViewCtxs based on what arenas are in use.  E.g. when undoing a
      // create-frame, make sure we don't let a ViewCtx linger around, or it will
      // cause problems (beyond memory leaks, e.g. when redoing, the old ViewCtx
      // may steal stuff from the newly re-created ViewCtx).
      sc.pruneInvalidViewCtxs();

      // We may have stray pointers from the ctxs to detached tpls.  Since we're
      // about to embark on async work, we first go and remove those references,
      // so that we don't update the UI to reflect those detached tpls.
      sc.pruneDetachedTpls();

      restoreStudioView(record.view);

      // Restore and re-evaluate ViewCtxs (we must do it before fixupChrome)
      if (record.view.focusedFrame) {
        const frame = record.view.focusedFrame;
        for (let i = 0; i < 10 && !sc.tryGetViewCtxForFrame(frame); i++) {
          // It's possible (although very unlikely) that a frame remounts and
          // disposes the viewCtx just after it has been created, so we try
          // again a couple of times before failing.
          yield sc.awaitViewCtxForFrame(frame);
        }
        const vc = ensure(
          sc.tryGetViewCtxForFrame(frame),
          "should find viewctx for this frame"
        );
        console.log("Restoring VC");
        // Restore VC before doing post-change fixes
        vc.restoreViewState(record.view);
      }

      record.changes = mergeRecordedChanges(
        record.changes,
        sc.recorder.withRecording(() => {
          // Since we just messed with some ComponentStackFrames,
          // make sure that the frames only have valid variants
          sc.ensureAllComponentStackFramesHasOnlyValidVariants();

          // Make sure focused tpls have the right variant settings
          fixupChrome(sc);
        })
      );

      sc.addToChangeRecords(record.changes);

      const summary = summarizeChanges(sc, record.changes);

      console.log("RESTORE summary", summary, record.changes);

      const styleChanges = sc.syncAfterChanges(summary);

      console.log(`Done restoring ${type} record`, record);
      return { record, summary, styleChanges };
    });
    try {
      sc._isUndoing = true;

      // First, we perform the actual undo in a mobx transaction,
      // updating all tpl nodes and view-level observables
      const { record, summary, styleChanges } = await update();

      if (!record || !summary) {
        return;
      }

      // Next, we go ahead and re-evaluate ViewCtxs that should be
      // re-evaluated.  We do this in a separate mobx transaction,
      // so that all the updates from the first transaction will
      // be visible in the second

      const shouldEvaluate = (vc: ViewCtx) => {
        return this.shouldEvaluateViewCtx(vc, {
          summary,
          previousComponentCtx: previousComponentCtxs.get(vc),
          previousVcInfo: vcToSpotlightAndVariantsInfo.get(vc),
        });
      };

      const shouldRestyle = (vc: ViewCtx) => {
        // Should update vc style if it's never had styles before,
        // or if there has been style changes
        return !vc.valState().maybeValSysRoot() || !!styleChanges;
      };

      this.viewCtxs.forEach((vc) => {
        const isFocused = vc.arenaFrame() === record.view.focusedFrame;
        const needsEval = shouldEvaluate(vc);
        vc.scheduleSync({
          eval: needsEval,
          styles: shouldRestyle(vc),
          asap: isFocused,
        });
      });
    } finally {
      sc._isUndoing = false;
    }
  }

  private shouldEvaluateViewCtx(
    vc: ViewCtx,
    opts: {
      summary: ChangeSummary;
      showPlaceholderChanged?: boolean;
      interactiveModeChanged?: boolean;
      previousComponentCtx: ComponentCtx | null | undefined;
      previousVcInfo: SpotlightAndVariantsInfo | null | undefined;
    }
  ) {
    if (!vc.valState().maybeValGlobalRoot()) {
      // If this frame has never been evaluated before, then evaluate.
      return true;
    }

    const {
      summary,
      showPlaceholderChanged,
      interactiveModeChanged,
      previousComponentCtx,
      previousVcInfo,
    } = opts;
    // If theme snapshot, "show placeholders" or "interactive mode" changed,
    // we need to re-evaluate all viewctx.
    if (showPlaceholderChanged || interactiveModeChanged) {
      // If the caller instructed us to force eval, then do so
      return true;
    }
    // If componentCtx changes, we need to re-render it anyway.
    if (previousComponentCtx !== vc.currentComponentCtx()) {
      return true;
    }

    const vcInfo = vc.getSpotlightAndVariantsInfo();
    // If spotlight or the pinned variants change, we also need to re-render
    // the frame.
    if (!previousVcInfo || viewCtxInfoChanged(vcInfo, previousVcInfo)) {
      return true;
    }

    // TODO: also check for grid style changes
    if (
      summary.changesType !== ChangesType.OtherChanges &&
      !summary.styleForcesEval
    ) {
      // If there are only css changes, then fixupForChanges() above has
      // already fixed the css styles for them, so we don't need to
      // re-evaluate.
      //
      // However, certain style changes do require changing the DOM --
      // grid styles and other indicated by summary.styleForcesEval --
      // so we still need to re-evaluate them if they are deeply
      // referenced by this vc's component.
      return false;
    }

    // Else, evaluate this frame if its component has been updated, or is
    // deeply referencing some node that has been updated.
    return vc.component && summary.deepUpdatedComponents.has(vc.component);
  }

  private currentViewState(): ViewStateSnapshot {
    const arena = this.currentArena;
    const vc = this.focusedViewCtx();
    const curFocusedFrame = this.focusedFrame();
    const frame = vc
      ? vc.arenaFrame()
      : arena &&
        curFocusedFrame &&
        getArenaFrames(arena).includes(curFocusedFrame)
      ? curFocusedFrame
      : undefined;
    // If the element is invisible, then retain the focusedTpl.
    const nextFocusedTpl =
      (vc && vc.nextFocusedTpl()) ||
      (vc && !vc.focusedSelectable() ? vc.focusedTpl() : undefined);

    // We keep a clone() of the ComponentStackFrame for our undo record because
    // ComponentStackFrame mutates its state, so just keeping a reference to it
    // is not enough
    const variantsStack = vc
      ? vc
          .componentStackFrames()
          .slice()
          .map((f) => f.clone())
      : frame
      ? [new RootComponentVariantFrame(frame)]
      : undefined;

    return {
      focusedArena: arena,
      focusedFrame: frame,
      focusedOnFrame: !!this.focusedFrame(),
      focusedSelectable: (vc && vc.focusedSelectable()) || undefined,
      vcComponentStack: variantsStack,
      currentComponentCtx: vc
        ? vc.currentComponentCtx() || undefined
        : undefined,
      nextFocusedTpl: nextFocusedTpl || undefined,
      vcFocusedCloneKey: vc?.focusedCloneKey(),
    };
  }

  //
  // Manage free-style drawing -- whether we are in free-drawing mode,
  // what we are free-drawing for
  //
  private _pointerState: PointerState = "move";
  private _freestyleState = observable.box<FreestyleState | undefined>(
    undefined
  );
  setFreestyleState(state: FreestyleState | undefined) {
    this.setDragInsertState(undefined);
    this._freestyleState.set(state);
  }
  freestyleState() {
    return this._freestyleState.get();
  }

  pointerState() {
    return this.freestyleState() === undefined ? "move" : this._pointerState;
  }
  setPointerState(pointerState: PointerState) {
    this._pointerState = pointerState;
    switch (pointerState) {
      case "move":
        return this.setFreestyleState(undefined);
      case "rect":
        return this.setFreestyleState(
          new FreestyleState(INSERTABLES_MAP.box as AddTplItem)
        );
      case "stack":
        return this.setFreestyleState(
          new FreestyleState(INSERTABLES_MAP.stack as AddTplItem)
        );
      case "hstack":
        return this.setFreestyleState(
          new FreestyleState(INSERTABLES_MAP.hstack as AddTplItem)
        );
      case "vstack":
        return this.setFreestyleState(
          new FreestyleState(INSERTABLES_MAP.vstack as AddTplItem)
        );
      case "text":
        return this.setFreestyleState(
          new FreestyleState(INSERTABLES_MAP.text as AddTplItem)
        );
    }
  }

  //
  // Manage drag insertion mode (when we select an item to be inserted and nothing
  // is selected on the canvas)
  //
  private _dragInsertState = observable.box<DragInsertState | undefined>(
    undefined
  );
  setDragInsertState(state: DragInsertState | undefined) {
    if (state) {
      this.setFreestyleState(undefined);
      this.startUnlogged();
    } else {
      this.stopUnlogged();
      this.dragInsertState()?.dragMgr.clear();
    }
    this._dragInsertState.set(state);
  }
  dragInsertState() {
    return this._dragInsertState.get();
  }

  //
  // indicate whether we are dragging an element (not dragging the label of the
  // element). This is needed to hide the HoverBox, which doesn't know about
  // the state of ViewEditor when dragging an element otherwise.
  //
  private _isDraggingObject = observable.box<boolean>(false);
  setIsDraggingObject(v: boolean) {
    this.app.setIsDragging(v);
    this._isDraggingObject.set(v);
  }
  isDraggingObject() {
    return this._isDraggingObject.get();
  }
  private _isDraggingResize = observable.box<boolean>(false);
  get isResizeDragging() {
    return this._isDraggingResize.get();
  }
  set isResizeDragging(v: boolean) {
    this.app.setIsDragging(v);
    this._isDraggingResize.set(v);
  }

  //
  // Indicate whether we are transforming an element, with css transforms.
  // This is needed to hide the HoverBox during the change
  //
  private _isTransformingObject = observable.box<boolean>(false);
  setIsTransformingObject(v: boolean) {
    this._isTransformingObject.set(v);
  }
  isTransformingObject() {
    return this._isTransformingObject.get();
  }

  public splitsStatusChanges = new Map<string, string>();

  //
  // Dealing with generating CSS styles used by all frames
  //
  private styleMgr: StyleMgr;
  styleChanged = new Signals.Signal();
  framesChanged = new Signals.Signal();
  focusReset = new Signals.Signal();
  leftPanelHighlightingRequested = new Signals.Signal();
  showProjectPanelRequested = new Signals.Signal();
  highlightInteractionRequested: Signals.Signal<HighlightInteractionRequest> =
    new Signals.Signal();

  highlightLeftPanel = () => {
    this.leftPanelHighlightingRequested.dispatch();
  };

  showProjectPanel = () => {
    this.showProjectPanelRequested.dispatch();
  };

  styleMgrBcast = {
    syncStyles: () => {
      const focusedVc = this.focusedViewCtx();
      for (const vc of this.viewCtxs) {
        vc.scheduleSync({
          eval: false,
          styles: true,
          asap: vc === focusedVc,
        });
      }
    },
    installDepStyles: (dep: ProjectDependency) => {
      this.styleMgr.upsertStyles({
        updatedDeps: new Set([dep]),
      });
      this.styleMgrBcast.syncStyles();
    },
    removeDepStyles: (dep: ProjectDependency) => {
      this.styleMgr.upsertStyles({
        deletedDeps: new Set([dep]),
      });
      this.styleMgrBcast.syncStyles();
    },
    upsertStyleSheets: (viewCtx: ViewCtx) => {
      const canvasCtx = viewCtx.canvasCtx;
      this.styleMgr.upsertStyleSheets(canvasCtx.$doc()[0], viewCtx.component);
    },
  };

  //
  // Inserting new tpl nodes
  //
  async tryInsertTplItem(
    item: AddTplItem,
    opts?: ExtraInfoOpts
  ): Promise<TplNode | null> {
    const vc = this.focusedViewCtx();
    if (!vc) {
      if (item.type === "tpl") {
        const dragMgr = await DragInsertManager.build(this, item, opts);
        await this.changeUnsafe(() => {
          this.setDragInsertState(new DragInsertState(dragMgr, item));
        });
      } else {
        notification.error({
          message: "First select an element you want to insert to.",
        });
      }
      return null;
    }

    // If inserting a template, then insert at innermost main-content-slot, or else root.
    const tryGetInsertableTemplateTarget = ():
      | TplNode
      | SlotSelection
      | undefined => {
      const tpls = flattenTpls(vc.currentComponent().tplTree).reverse();
      for (const tpl of tpls) {
        if (isTplComponent(tpl)) {
          const slotParam = tpl.component.params.find(
            (p) => p.isMainContentSlot
          );
          if (slotParam) {
            // Found it!
            return new SlotSelection({
              tpl,
              slotParam,
            });
          }
        }
      }
      // Fallback is inside the page root, but what does that mean?
      // Only allowing inside HTML elements or TplComponent children slot (instead of any arbitrary slot).
      return switchType(last(tpls))
        .when(TplComponent, (t) => {
          const slotParam = t.component.params.find((p) => isSlot(p));
          return slotParam
            ? new SlotSelection({ tpl: t, slotParam })
            : undefined;
        })
        .when(TplTag, (t) => (isTplContainer(t) ? t : undefined))
        .when(TplSlot, (_t) => undefined)
        .result();
    };

    const getTargetLoc = (): [
      TplNode | SlotSelection | undefined,
      InsertRelLoc[]
    ] => {
      if (this.appCtx.appConfig.mainContentSlots) {
        const sel = maybe(vc.focusedTpl(), tryGetMainContentSlotTarget);
        if (sel) {
          return [sel, [InsertRelLoc.append]];
        }
      }
      // This is a hacky way to identify that the item is an insertable template.
      if (
        this.appCtx.appConfig.insertTemplatesIntoMainContentSlots &&
        item.key.startsWith("insertable-template-item")
      ) {
        const target = tryGetInsertableTemplateTarget();
        if (target) {
          return [target, [InsertRelLoc.append]];
        }
      }
      // undefined target means insert at selection
      return [
        undefined,
        getPreferredInsertLocs(vc, getFocusedInsertAnchor(vc)),
      ];
    };

    const [target, locs] = getTargetLoc();
    if (locs.length === 0) {
      notification.error({
        message: "Cannot insert this at the current location.",
      });
      return null;
    }
    const extraInfo = item.asyncExtraInfo
      ? await item.asyncExtraInfo(vc.studioCtx, opts)
      : undefined;
    if (extraInfo === false) {
      return null;
    }
    return await this.changeUnsafe(() =>
      vc.getViewOps().tryInsertInsertableSpec(item, locs[0], extraInfo, target)
    );
  }

  async runFakeItem(item: AddFakeItem): Promise<any> {
    const extraInfo = item.asyncExtraInfo
      ? await item.asyncExtraInfo(this)
      : undefined;
    if (extraInfo !== false) {
      await this.change(({ success }) => {
        item.factory(this, extraInfo);
        return success();
      });
    }
    return extraInfo;
  }

  customFunctionsSchema = computedFn((): DataPickerTypesSchema => {
    const registeredFunctionsMap = new Map(
      this.getRegisteredFunctions().map((f) => [registeredFunctionId(f), f])
    );
    const getCustomFunctionDeclaration = (
      customFunction: classes.CustomFunction
    ) => {
      const registeredTypeToTs = (type: any): string => {
        if (Array.isArray(type)) {
          return type.map((t) => registeredTypeToTs(t)).join(" | ");
        }
        switch (type) {
          case "array":
            return "any[]";
          case "object":
            return "{ [key: string]: any }";
          default:
            return type;
        }
      };
      const meta = registeredFunctionsMap.get(
        customFunctionId(customFunction)
      )?.meta;
      let documentation = "";
      if (meta?.description) {
        documentation += meta.description
          .split("\n")
          .map((l) => ` * ${l}\n`)
          .join("");
      }
      if (meta?.params?.some((p) => !!p.description)) {
        meta.params.forEach((p) => {
          if (p.description) {
            documentation += p.description
              .split("\n")
              .map((l, i) => ` * ${i === 0 ? `@param ${p.name} ` : ""}${l}\n`)
              .join("");
          }
        });
      }
      if (meta?.returnValue?.description) {
        documentation += meta.returnValue.description
          .split("\n")
          .map((l, i) => ` * ${i === 0 ? `@returns ` : ""}${l}\n`)
          .join("");
      }
      const prefix = `${documentation ? `/**\n${documentation}*/` : ""}${
        customFunction.importName
      }`;
      const untypedFn = `(...args: any[]): any`;
      if (!meta) {
        return `${prefix}${untypedFn}`;
      }
      if (meta.typescriptDeclaration) {
        return `${prefix}${meta.typescriptDeclaration}`;
      }
      return `${prefix}(${
        meta.params
          ? meta.params
              .map((p) =>
                typeof p === "string"
                  ? `${p}: any`
                  : `${p.isRestParameter ? "..." : ""}${p.name}${
                      p.isOptional ? "?" : ""
                    }: ${registeredTypeToTs(p.type)}`
              )
              .join(", ")
          : `...args: any[]`
      }): ${
        meta.returnValue?.type
          ? registeredTypeToTs(meta.returnValue?.type)
          : "any"
      }`;
    };
    const getCodeLibraryDeclaration = (lib: classes.CodeLibrary): string => {
      return `${lib.jsIdentifier}: typeof import("${lib.importPath}")${
        lib.importType === "default"
          ? lib.isSyntheticDefaultImport
            ? ""
            : ".default"
          : lib.importType === "namespace"
          ? ""
          : `.${lib.namedImport}`
      }`;
    };
    // Subscribe to changes to `installedHostLessPkgs` so the schema is updated
    // once the code is evaluated
    this.installedHostLessPkgs.size;
    this.installedHostLessPkgs.forEach(() => {
      /* empty */
    });
    return {
      $$: `{
        ${withoutNils([
          ...[
            ...allCustomFunctions(this.site)
              .map(({ customFunction }) => customFunction)
              .filter((f) => !f.namespace),
            ...Object.values(
              groupBy(
                allCustomFunctions(this.site)
                  .map(({ customFunction }) => customFunction)
                  .filter((f) => !!f.namespace),
                (f) => f.namespace
              )
            ),
          ].map((functionOrGroup) =>
            !Array.isArray(functionOrGroup)
              ? getCustomFunctionDeclaration(functionOrGroup)
              : `${functionOrGroup[0].namespace}: {
                ${functionOrGroup
                  .map((customFunction) =>
                    getCustomFunctionDeclaration(customFunction)
                  )
                  .join(";\n")}
              }`
          ),
          ...allCodeLibraries(this.site).map(({ codeLibrary }) =>
            getCodeLibraryDeclaration(codeLibrary)
          ),
        ]).join(";\n")}}`,
      [extraTsFilesSymbol]: this.getRegisteredLibraries().flatMap(
        (lib) => lib.meta.files
      ),
    };
  });

  //
  // Renaming component
  //
  maybeWarnComponentRenaming(givenName: string, actualName: string) {
    if (actualName !== givenName) {
      notification.info({
        message: "Component renamed",
        description: `${givenName} is reserved or invalid; renamed to ${actualName} instead.`,
      });
    }
  }

  maybeWarnPathChange(givenPath: string, actualPath: string) {
    if (actualPath !== givenPath) {
      notification.info({
        message: "Path changed",
        description: `${givenPath} is reserved or invalid; renamed to ${actualPath} instead.`,
      });
    }
  }

  tryChangePath = (page: PageComponent, newPath: string) => {
    if (!newPath.startsWith("/")) {
      newPath = `/${newPath}`;
    }
    if ((page.pageMeta?.path || "") === newPath) {
      return;
    }
    const params = extractParamsFromPagePath(newPath);
    for (let i = 0; i < params.length; i++) {
      if (params[i].startsWith("...") && i !== params.length - 1) {
        notification.error({
          message: "Catch-all path slugs must be the last slug in the path",
        });
        return;
      }
    }
    if (params.some((p) => p.startsWith("..."))) {
      // catch all routes only supported if host is greater than
      // 1.0.186
      const hostVersion = getRootSubHostVersion();
      if (!hostVersion || lt(hostVersion, "1.0.186")) {
        notification.error({
          message: "Catch-all routes are not supported for your host",
          description: (
            <>
              Please upgrade <code>@plasmicapp/*</code> packages in your host
              app to the latest version.
            </>
          ),
        });
        return;
      }
    }
    return this.changeUnsafe(() => {
      this.tplMgr().changePagePath(page, newPath);
      this.maybeWarnPathChange(
        newPath,
        ensure(page.pageMeta, "page should have pageMeta").path
      );
    });
  };

  tryChangePageMeta = async (page: Component, key: "title", value: string) => {
    return this.changeUnsafe(() => {
      if (!page.pageMeta) {
        return;
      }

      page.pageMeta[key] = value;
    });
  };

  // When adding a data query from a shortcut (such as from the DataPicker)
  // we set it here so the component query section can auto-open it.
  private _newlyAddedQuery = observable.box<
    classes.ComponentDataQuery | undefined
  >();

  get newlyAddedQuery() {
    return this._newlyAddedQuery.get();
  }

  set newlyAddedQuery(v: classes.ComponentDataQuery | undefined) {
    this._newlyAddedQuery.set(v);
  }

  // When adding an event handler we set it here so the interaction section modal can auto-open it.
  private _newlyAddedEventHandlerKey = observable.box<
    EventHandlerKeyType | undefined
  >();

  get newlyAddedEventHandlerKey() {
    return this._newlyAddedEventHandlerKey.get();
  }

  set newlyAddedEventHandlerKey(v: EventHandlerKeyType | undefined) {
    this._newlyAddedEventHandlerKey.set(v);
  }

  //
  // Managing state of saving the project to the database
  //

  /** Throttled function that performs a save. */
  private asyncSaver: AsyncCallable;
  /** Timer ID that regularly checks if we are dirty, and if so, performs a save */
  private asyncSaverTimer: number;
  /**
   * Change counter, incremented on each meaningful change (change that requires
   * a save).  This is how we can detect if we are dirty and need to save
   */
  _changeCounter = 0;
  /** This is the _changeCounter that was successfully saved. */
  _savedChangeCounter = 0;
  /** Changes to be saved. */
  private _changeRecords: RecordedChanges[] = [];
  /** The iids in the last successfully saved revision */
  private _savedIids = new Set<string>();
  /** Indicates whether the next save must be a full save */
  private needsFullSave = false;
  /** Count the number of times saves have failed since last successful save */
  _saveFailedCounter = 0;
  /** Set to false if we're viewing old versions */
  _editMode = observable.box<boolean>(true, { deep: false });
  /** Waiting for a save (which may already be in flight). */
  needsSaving() {
    return this.hasUnsavedChanges() && this.canSave();
  }
  /**
   * This is a project that can be edited by current user and is in a valid
   * state to be saved
   */
  canSave() {
    return this.isAtTip && this.canEditProject() && this.canEditBranch();
  }

  /** Whether the project is dirty and should be saved */
  hasUnsavedChanges() {
    return this._changeCounter > this._savedChangeCounter;
  }

  get editMode() {
    return this._editMode.get();
  }
  set editMode(editMode: boolean) {
    this._editMode.set(editMode);
  }

  canEditProject() {
    return (
      this.editMode && canUserEditProject(this.appCtx.selfInfo, this.siteInfo)
    );
  }

  canEditBranch() {
    return !!(
      this.dbCtx().branchInfo?.id || !this.siteInfo.isMainBranchProtected
    );
  }

  /**
   * Undefined if there are no unacknowledged saves, or the revision number of
   * the most recent unacknowledged save.
   *
   * An "acknowledgement" is a socket.io update notification.  We expect
   * our saves to be eventually echoed back.
   *
   * Note there may be multiple unacknowledged saves at a time.
   */
  private pendingSavedRevisionNum?: number;
  /**
   * Whether we are viewing the latest revision and thus able to save.
   */
  isAtTip = true;

  /**
   * Indicates whether we already have seen an error and the app is in an "error
   * state." This is useful so we don't keep spamming error messages at the user
   * every time we retry saving. We can recover from this state once saves
   * succeed again.
   */
  private saveErrorState: "normal" | "error" = "normal";

  blockChanges = false;

  async save() {
    return this.asyncSaver();
  }

  private async trySave(preferIncremental = true): Promise<SaveResult> {
    const branchId = this.dbCtx().branchInfo?.id;
    if (!branchId && this.siteInfo.isMainBranchProtected) {
      return SaveResult.TriedEditProtectedMain;
    }

    if (!this.hasUnsavedChanges() && !this.needsFullSave) {
      return SaveResult.SkipUpToDate;
    }

    const incremental = preferIncremental && !this.needsFullSave;

    // Disable saves if we are in read-only mode
    if (!this.editMode) {
      return SaveResult.StopSaving;
    }

    if (!this.isAtTip) {
      if (
        this.alertBannerState.get() !== AlertSpec.SaveFailed &&
        this.alertBannerState.get() !== AlertSpec.Watch
      ) {
        this.alertBannerState.set(AlertSpec.ConcurrentEdit);
      }
      return SaveResult.StopSaving;
    }

    // Seen unknown errors for MAX_SAVE_RETRIES times
    // Stop trying to save and prompt user to reload.
    if (this._saveFailedCounter >= MAX_SAVE_RETRIES) {
      showReloadError();
      return SaveResult.StopSaving;
    }

    try {
      const changeCounterBeingSaved = this._changeCounter;

      const changes: RecordedChanges = mergeRecordedChanges(
        ...this._changeRecords,
        this._queuedUnloggedChanges
      );
      assert(
        this._changeRecords.length ===
          changeCounterBeingSaved - this._savedChangeCounter,
        "changeRecords should have exactly the amount os changes since it was saved last"
      );
      const { changesBundle, toDeleteIids, allIids, modifiedComponentIids } =
        this.bundleChanges(changes.changes, incremental);

      if (!DEVFLAGS.skipInvariants) {
        try {
          this.checkSiteInvariants({
            incremental,
            changesBundle,
            changes,
          });
        } catch (err) {
          reportError(err);
          this.alertBannerState.set(AlertSpec.InvariantError);
          this.blockChanges = true;
          this.isAtTip = false;
          return SaveResult.StopSaving;
        }
      }

      this.pendingSavedRevisionNum = 1 + this.dbCtx().revisionNum;

      try {
        await withTimeout(
          this.appCtx.api.saveProjectRevChanges(this.siteInfo.id, {
            revisionNum: this.dbCtx().revisionNum + 1,
            data: JSON.stringify(changesBundle),
            modelVersion: this.dbCtx().modelVersion,
            hostlessDataVersion: this.dbCtx().hostlessDataVersion,
            incremental: incremental,
            toDeleteIids,
            branchId: this.dbCtx().branchInfo?.id,
            modifiedComponentIids,
          }),
          "Saving project revision timed out",
          // Two-minute timeout
          120 * 1000
        );
        this.dbCtx().revisionNum++;
        // We can clear the change records as they have already been saved
        this._changeRecords.splice(
          0,
          changeCounterBeingSaved - this._savedChangeCounter
        );
        this._savedIids.clear();
        allIids.forEach((iid) => this._savedIids.add(iid));
        this.needsFullSave = false;
        this._savedChangeCounter = changeCounterBeingSaved;
        if (this.saveErrorState === "error") {
          showSaveErrorRecoveredNotice();
          if (this.alertBannerState.get() === AlertSpec.SaveFailed) {
            this.alertBannerState.set(null);
          }
        }
        this.saveErrorState = "normal";
        this._saveFailedCounter = 0;
        return SaveResult.Success;
      } catch (e) {
        if (e.name === "ProjectRevisionError") {
          return await withTimeout(
            this.fetchUpdates(),
            "Sync with latest updates timed out"
          ).then(() => this.trySave(preferIncremental));
        } else if (e.name === "ForbiddenError") {
          showForbiddenError();
          this.alertBannerState.set(AlertSpec.PermError);
          this.isAtTip = false;
          return SaveResult.StopSaving;
        } else if (e.name === "AuthError") {
          this.alertBannerState.set(AlertSpec.AuthError);
          this.isAtTip = false;
          return SaveResult.StopSaving;
        } else if (e.name === "SchemaMismatchError") {
          this.alertBannerState.set(AlertSpec.OutOfDate);
          this.isAtTip = false;
          return SaveResult.StopSaving;
        } else if (
          e.message.includes("Bad Gateway") ||
          e.message.includes("Gateway Timeout")
        ) {
          reportError(e, "Gateway save error");
          if (this.saveErrorState === "normal") {
            this.alertBannerState.set(AlertSpec.SaveFailed);
          }
          this.saveErrorState = "error";
          return SaveResult.GatewayError;
        } else if (incremental && e.name === "UnknownReferencesError") {
          reportError(e, "Unknown references found in project bundle");

          // Try to save again with incremental save disabled
          return await this.trySave(false);
        } else if (e.name === "PromiseTimeoutError") {
          reportError(e, "PromiseTimeoutError");
          // We don't know at this point whether the save succeeded or not.
          // If it did succeed, we cannot re-apply the local changes as it
          // might result in a broken state - e.g., if it was a `array-splice`
          // adding a `TplNode`, re-applying this change after it's been saved
          // and synced from the server would result in a duplicated element.
          //
          // Even if no save has been committed yet, the request could be
          // fulfilled afterwards, so we will just discard the local changes.
          const notificationKey = mkShortId();
          notification.warn({
            message: "Failed to sync project",
            description: `Loading latest changes...`,
            duration: 0,
            key: notificationKey,
            closeIcon: null,
          });
          await this.loadVersion(undefined, true).finally(() =>
            notification.close(notificationKey)
          );
          return SaveResult.TimedOut;
        } else {
          reportError(e, "Unknown save error");
          if (this.saveErrorState === "normal") {
            this.alertBannerState.set(AlertSpec.SaveFailed);
            showError(e, {
              title: "Unexpected error when saving",
              description:
                "You are now in read-only mode.  We will keep trying to save.",
              type: "warning",
            });
          }
          this.saveErrorState = "error";
          this._saveFailedCounter += 1;
          return SaveResult.UnknownError;
        }
      }
    } catch (e) {
      reportError(e, "Unexpected error when saving");
      if (this.saveErrorState === "normal") {
        this.alertBannerState.set(AlertSpec.SaveFailed);
        showError(e, {
          title: "Unexpected error when saving",
          description:
            "You are now in read-only mode.  We will keep trying to save.",
          type: "warning",
        });
      }
      this.saveErrorState = "error";
      this._saveFailedCounter += 1;
      return SaveResult.UnknownError;
    }
  }

  private checkSiteInvariants(opts: {
    incremental: boolean;
    changesBundle: DeepReadonly<Bundle>;
    changes: RecordedChanges;
  }) {
    const { incremental, changesBundle, changes } = opts;
    if (incremental) {
      const cachedBundle = this.bundler().cachedBundle();
      if (!cachedBundle) {
        // Shouldn't happen
        console.warn("No cached bundle found");
      } else {
        try {
          checkBundleFields(cachedBundle, Object.keys(changesBundle.map));
          checkRefsInBundle(cachedBundle);
        } catch (e) {
          logChangedNodes(
            "Bundle type error! Changed nodes:\n",
            changes.changes
          );
          throw e;
        }
      }
    } else {
      console.log("Non-incremental save");
    }

    assertSiteInvariants(this.site);

    // We also assert that our site bundle doesn't contain any external
    // bundle reference that we don't expect. Currently we should only see
    // references any imported project's PkgVersion IDs.  If we see extraneous
    // ids, it's likely because of an unclean package upgrade.
    const expectedDepIds = [
      ...walkDependencyTree(this.site, "all").map((p) => (p as any).__bundleId),
    ];
    if (changesBundle.deps.some((depId) => !expectedDepIds.includes(depId))) {
      throw new InvariantError(`Unexpected Bundle dependencies`, {
        siteBundle: changesBundle,
        expectedDepIds,
      });
    }
  }

  private checkIfMatchesSlowBundle(
    bundle: DeepReadonly<Bundle>,
    changes: ModelChange[]
  ) {
    const reportFastBundleError = (e: Error) => {
      logChangedNodes("Fast Bundle Error! Changed Nodes:\n", changes);
      reportError(e);
    };

    const slowBundle = this.bundler().bundle(
      this.site,
      this.siteInfo.id,
      this.appCtx.lastBundleVersion
    );
    try {
      const printVal = (val: any) => JSON.stringify(val, undefined, 2);
      const missingIids = [...Object.keys(slowBundle.map)].filter(
        (iid) => !(iid in bundle.map)
      );
      if (missingIids.length > 0) {
        console.log(
          missingIids
            .map(
              (iid) =>
                `Missing IID ${iid}, value: ${printVal(slowBundle.map[iid])}`
            )
            .join("\n")
        );
      }
      assert(missingIids.length === 0, `Fast Bundle is missing instances`);
      const mismatchingIids = Object.keys(bundle.map).filter(
        (iid) => !isEqual(bundle.map[iid], slowBundle.map[iid])
      );
      if (mismatchingIids.length > 0) {
        console.log(
          mismatchingIids
            .map(
              (iid) =>
                `Mismatching IID ${iid}. Received: ${printVal(
                  bundle.map[iid]
                )}\nExpected: ${printVal(slowBundle.map[iid])}`
            )
            .join("\n")
        );
      }
      assert(
        mismatchingIids.length === 0,
        `Fast Bundle has mismatching instances`
      );
      assert(
        arrayEqIgnoreOrder(bundle.deps, slowBundle.deps),
        `Different deps array. Received: ${printVal(
          bundle.deps
        )}\nExpected: ${printVal(slowBundle.deps)}`
      );
      assert(
        bundle.root === slowBundle.root,
        `Different root! Received: ${bundle.root},` +
          ` Expected: ${slowBundle.root}`
      );
    } catch (e) {
      reportFastBundleError(
        new Error("FastBundle error - didn't match slow bundle!\n" + e.message)
      );
    }
  }

  bundleSite() {
    return {
      site: this.bundler().bundle(
        this.site,
        this.siteInfo.id,
        this.appCtx.lastBundleVersion
      ),
    };
  }

  /**
   * Filters only the relevant parts of the project bundle based on the
   * unsaved changes.
   **/
  bundleChanges(
    allChanges: ModelChange[],
    incremental?: boolean
  ): {
    changesBundle: DeepReadonly<Bundle>;
    toDeleteIids: string[];
    allIids: string[];
    modifiedComponentIids: string[];
  } {
    const persistentChanges = filterPersistentChanges(allChanges);

    const bundle = (() => {
      if (!incremental) {
        return this.bundler().bundle(
          this.site,
          this.siteInfo.id,
          this.appCtx.lastBundleVersion
        );
      }

      const _bundle: DeepReadonly<Bundle> = this.bundler().fastBundle(
        this.site,
        this.siteInfo.id,
        persistentChanges.map((change) => change.changeNode)
      );

      if (!DEVFLAGS.skipInvariants && Math.random() < 0.1) {
        // Random check to silently see if results match
        this.checkIfMatchesSlowBundle(_bundle, persistentChanges);
      }

      return _bundle;
    })();

    const allIids = [...Object.keys(bundle.map)];

    if (!incremental) {
      return {
        changesBundle: bundle,
        toDeleteIids: [],
        allIids,
        modifiedComponentIids: [],
      };
    }

    const map: { [id: number]: BundledInst } = {};

    // Inserted Iids
    allIids.forEach((iid) => {
      if (!this._savedIids.has(iid)) {
        map[iid] = bundle.map[iid];
      }
    });

    const modifiedComponentIids = new Set<string>();
    // Updated Iids and modified components
    persistentChanges.forEach((change) => {
      const { inst, field } = change.changeNode;
      const addr = this.bundler().addrOf(inst);
      if (addr) {
        assert(
          addr.uuid === this.siteInfo.id,
          "addr uuid should be the same as site info id"
        );
        if (bundle.map[addr.iid]) {
          if (!map[addr.iid]) {
            map[addr.iid] = { __type: bundle.map[addr.iid].__type };
          }
          map[addr.iid][field] = bundle.map[addr.iid][field];
        }
      }
      if (this.appCtx.appConfig.incrementalObservables) {
        change.path?.forEach((path) => {
          if (classes.isKnownComponent(path.inst) && path.field === "tplTree") {
            const compAddr = this.bundler().addrOf(path.inst);
            if (compAddr) {
              modifiedComponentIids.add(compAddr.iid);
            }
          }
        });
      }
    });

    // Deleted Iids
    const toDeleteIids = [...this._savedIids.keys()].filter(
      (iid) => !(iid in bundle.map)
    );

    return {
      changesBundle: { ...bundle, map },
      toDeleteIids,
      allIids,
      modifiedComponentIids: Array.from(modifiedComponentIids),
    };
  }

  branchInfo() {
    return this._dbCtx.branchInfo;
  }

  /** Stores any persistent error message to show user, like being in read-only mode */
  alertBannerState = observable.box<null | AlertData>(null, { deep: false });

  //
  // Manage project dependencies and past revisions
  //
  projectDependencyManager: ProjectDependencyManager;
  releases = observable.array<PkgVersionInfoMeta>([], { deep: false });

  /** Reverts the current branch to the given version and switches to the latest version. */
  async revertToVersion(pkgVersion: PkgVersionInfoMeta) {
    this.setWatchPlayerId(null);

    assert(
      (pkgVersion.branchId ?? null) === (this.branchInfo()?.id ?? null),
      () => `Can only revert to a version of the same branch`
    );
    await this.appCtx.api.revertToVersion(this.siteInfo.id, {
      branchId: this.branchInfo()?.id,
      pkgId: pkgVersion.pkgId,
      version: pkgVersion.version,
    });

    const prevArenaName = this.currentArena
      ? getArenaName(this.currentArena)
      : undefined;
    const version = this.dbCtx().pkgVersionInfoMeta?.version ?? latestTag;
    if (version === latestTag) {
      // Already viewing latest version of branch. Reload and switch arena.
      await this.loadVersion(undefined, true, this.branchInfo());
      const prevArena = prevArenaName
        ? getArenaByNameOrUuidOrPath(this.site, prevArenaName, undefined)
        : undefined;
      await this.change(
        ({ success }) => {
          this.switchToArena(prevArena);
          return success();
        },
        {
          noUndoRecord: true,
        }
      );
    } else {
      // Switch to latest version of branch.
      this.switchToBranchVersion(undefined);
    }
  }

  /**
   * Download, unbundle, and load the Site into the Studio
   *
   * Note just calling this function will not cause the arena to be loaded in the canvas.
   * The arena's view state must be set to `isAlive` via `switchToArena`/`changeArena`.
   *
   * @param pkgVersion - if unspecified, get latest revision
   * @param editMode - if falsey, stops saves and shows AlertBanner. If truthy,
   *   will autosave as normal
   * @param branch - branch to load
   **/
  private async loadVersion(
    pkgVersion?: PkgVersionInfoMeta,
    editMode?: boolean,
    branch?: ApiBranch
  ) {
    const hideLoadingMsg = message.loading("Loading...", 0);
    const branchChanged = branch?.id !== this.branchInfo()?.id;

    try {
      this._isRestoring = true;
      runInAction(() => {
        // Disable saves while we load
        this.editMode = false;
        this.alertBannerState.set(editMode ? null : AlertSpec.ViewOld);
        this.setHighLevelFocusOnly(undefined, undefined); // Hide the focused box
      });
      const { bundle, depPkgs, revisionNum } = await (async () => {
        if (pkgVersion) {
          const { pkg, depPkgs: _depPkgs } =
            await this.appCtx.api.getPkgVersion(
              pkgVersion.pkgId,
              pkgVersion.version,
              branch?.id
            );
          return {
            bundle: pkg.model,
            depPkgs: _depPkgs,
            revisionNum: undefined,
          };
        } else {
          const { rev, depPkgs: _depPkgs } = await this.appCtx.api.getSiteInfo(
            this.siteInfo.id,
            {
              branchId: branch?.id,
            }
          );
          return {
            bundle: getBundle(rev, this.appCtx.lastBundleVersion),
            depPkgs: _depPkgs,
            revisionNum: rev.revision,
          };
        }
      })();
      runInAction(() => {
        const newBundler = new FastBundler();
        const { site, depPkgs: depPkgVersions } = unbundleSite(
          newBundler,
          this.siteInfo.id,
          bundle,
          depPkgs
        );
        this.appCtx.bundler = newBundler;
        this.dbCtx().setSite(site, branch, pkgVersion);
        spawn(
          checkDepPkgHosts(
            this.appCtx,
            this.siteInfo,
            depPkgVersions.filter((dep): dep is ProjectDependency =>
              isKnownProjectDependency(dep)
            )
          )
        );
        this.projectDependencyManager.syncDirectDeps();
        this.pruneInvalidViewCtxs();
        this.pruneDetachedTpls();
        this.styleMgr.resetStyles({ resetDeps: true });
        this.recorder.prune();
        for (const vc of this.viewCtxs) {
          vc.scheduleSync({ eval: true, styles: true });
        }

        // Clear undo log
        this.clearUndoLog();

        // Only re-enable saves after we're done loading
        if (editMode) {
          this.editMode = true;

          if (pkgVersion) {
            // Mark for saving
            this._changeCounter += 1;
            this._changeRecords.push(emptyRecordedChanges());

            // We might have loaded a completely different bundle, so we should
            // save all bundle instances as instances with the same iid might have
            // different types
            this.needsFullSave = true;
          }

          this._savedIids.clear();
          newBundler
            .allIidsByUuid(this.siteInfo.id)
            .forEach((iid) => this._savedIids.add(iid));

          if (revisionNum) {
            this.dbCtx().revisionNum = revisionNum;
          }
        }
      });
      if (branchChanged) {
        this.releases.replace([...(await this.getProjectReleases())]);
      }
    } finally {
      this._isRestoring = false;
      hideLoadingMsg();
    }

    if (editMode) {
      // No matter which revision we loaded, either via switching
      // branch or reverting to a previous published version,
      // we need to sync with the currently-registered code components
      // We need to do this in a spawn() instead of await because
      // syncCodeComponentsAndHandleErrors calls into
      // StudioCtx.change(), and if we are coming from, say,
      // fetchUpdatesInternal, which is processed in the same
      // this.modelChangesQueue, we will be deadlocked.
      if (!this.appCtx.appConfig.ccStubs && !isHostLessPackage(this.site)) {
        spawn(syncCodeComponentsAndHandleErrors(this));
      }
    }
  }

  private _forceOpenProp = observable.box<
    readonly [classes.Component, string] | null
  >(null);
  get forceOpenProp() {
    return this._forceOpenProp.get();
  }

  set forceOpenProp(p: readonly [classes.Component, string] | null) {
    this._forceOpenProp.set(p);
  }

  private _forceOpenSplit = observable.box<classes.Split | null>(null);
  get forceOpenSpit() {
    return this._forceOpenSplit.get();
  }

  set forceOpenSplit(p: classes.Split | null) {
    this._forceOpenSplit.set(p);
  }

  private _serverUpdatesSummary: DeletedAssetsSummary;

  private clearUndoLog() {
    console.log("UNDO: Clear");
    this._savedChangeCounter = this._changeCounter;
    this._changeRecords = [];
    this._serverUpdatesSummary = getEmptyDeletedAssetsSummary();
    this.undoLog = new UndoLog(
      this.site,
      this.recorder,
      this._serverUpdatesSummary
    );
    // handleRouteChange will create the first undo record
  }

  /**
   * For this projectId, fetch all available releases from the server,
   * sorted by [latest => oldest]
   *
   * @param opts - if mainBranchOnly is true, only return releases from the main branch
   **/
  async getProjectReleases(
    opts = { mainBranchOnly: false }
  ): Promise<PkgVersionInfoMeta[]> {
    const projectId = this.siteInfo.id;
    const appCtx = this.appCtx;
    const branchId = opts.mainBranchOnly ? undefined : this.branchInfo()?.id;
    return await getProjectReleases(appCtx, projectId, branchId);
  }

  async hasChangesSinceLastPublish() {
    if (this.releases.length <= 0) {
      return true;
    }

    const latestRelease = ensure(
      asOne(this.releases),
      "should have at least one release"
    );
    const { rev: latestPublishedRev } =
      await this.appCtx.api.getProjectRevWithoutData(
        this.siteInfo.id,
        ensure(
          latestRelease.revisionId,
          "latest release should have revisionId"
        ),
        latestRelease.branch?.id
      );

    return latestPublishedRev.revision !== this.dbCtx().revisionNum;
  }

  async getLatestVersion(
    latestPublishedRevId: string | undefined,
    branchId: string | undefined
  ) {
    return latestPublishedRevId
      ? await this.appCtx.api.getProjectRevWithoutData(
          this.siteInfo.id,
          ensure(latestPublishedRevId, "latestPublishedRevId must exist"),
          branchId
        )
      : { rev: null };
  }
  /**
   * Given the current revision number, calculate the correct next
   * version number based by comparing this.site with the latest release
   **/
  async calculateNextPublishVersion() {
    const releases = await this.getProjectReleases();

    // Defaulting to 0.0.1 as the initial version
    if (releases.length <= 0) {
      return {
        version: INITIAL_VERSION_NUMBER,
        changeLog: extractSplitStatusDiff(this.site, () => SplitStatus.New),
        releaseType: undefined,
      };
    }

    // Get the latest release
    const latestRelease = ensure(asOne(releases), "latestRelease should exist");
    const { rev: latestPublishedRev } =
      await this.appCtx.api.getProjectRevWithoutData(
        this.siteInfo.id,
        ensure(
          latestRelease.revisionId,
          "latestRelease should have revision id"
        ),
        latestRelease.branchId ?? undefined
      );
    if (latestPublishedRev.revision === this.dbCtx().revisionNum) {
      return undefined;
    }

    if (
      this.appCtx.appConfig.serverPublishProjectIds.includes(this.siteInfo.id)
    ) {
      return this.appCtx.api.computeNextProjectVersion(this.siteInfo.id, {
        revisionNum: this.dbCtx().revisionNum,
        branchId: this.dbCtx().branchInfo?.id,
      });
    }

    const latestPublishedPkg = await this.appCtx.api.getPkgVersion(
      latestRelease.pkgId,
      undefined,
      latestRelease.branchId ?? undefined
    );

    const bundler = new FastBundler();
    const prevSite = unbundleProjectDependency(
      bundler,
      latestPublishedPkg.pkg,
      latestPublishedPkg.depPkgs
    ).projectDependency.site;

    // Compare the 2 sites to calculate a new semantic version
    const changeLog = compareSites(prevSite, this.site);
    const releaseType = calculateSemVer(changeLog);
    const version = semver.inc(latestRelease.version, releaseType);
    if (!version) {
      throw new Error("Invalid version number found: " + latestRelease.version);
    }
    return { version, changeLog, releaseType };
  }

  async branchHasUnpublishedChanges({
    branchId,
  }: {
    branchId: BranchId | null;
  }) {
    const branchReleases = await (async () => {
      const { pkg } = await this.appCtx.api.getPkgByProjectId(this.siteInfo.id);
      if (pkg) {
        const pkgVersionResp = await this.appCtx.api.listPkgVersionsWithoutData(
          pkg.id,
          {
            branchId,
          }
        );
        return [...pkgVersionResp.pkgVersions];
      } else {
        return [];
      }
    })();
    const { rev } = await this.appCtx.api.getProjectRevWithoutData(
      this.siteInfo.id,
      // undefined to get the latest revision
      undefined,
      branchId ?? undefined
    );
    const latestPublishedVersion = head(branchReleases);
    const { rev: latestPublishedRev } = await this.getLatestVersion(
      latestPublishedVersion?.revisionId,
      latestPublishedVersion?.branchId ?? undefined
    );
    if (
      rev.revision > 1 &&
      (latestPublishedRev?.revision ?? 1) < rev.revision
    ) {
      return true;
    }
    return false;
  }

  /**
   * Entry point for publishing a new version of the project
   **/
  async publish(
    maybeTags?: string[],
    maybeDescription?: string,
    branchId?: BranchId,
    opts?: { hostLessPackage?: boolean }
  ): Promise<PublishResult> {
    // Use empty list as default tags
    const tags = maybeTags || [];
    // Use date as default description
    const description = maybeDescription || new Date().toUTCString();
    // Try to save if we have unsaved changes
    if (this.needsSaving()) {
      const saveResult = await this.asyncSaver();
      if (
        saveResult !== SaveResult.Success &&
        (saveResult !== SaveResult.SkipUpToDate || this.needsSaving())
      ) {
        const e = new Error("Cannot publishing due to a failed save");
        console.error("Error ", e);
        showError(e, {
          title: "Unexpected error when publishing",
          description: "Reload to try again.",
        });
        return PublishResult.SaveFailed;
      }
    }

    // Check if we're out of date
    if (!this.isAtTip) {
      if (this.alertBannerState.get() !== AlertSpec.Watch) {
        this.alertBannerState.set(AlertSpec.ConcurrentEdit);
      }
      return PublishResult.OutOfDate;
    }

    try {
      const projectId = this.siteInfo.id;
      const next = await this.calculateNextPublishVersion();
      if (!next) {
        console.log("Skipping publish, no new changes since last published");
        return PublishResult.SkipAlreadyPublished;
      }
      const resp = await maybeShowPaywall(
        this.appCtx,
        async () =>
          await this.appCtx.api.publishProject(
            projectId,
            this.dbCtx().revisionNum,
            next.version,
            tags,
            description,
            opts?.hostLessPackage,
            branchId
          ),
        {
          title: "Publishing is disabled",
          description:
            "This project belongs to a team that does not have enough seats. Increase the number of seats to perform this action.",
        },
        true
      );
      await mutate(calculateNextVersionKey(this));
      const newPkg = ensure(resp.pkg, "newPkg should exist");
      this.releases.unshift(newPkg);
      return PublishResult.PreFilling;
    } catch (e) {
      // TODO
      if (e instanceof PaywallError) {
        if (e.type === "requireTeam") {
          notification.error({
            message: personalProjectPaywallMessage,
            duration: 0,
          });
        }
        return PublishResult.PaywallError;
      }
      console.error("Error publishing: ", e);
      showError(e, {
        title: "Unexpected error when publishing",
        description: "Reload to try again.",
      });
      return PublishResult.UnknownError;
    }
  }

  async updatePkgVersion(
    pkgId: string,
    version: string,
    branchId: BranchId | null,
    toMerge: Partial<PkgVersionInfo>
  ) {
    const { pkg: updatedPkgVersion } = await this.appCtx.api.updatePkgVersion(
      pkgId,
      version,
      branchId,
      toMerge
    );
    const newReleases = this.releases.slice().map((r) => {
      if (r.pkgId === pkgId && r.version === version) {
        return assign(r, updatedPkgVersion);
      } else {
        return r;
      }
    });
    this.releases.replace(newReleases);
  }

  //
  // Make sure view state is valid after model changes
  //
  ensureComponentStackFramesHasOnlyValidVariants(component: Component) {
    const allVariants = allComponentVariants(component);
    for (const vc of this.viewCtxs) {
      for (const frame of vc.componentStackFrames()) {
        if (frame.tplComponent.component === component) {
          frame.keepOnlyVariants(allVariants);
        }
      }
    }
  }

  ensureGlobalStackFramesHasOnlyValidVariants() {
    const allVariants = allGlobalVariants(this.site, { includeDeps: "direct" });
    for (const vc of this.viewCtxs) {
      vc.globalFrame.keepOnlyVariants(allVariants);
    }
  }

  ensureAllComponentStackFramesHasOnlyValidVariants() {
    this.ensureGlobalStackFramesHasOnlyValidVariants();
    for (const component of this.site.components) {
      this.ensureComponentStackFramesHasOnlyValidVariants(component);
    }
  }

  private notificationKeyForGlobalContextNotificationStarters =
    "global-context-notification-starters";

  closeGlobalContextNotificationForStarters() {
    notification.close(
      this.notificationKeyForGlobalContextNotificationStarters
    );
  }

  async maybeShowGlobalContextNotificationForStarters() {
    const starterProject = this.appCtx.appConfig.starterSections
      .flatMap((starterSection) => starterSection.projects)
      .find(
        (starter) => starter.baseProjectId === this.siteInfo.clonedFromProjectId
      );
    if (
      starterProject?.globalContextConfigs?.every((starterGlobalContext) => {
        const tpl = this.site.globalContexts.find(
          (globalContext) =>
            globalContext.component.name === starterGlobalContext.name
        );
        if (!tpl) {
          return false;
        }
        const params = getRealParams(tpl.component);
        return [...(starterGlobalContext.props ?? [])].every((prop) => {
          const maybeArg = tpl.vsettings[0].args.find(
            (arg) => arg.param.variable.name === prop.name
          );
          const maybeParam = params.find(
            (param) => param.variable.name === prop.name
          );
          let value: JsonValue | undefined = undefined;
          if (maybeArg) {
            value = tryExtractJson(maybeArg.expr);
          } else if (maybeParam?.defaultExpr) {
            value = tryExtractJson(maybeParam.defaultExpr);
          }
          return value === (prop.value ?? undefined);
        });
      })
    ) {
      const goToSettings = async () => {
        await this.change(({ success }) => {
          this.hideOmnibar();
          this.switchLeftTab("settings", { highlight: true });
          return success();
        });
      };

      notification.warn({
        message: "Configure this project's dynamic data source",
        duration: null,
        description: (
          <>
            <p>
              This cloned project includes dynamic data from an example data
              source! But you will probably want to use your own data source
              instead.
            </p>
            <p>
              <a onClick={goToSettings}>Go to settings</a> to change the source
              to your own choice, or explore other data sources (click the big
              blue plus button and select "component packages").
            </p>
          </>
        ),
        key: this.notificationKeyForGlobalContextNotificationStarters,
      });
    }
  }

  async enterWatchMode() {
    await this.loadVersion();
    this.alertBannerState.set(AlertSpec.Watch);
    clearDarkMask();
  }

  handleBranchProtectionAlert() {
    if (!this.canEditBranch()) {
      this.alertBannerState.set(AlertSpec.ProtectedMainBranch);
    } else if (this.alertBannerState.get() === AlertSpec.ProtectedMainBranch) {
      this.alertBannerState.set(null);
    }
  }

  async handleBranchMerged() {
    // Ensure that we're up to date with the latest changes in the branch
    await this.fetchUpdates();
  }

  private async fetchUpdatesWatch() {
    const partial = await this.appCtx.api.getModelUpdates(
      this.siteInfo.id,
      this.dbCtx().revisionNum,
      this.bundler().allUuids(),
      this.branchInfo()?.id
    );
    if (partial.needsReload) {
      await this.loadVersion();
      return;
    }
    this.blockChanges = false;
    if (partial.data) {
      this.dbCtx().revisionNum = partial.revision;
      const { data, depPkgs } = partial;
      await this.changeUnsafe(() => {
        depPkgs.forEach((dep) =>
          taggedUnbundle(this.bundler(), dep.model, dep.id)
        );
        this.bundler().unbundle(JSON.parse(data), this.siteInfo.id, true);
        this.site.components.forEach((c) => {
          trackComponentRoot(c);
          trackComponentSite(c, this.site);
        });
      });
    }
    this.blockChanges = true;
  }

  private async fetchUpdates() {
    assert(
      !this._isChanging && !this._isUndoing,
      "should not be changing nor undoing"
    );
    await this.modelChangeQueue.push({ type: "fetchModelUpdates" });
    (this.modelChangeQueue as any).process();
    return drainQueue(this.modelChangeQueue).then(() =>
      this.framesChanged.dispatch()
    );
  }

  /**
   * Never call this.change() inside this method without wrapping it
   * in a spawn() to avoid deadlocks and/or breaking this.modelChangeQueue.
   */
  private async fetchUpdatesInternal() {
    assert(
      !this._isChanging && !this._isUndoing,
      "should not be changing nor undoing"
    );
    const projectId = this.siteInfo.id;
    const updatedModel = await this.appCtx.api.getModelUpdates(
      projectId,
      this.dbCtx().revisionNum,
      this.bundler().allUuids(),
      this.branchInfo()?.id
    );
    if (updatedModel.needsReload) {
      await this.loadVersion(undefined, true, this.branchInfo());
      // This just swapped in a different Site, with different instances of
      // everything. We should ideally go through model instance that StudioCtx
      // has and replace them with the new instance, but at the very least,
      // we make sure this.currentArena is valid, so we will trigger a re-render
      // of the current view
      if (this.currentArena) {
        const newCurrentArena = getArenaByNameOrUuidOrPath(
          this.site,
          getArenaName(this.currentArena),
          getArenaType(this.currentArena)
        );
        if (newCurrentArena) {
          spawn(
            this.change(
              ({ success }) => {
                this.switchToArena(newCurrentArena);
                return success();
              },
              {
                noUndoRecord: true,
              }
            )
          );
        }
      }
      return;
    }
    const hasUnsavedChanges = this.hasUnsavedChanges();
    if (updatedModel.data) {
      const { data, depPkgs, deletedIids, modifiedComponentIids } =
        updatedModel;
      try {
        this._isRefreshing = true;

        if (this.appCtx.appConfig.incrementalObservables) {
          this.dbCtx().maybeObserveComponents(
            withoutNils(
              modifiedComponentIids.map((c) => {
                const compInst = this.bundler().objByAddr({
                  uuid: projectId,
                  iid: c,
                });
                return classes.isKnownComponent(compInst)
                  ? compInst
                  : undefined;
              })
            )
          );
        }

        const undoAndRecord = (changes: RecordedChanges) =>
          this.recorder.withRecording(() => undoChanges(changes.changes));

        const { summary, styleChanges, allChanges } = runInAction(() => {
          // First, revert all changes to recover the old server version
          const revertedQueuedUnloggedChanges = undoAndRecord(
            this._queuedUnloggedChanges
          );
          const revertedChanges = arrayReversed(this._changeRecords).map(
            undoAndRecord
          );
          const previousProjectDeps = this.site.projectDependencies;

          updateSummaryFromDeletedInstances(
            this._serverUpdatesSummary,
            withoutNils(
              deletedIids.map((iid) =>
                this.bundler().objByAddr({ uuid: projectId, iid })
              )
            )
          );

          // Then, apply new changes from the server
          const serverChanges = this.recorder.withRecording(() => {
            depPkgs.forEach((dep) =>
              taggedUnbundle(this.bundler(), dep.model, dep.id)
            );
            const partialBundle: UnsafeBundle = JSON.parse(data);
            this.bundler().unbundle(partialBundle, projectId, true);

            if (
              xDifference(previousProjectDeps, this.site.projectDependencies)
                .size > 0
            ) {
              // TODO: ProjectDependency deletion can be tricky since it might,
              // for example, replace component instances by local copies of the
              // components (created when the imported project has been deleted),
              // so adjustments in the undo log and to the unsaved changes would
              // require special handling to also use the local copies.

              // For now, we just refresh the project whenever an imported project
              // is deleted.
              throw new UnsupportedServerUpdate(
                "Don't support ProjectDependency deletion"
              );
            }

            this.site.components.forEach((c) => {
              trackComponentRoot(c);
              trackComponentSite(c, this.site);
            });

            Object.keys(partialBundle.map).forEach((iid) =>
              this._savedIids.add(iid)
            );
            deletedIids.forEach((iid) => this._savedIids.delete(iid));
          });

          // Re-apply the local changes on top of the server changes
          this._changeRecords = arrayReversed(revertedChanges).map((changes) =>
            undoChangesAndResolveConflicts(
              this.site,
              this.recorder,
              this._serverUpdatesSummary,
              changes.changes
            )
          );
          this._queuedUnloggedChanges = undoChangesAndResolveConflicts(
            this.site,
            this.recorder,
            this._serverUpdatesSummary,
            revertedQueuedUnloggedChanges.changes
          );

          // Maybe clear focus if the focused element no longer exists
          const vc = this.focusedViewCtx();
          if (vc) {
            let clearFocus = false;
            if (
              getSiteArenas(this.site)
                .flatMap((arena) => getArenaFrames(arena))
                .find((frame) => frame === vc.arenaFrame())
            ) {
              const focusedTpl = vc.focusedTpl();
              if (focusedTpl) {
                if (!isTplAttachedToSite(this.site, focusedTpl)) {
                  clearFocus = true;
                } else {
                  const parents = ancestorsUp(focusedTpl);
                  parents.slice(0, parents.length - 1).forEach((child, i) => {
                    const parent = parents[i + 1];
                    if (!tplChildren(parent).includes(child)) {
                      child.parent = null;
                      clearFocus = true;
                    }
                  });
                }
              }
            } else {
              clearFocus = true;
            }
            if (clearFocus) {
              this.setStudioFocusOnFrameContents(undefined);
              this.focusReset.dispatch();
            }
          }
          const _allChanges = mergeRecordedChanges(
            serverChanges,
            ...this._changeRecords,
            this._queuedUnloggedChanges
          );

          // Pruning
          this.pruneInvalidViewCtxs();
          this.pruneDetachedTpls();

          const _summary = summarizeChanges(this, _allChanges);
          const _styleChanges = this.syncAfterChanges(_summary);

          return {
            summary: _summary,
            styleChanges: _styleChanges,
            allChanges: _allChanges,
          };
        });

        // Re-eval all frames that might have been affected
        const focusedVC = this.focusedViewCtx();

        const shouldEvaluate = (vc: ViewCtx) => {
          return this.shouldEvaluateViewCtx(vc, {
            summary,
            previousComponentCtx: vc.currentComponentCtx(),
            previousVcInfo: vc.getSpotlightAndVariantsInfo(),
          });
        };

        const shouldRestyle = (vc: ViewCtx) => {
          // Should update vc style if it's never had styles before,
          // or if there has been style changes
          return !vc.valState().maybeValSysRoot() || !!styleChanges;
        };

        // give precedence to the focused viewCtx so that the postEvalTasks added
        // to the current viewCtx is not cleared when current viewCtx is being
        // evaluated
        this.viewCtxs.forEach((vc) => {
          vc.scheduleSync({
            eval: shouldEvaluate(vc),
            styles: shouldRestyle(vc),
            asap: vc === focusedVC,
          });
        });

        // Check site invariants
        assertSiteInvariants(this.site);

        const persistentChanges = filterPersistentChanges(allChanges.changes);

        // fastBundle to run bundle invariants as well (also to update the local
        // bundle copy)
        this.bundler().fastBundle(
          this.site,
          projectId,
          persistentChanges.map((change) => change.changeNode)
        );

        this.dbCtx().revisionNum = updatedModel.revision;
        this._isRefreshing = false;
      } catch (err) {
        this._isRefreshing = false;
        if (!(err instanceof UnsupportedServerUpdate)) {
          reportError(err, "Sync updates failed");
        }
        console.log("Failed to sync. Downloading entire bundle...");
        if (hasUnsavedChanges) {
          notification.warn({
            message: "Failed to sync project",
            description: `Someone else has edited the project and it wasn't possible to sync with your latest changes. Refreshing the project...`,
            duration: 5,
          });
        } else {
          notification.info({
            message: "Syncing latest changes...",
            duration: 5,
          });
        }
        return this.loadVersion(undefined, true);
      }
    }
  }

  // Fixes that are made after every `.change()`, `.undo()`, and `.refreshUpdates()`
  private syncAfterChanges(summary: ChangeSummary) {
    // Sync dependency manager
    this.projectDependencyManager.syncDirectDeps();

    // Upsert the style changes
    const _styleChanges = summaryToStyleChanges(summary);
    if (_styleChanges) {
      this.styleMgr.upsertStyles(_styleChanges);
      // themeSnapshotChanged = this.jsBundleMgr.updateAllThemeSnapshot();

      if (_styleChanges.updatedDeps) {
        for (const dep of _styleChanges.updatedDeps) {
          this.fontManager.installDepFonts(this, dep);
        }
      }
    }

    // Sync deleted objects (they might have been added again)
    Object.values(this._serverUpdatesSummary).forEach(
      (deletedInsts: ObjInst[]) => {
        // If there's a path from the root to the inst, it's no longer deleted
        removeWhere(
          deletedInsts,
          (inst) => !!this.recorder.getPathToChild(inst)?.length
        );
      }
    );

    return _styleChanges;
  }

  /**
   * Goes through all references to Tpls from StudioCtx and ViewCtx,
   * and remove those that are no longer attached to site.  This can happen
   * during restore undo/redo, when, say, an arg tpl to a TplComponent has been
   * replaced. The observe-model framework will restore all pointers except
   * for the parent pointer, which isn't tracked; we fix up the parent pointers
   * for the site tree, but can't fix up parent pointers of nodes that have been
   * detached but we still have referene to.  We do so here.
   */
  pruneDetachedTpls() {
    this.viewCtxs.forEach((vc) => vc.pruneDetachedTpls());
  }

  //
  // Managing renaming a TPL element (when user presses ctrl+R)
  //
  private _renamingFocused = observable.box(false);
  renamingFocused() {
    return this._renamingFocused.get();
  }
  tryStartRenamingFocused() {
    if (this.focusedFrame()) {
      this._renamingFocused.set(true);
    } else {
      const focusedTpl = this.focusedViewCtx()?.focusedTpl();
      if (focusedTpl && (isTplNamable(focusedTpl) || isTplSlot(focusedTpl))) {
        this._renamingFocused.set(true);
      }
    }
  }
  endRenamingFocused() {
    this._renamingFocused.set(false);
  }

  //
  // Managing renaming a TPL element (when users uses context menu on tpl-tree panel)
  //
  private _renamingOnPanel = observable.box(false);
  renamingOnPanel() {
    return this._renamingOnPanel.get();
  }
  startRenamingOnPanel() {
    this._renamingOnPanel.set(true);
  }
  endRenamingOnPanel() {
    this._renamingOnPanel.set(false);
  }

  //
  // Whether to show placeholder for slots
  //
  private _showSlotPlaceholder = observable.box(true);

  toggleShowSlotPlaceholder() {
    this._showSlotPlaceholder.set(!this._showSlotPlaceholder.get());
  }
  showSlotPlaceholder() {
    return this._showSlotPlaceholder.get();
  }

  //
  // Whether to show placeholder for containers
  //
  private _showContainerPlaceholder = observable.box(true);

  toggleShowContainerPlaceholder() {
    this._showContainerPlaceholder.set(!this._showContainerPlaceholder.get());
  }

  showContainerPlaceholder() {
    return this._showContainerPlaceholder.get();
  }

  //
  // Whether to show placeholder for selection boxes and cursors
  //
  private _showMultiplayerSelections = observable.box(true);

  toggleShowMultiplayerSelections() {
    this._showMultiplayerSelections.set(!this._showMultiplayerSelections.get());
  }

  showMultiplayerSelections() {
    return this._showMultiplayerSelections.get();
  }

  //
  // Whether to show hover boxes for ancestors of hovered target
  //
  private _showAncestorsHoverBoxes = observable.box(true);

  toggleShowAncestorsHoverBoxes() {
    this._showAncestorsHoverBoxes.set(!this._showAncestorsHoverBoxes.get());
  }

  showAncestorsHoverBoxes() {
    return this._showAncestorsHoverBoxes.get();
  }

  // Manage saving a Component preset; need this because taking screenshots
  // is an async process, so we need to stash the intermediate state
  // somewhere
  private _saveAsPresetState = observable.box<SaveTplAsPresetState | undefined>(
    undefined
  );
  get saveAsPresetState() {
    return this._saveAsPresetState.get();
  }
  set saveAsPresetState(v: SaveTplAsPresetState | undefined) {
    this._saveAsPresetState.set(v);
  }

  prepareSavingPresets = (targetIsVisible: boolean) => {
    if (plasmicExtensionAvailable()) {
      if (targetIsVisible && this.zoom !== 1) {
        notification.error({
          message:
            "Please set the zoom of the studio to 1, and make sure the element is in visible area of the canvas",
        });
        return false;
      }
    } else {
      notification.warn({
        message: "The screenshot of presets can be degraded. ",
        description:
          "For better screenshot quality, please install Plasmic screenshoter Chrome extension at https://chrome.google.com/webstore/detail/plasmic-screenshoter/ekdpninpaghonjjjikcmffpgbagdjjkh?hl=en&authuser=3",
      });
    }
    return true;
  };

  private _screenshotting = observable.box(false);
  get screenshotting() {
    return this._screenshotting.get();
  }
  set screenshotting(show: boolean) {
    this._screenshotting.set(show);
  }

  // Manage state of opening and closing the component preset drawer
  /*
  private _presetDrawerState = observable.box<PresetDrawerState | undefined>(
    undefined
  );

  get presetDrawerState() {
    return this._presetDrawerState.get();
  }
  set presetDrawerState(v: PresetDrawerState | undefined) {
    this._presetDrawerState.set(v);
  }
  */

  private _isResizingFocusedArenaFrame = observable.box(false);

  get isResizingFocusedArenaFrame() {
    return this._isResizingFocusedArenaFrame.get();
  }

  set isResizingFocusedArenaFrame(resizing: boolean) {
    this._isResizingFocusedArenaFrame.set(resizing);
  }

  private _findReferencesComponent = observable.box<Component | undefined>(
    undefined
  );
  get findReferencesComponent() {
    return this._findReferencesComponent.get();
  }
  set findReferencesComponent(c: Component | undefined) {
    this._findReferencesComponent.set(c);
    if (!this.leftTabKey) {
      this.leftTabKey = "components";
    }
  }
  private _findReferencesToken = observable.box<StyleToken | undefined>(
    undefined
  );
  get findReferencesToken() {
    return this._findReferencesToken.get();
  }
  set findReferencesToken(c: StyleToken | undefined) {
    this._findReferencesToken.set(c);
    if (!this.leftTabKey) {
      this.leftTabKey = "tokens";
    }
  }

  private _showPageSettings = observable.box<PageComponent | undefined>(
    undefined
  );
  get showPageSettings() {
    return this._showPageSettings.get();
  }
  set showPageSettings(c: PageComponent | undefined) {
    this._showPageSettings.set(c);
  }

  siteIsEmpty() {
    return siteIsEmpty(this.site);
  }

  getProjectData = computedFn(
    () => {
      const [pages, comps] = partition(
        this.site.components.filter((c) => !isBuiltinCodeComponent(c)),
        (c) => {
          return isNonNil(c.pageMeta);
        }
      );
      return {
        components: comps.map((c) => ({ name: c.name })),
        pages: pages.map((c) => ({
          name: c.name,
          pageMeta: { path: c.pageMeta!.path },
        })),
      };
    },
    { name: "getProjectData" }
  );

  private _copilotHistory = observable.map<string, CopilotInteraction[]>();

  addToCopilotHistory(type: string, copilotInteraction: CopilotInteraction) {
    this._copilotHistory.set(type, [
      ...(this._copilotHistory.get(type) ?? []),
      copilotInteraction,
    ]);
  }

  getCopilotHistory(type: string) {
    return [...(this._copilotHistory.get(type) ?? [])];
  }

  private _copilotFeedbackByInteractionId = observable.map<
    CopilotInteractionId,
    boolean
  >();

  async submitCopilotFeedback(
    id: CopilotInteractionId,
    feedback: boolean,
    feedbackDescription: string | null
  ) {
    await this.appCtx.api.sendCopilotFeedback({
      id,
      feedback,
      feedbackDescription,
      projectId: this.siteInfo.id,
    });
    this._copilotFeedbackByInteractionId.set(id, feedback);
  }

  getCopilotFeedback(copilotInteractionId: CopilotInteractionId) {
    return this._copilotFeedbackByInteractionId.get(copilotInteractionId);
  }

  /** Gets dedicated arena for component/page, while checking if user has edit access. */
  getDedicatedArena(component: Component) {
    if (!this.canEditComponent(component)) {
      return undefined;
    }

    return getDedicatedArena(this.site, component);
  }

  async changeFrameViewMode(frame: ArenaFrame, mode: "stretch" | "centered") {
    return this.changeUnsafe(() => {
      const viewCtx = this.focusedViewCtx();
      const component = frame.container.component;

      if (isComponentArena(this.currentArena)) {
        getArenaFrames(this.currentArena).forEach(
          (_frame) => (_frame.viewMode = ensure(mode, "mode should exist"))
        );
      } else {
        frame.viewMode = ensure(mode, "mode should exist");
      }

      if (frame.viewMode === FrameViewMode.Stretch) {
        const exp = viewCtx
          ?.variantTplMgr()
          .targetRshForNode(
            ensure(component.tplTree as TplNode, "tplTree should exist")
          );
        exp?.set("width", "stretch");

        // When switching to Stretch mode, shift focus to the
        // root node
        if (this.focusedFrame() === frame) {
          viewCtx?.setStudioFocusByTpl(frame.container.component.tplTree);
        }
      } else if (frame.viewMode === FrameViewMode.Centered) {
        // When switching to Centered mode, shift focus to the frame
        this.setStudioFocusOnFrame({
          frame: frame,
          autoZoom: false,
        });
      }
    });
  }

  switchToComponentArena(
    target: ValNode | SlotSelection | Component | undefined
  ) {
    const component = switchType(target)
      .when(undefined, () => undefined)
      .when(Component, (it) => it)
      .when(ValComponent, (it) => it.tpl.component)
      .when(ValNode, (it) => it.valOwner?.tpl.component)
      .when(SlotSelection, (it) => it.tpl?.component)
      .result();

    if (!component) {
      return undefined;
    }

    if (
      isCodeComponent(component) ||
      !this.site.components.find((c) => c === component)
    ) {
      return undefined;
    }

    const arena = this.getDedicatedArena(component);
    if (!arena) {
      return undefined;
    }

    this.switchToArena(arena);
    return arena;
  }

  /**
   * We want to load canvas frames one at a time.  This avoids making the
   * studio unusable while an arena with lots of artboards first loads,
   * and also avoids freezing up Chrome when the artboards are app-hosted
   * on very noisy hosts (like vite, downloading a ton of files per artboard).
   * Note that when an arena is hidden, Chrome may pause loading those iframes
   * or running javascript, so we only bother attempting to load artboards
   * that are for the current arena.
   *
   * We are using asynclib.queue a bit differently.  Because
   * asynclib.queue doesn't let us look through the queue to pick out requests
   * for the current arena, we keep the requests in a transparent array, and use
   * the queue just as a mechanism to call our canvas-loading callback whenever a
   * frame needs to be loaded.
   */
  private canvasLoadRequests: CanvasLoadRequest[] = [];

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  private canvasLoadQueue = asynclib.queue(
    safeCallbackify(async (_: {}) => {
      return requestIdleCallbackAsync(async () => {
        // Find a request to load for the current arena.  If none, then just
        // bail; even if there are outstanding load requests, if they are for
        // other arenas, then their iframes are invisible, and Chrome may not
        // load them anyway.  We will get back to them later when we switch
        // back to that arena (see switchArena()).
        const nextRequest = this.canvasLoadRequests.find(
          (r) => r.arena === this.currentArena
        );
        if (!nextRequest) {
          return;
        }
        removeFromArray(this.canvasLoadRequests, nextRequest);

        // We load the canvas frame.  However, it is possible that in the middle
        // of loading, we switch to a different arena, thus making this iframe
        // invisible.  When that happens, Chrome may choose to pause loading
        // the iframe, which means if we `await` the load, we may never finish
        // (for exampe, load() includes waiting for the wab_body, which may never
        // come if javascript isn't running!).  Therefore, we kick off a load, but
        // we also kick of a race between the loading and another promise that keeps
        // checking if the current request is for a different arena.  If so, then
        // we have switched arena since loading, and we should just bail on this request.
        let done = false;
        await Promise.race([
          nextRequest.load().then(() => (done = true)),
          (async () => {
            // eslint-disable-next-line no-constant-condition
            while (true) {
              await asyncTimeout(100);
              if (done) {
                // Great!
                return "done";
              }
              if (nextRequest.arena !== this.currentArena) {
                // nextRequest may never finish loading because its iframe is
                // no longer visible.  Resolve this promise, so that we don't
                // wait for it forever.
                console.log(
                  `StudioCtx: Bailing out of loading ${nextRequest.name}; different arena now`
                );
                return "timeout";
              }
            }
          })(),
        ]);
      });
    }),
    1
  );
  queueCanvasFrame(request: CanvasLoadRequest) {
    this.canvasLoadRequests.push(request);
    // Don't care about what we actually store into the canvasLoadQueue
    spawn(this.canvasLoadQueue.push({}));
  }
  drainCanvasFrameForArena(arena: AnyArena) {
    const canvasRequests = this.canvasLoadRequests.filter(
      (r) => r.arena === arena
    );
    if (canvasRequests.length > 0) {
      defer(() => {
        spawn(this.canvasLoadQueue.push(canvasRequests.map((_) => ({}))));
      });
    }
  }

  private debouncedWarn = debounce(
    (args: ArgsProps) => notification.warn(args),
    60000,
    {
      leading: true,
    }
  );

  private dataOpCache: Record<string, Promise<any>> = {};

  executePlasmicDataOp = asyncMaxAtATime(
    10,
    async (op: DataOp, opts?: Parameters<typeof executePlasmicDataOp>[1]) => {
      // Custom in-studio executePlasmicDataOp. For now, it will point to localhost
      // instead of the production host. Soon, it will instead point to a studio endpoint
      // instead of the public server-data endpoint, so that it can make priviledged
      // data requests as an app end user.
      const appUserCtx = this.currentAppUserCtx;
      if (op.roleId) {
        if (
          !appUserCtx.appUser ||
          !appUserCtx.appUser.roleIds ||
          !appUserCtx.appUser.roleIds.includes(op.roleId)
        ) {
          this.debouncedWarn({
            message:
              "Some data couldn't be loaded because you are viewing the app as an user that doesn't have the required role.",
          });

          throw new UnauthorizedError();
        }
      }

      const execute = async () => {
        try {
          const result =
            await this.appCtx.api.executeDataSourceOperationInCanvas(
              this.siteInfo.id,
              op.sourceId,
              {
                opId: op.opId,
                paginate: opts?.paginate,
                userArgs: JSON.parse(stringify(op.userArgs)),
                identifier: {
                  email: appUserCtx.appUser.email,
                  externalId: appUserCtx.appUser.externalId,
                },
              }
            );

          if (op.invalidatedKeys?.some((k) => k === ALL_QUERIES.value)) {
            await this.refreshAppUserProperties();
          }
          return result;
        } catch (e) {
          if (e.name === "NotFoundError") {
            this.debouncedWarn({
              message: `Could not find integration.`,
              duration: 30,
            });
          } else if (e.name === "ForbiddenError") {
            this.debouncedWarn({
              message: `You do not have permission to use some of the data integrations in this project. You must have at least viewer access to the Workspace that the data integrations belong to.  Please contact the owner of the data integrations to add you to the necessary Workspaces.`,
              duration: 0,
            });
          }
          throw e;
        }
      };

      // Should only happen when op is a write operation since we don't
      // want to cache an operation that mutates data.
      if (isNil(op.cacheKey)) {
        const result = await execute();
        return result;
      }

      const cacheKey = makeCacheKey(op, {
        paginate: opts?.paginate,
        userAuthToken: opts?.userAuthToken ?? appUserCtx.fakeAuthToken,
      });

      if (cacheKey in this.dataOpCache) {
        return this.dataOpCache[cacheKey];
      }

      this.dataOpCache[cacheKey] = execute();

      return this.dataOpCache[cacheKey];
    }
  );

  executeServerQuery = asyncMaxAtATime(
    10,
    async <F extends (...args) => Promise<any>>(
      id: string,
      fn: F,
      ...args: Parameters<F>
    ) => {
      const cacheKey = makeQueryCacheKey(id, args);
      if (cacheKey in this.dataOpCache) {
        return this.dataOpCache[cacheKey];
      }
      this.dataOpCache[cacheKey] = fn(...args);
      return this.dataOpCache[cacheKey];
    }
  );

  // Deletes entries in our studio dataOp cache.
  // If invalidateKey is undefined, will invalidate the whole cache. This happens
  // when the user clicks the "Refresh Data" button.
  mutateDataOp = (invalidateKey?: string) => {
    if (!isNil(invalidateKey)) {
      delete this.dataOpCache[invalidateKey];
      if (invalidateKey.startsWith("$swr$")) {
        delete this.dataOpCache[invalidateKey.slice(5)];
      }
      return;
    }
    this.dataOpCache = {};
  };

  getAllDataOpCacheKeys = () => {
    return Object.keys(this.dataOpCache);
  };

  private _currentAppUserCtx = observable.box<{
    appUser: StudioAppUser;
    fakeAuthToken?: string;
  }>(
    {
      appUser: {
        isLoggedIn: false,
        email: undefined,
        externalId: undefined,
        properties: undefined,
        customProperties: undefined,
        roleName: undefined,
        roleIds: undefined,
      },
    },
    {
      name: "StudioCtx._currentAppUserCtx",
    }
  );

  get currentAppUserCtx() {
    return this._currentAppUserCtx.get();
  }

  get currentAppUser() {
    return this._currentAppUserCtx.get().appUser;
  }

  async logAsAppUser(appUser: StudioAppUser) {
    this._currentAppUserCtx.set({
      appUser,
      // We assign a fake auth token to emulate the proper behavior in live-preview
      // mode. Data sources use only the auth token to cache data.
      fakeAuthToken: appUser.email,
    });

    if (appUser.isLoggedIn) {
      await this.appCtx.api.addStorageItem(
        storageViewAsKey(this.siteInfo.id),
        JSON.stringify({
          studioAppUser: appUser,
        })
      );
    } else {
      // Save null for logout
      await this.appCtx.api.addStorageItem(
        storageViewAsKey(this.siteInfo.id),
        "null"
      );
    }

    for (const vc of this.viewCtxs) {
      vc.scheduleSync({ eval: true });
    }
  }

  async resetAppUser() {
    await this.logAsAppUser({
      isLoggedIn: false,
      email: undefined,
      externalId: undefined,
      properties: undefined,
      customProperties: undefined,
      roleName: undefined,
      roleIds: undefined,
    });
  }

  async refreshAppUserProperties() {
    if (this.currentAppUser.email || this.currentAppUser.externalId) {
      const newProperties = await this.appCtx.api.getAppCurrentUserProperties(
        this.siteInfo.id,
        {
          email: this.currentAppUser.email,
          externalId: this.currentAppUser.externalId,
        }
      );

      const newAppUser = {
        ...this.currentAppUser,
        customProperties: newProperties,
      };

      if (!isEqual(this.currentAppUserCtx.appUser, newAppUser)) {
        await this.logAsAppUser(newAppUser);
      }
    }
  }

  private _onboardingTourState = observable.box<OnboardingTourState>({
    run: false,
    stepIndex: 0,
    tour: "",
    flags: {},
    results: {},
    triggers: [],
  });

  tourActionEvents = new Signals.Signal();

  get onboardingTourState() {
    return this._onboardingTourState.get();
  }

  setOnboardingTourState(state: OnboardingTourState) {
    this._onboardingTourState.set(state);
  }

  mergeOnboardingTourStateResults(results: OnboardingTourState["results"]) {
    this._onboardingTourState.set({
      ...this.onboardingTourState,
      results: {
        ...this.onboardingTourState.results,
        ...results,
      },
    });
  }

  shownSyntheticSections = observable.map(new Map());

  getCurrentPathName = () => {
    return this.focusedOrFirstViewCtx()?.component.pageMeta?.path;
  };

  normalizeCurrentArena = () => {
    const arena = this.currentArena;
    if (isMixedArena(arena)) {
      const delta = normalizeMixedArenaFrames(arena);
      // normalizeMixedArenaFrames may change the top left of the arena.
      // To avoid seeming like the clipper moved for the user,
      // scroll by the delta.
      if (delta) {
        const viewportCtx = this.viewportCtx!;
        viewportCtx.scrollBy(delta.scale(viewportCtx.scale()));
      }
    }
  };
}

interface CopilotInteraction {
  prompt: string;
  id: CopilotInteractionId;
  response: string;
}

interface OnboardingTourState {
  run: boolean;
  stepIndex: number;
  // List of events that will trigger the tour to advance to the next step
  triggers: TutorialEventsType[];
  tour: string;
  flags: Partial<TutorialStateFlags>;
  results: {
    addedQuery?: string;
    dynamicPage?: string;
    form?: string;
    richTable?: string;
  };
}

interface CanvasLoadRequest {
  arena: AnyArena;
  load: () => Promise<void>;
  name: string;
}

export const StudioCtxContext = React.createContext<StudioCtx | undefined>(
  // To recover studioCtx after hot reloading
  (window as any).dbg?.studioCtx
);
export const withStudioCtx = withConsumer(
  StudioCtxContext.Consumer,
  "studioCtx"
);
export const providesStudioCtx = withProvider(StudioCtxContext.Provider);
export const useStudioCtx = () => ensure(useContext(StudioCtxContext), "");
export const usePlasmicCtx = () => {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedViewCtx();
  return { studioCtx, viewCtx };
};

function canUserEditProject(user: ApiUser | null, project: SiteInfo) {
  if (!user) {
    // Anonymous users can never edit.
    return false;
  }
  if (
    (DEVFLAGS.allowPlasmicTeamEdits &&
      isAdminTeamEmail(user.email, DEVFLAGS)) ||
    accessLevelRank(project.defaultAccessLevel) >= accessLevelRank("content")
  ) {
    return true;
  }
  const accessLevel = getAccessLevelToResource(
    { type: "project", resource: project },
    user,
    project.perms
  );
  return accessLevelRank(accessLevel) >= accessLevelRank("content");
}

function isContentEditor(user: ApiUser | null, project: SiteInfo) {
  if (!user) {
    return false;
  }
  const userAccessLevel = getAccessLevelToResource(
    { type: "project", resource: project },
    user,
    project.perms
  );
  const accessLevel =
    accessLevelRank(project.defaultAccessLevel) >=
    accessLevelRank(userAccessLevel)
      ? project.defaultAccessLevel
      : userAccessLevel;
  return accessLevel === "content";
}

export function checkAccessLevelRank(
  user: ApiUser | null,
  project: ApiProject,
  perms: ApiPermission[],
  rank: AccessLevel
) {
  if (!user) {
    return false;
  }
  return (
    accessLevelRank(
      getAccessLevelToResource(
        {
          type: "project",
          resource: project,
        },
        user,
        perms
      )
    ) >= accessLevelRank(rank)
  );
}

export function isUserProjectContentEditor(
  user: ApiUser | null,
  project: ApiProject,
  perms: ApiPermission[]
) {
  return checkAccessLevelRank(user, project, perms, "content");
}

export function canUpdateHistory(
  studioCtx: StudioCtx,
  thread: TplCommentThread
): boolean {
  const appCtx = studioCtx.appCtx;
  const isProjectContentEditor = isUserProjectContentEditor(
    appCtx.selfInfo,
    studioCtx.siteInfo,
    studioCtx.siteInfo.perms
  );
  return isProjectContentEditor || appCtx.selfInfo?.id === thread.createdById;
}

export function isUserProjectEditor(
  user: ApiUser | null,
  project: ApiProject,
  perms: ApiPermission[]
) {
  return checkAccessLevelRank(user, project, perms, "editor");
}

export function cssPropsForInvertTransform(
  curZoom: number,
  orgSize?: { width?: number; height?: number },
  orgTransform?: string
) {
  return {
    transform: orgTransform
      ? `scale(${1 / curZoom}) ${orgTransform}`
      : `scale(${1 / curZoom})`,
    width: orgSize && orgSize.width ? `${orgSize.width * curZoom}px` : "0px",
    height: orgSize && orgSize.height ? `${orgSize.height * curZoom}px` : "0px",
  };
}

export const adjustSpotLightDueToZoom = (zoom: number) => {
  const $shadow = $(".component-ctx-spotlight__shadow");
  if ($shadow.length > 0 && $shadow.css("display") !== "none") {
    // The box-shadow may overflow the maximum pixel size after scale, which
    // seems become negative and cause weird black blocks in the screen. So
    // we scale it back to avoid overflow.
    $shadow.css({ boxShadow: `0 0 0 ${999999 / zoom}px rgba(0,0,0,0.15)` });
  }
  const $ctrl = $(".component-ctx-spotlight__controls");
  if ($ctrl.length > 0 && $ctrl.css("display") !== "none") {
    // We scale back the controls so that they are always at 1x, and always
    // 10px below the spotlight.
    $ctrl.css({
      transform: `translate(0, ${10.0 / zoom}px) scale(${1.0 / zoom})`,
    });
  }
};

function invertTransform($e: JQuery, curZoom: number) {
  const originalWidth = $e.attr("data-original-width");
  const originalHeight = $e.attr("data-original-height");
  const transform = $e.attr("data-original-transform");
  const styles = cssPropsForInvertTransform(
    curZoom,
    {
      width: maybe(originalWidth, (x) => +x),
      height: maybe(originalHeight, (x) => +x),
    },
    transform
  );
  const elt = $e[0];
  setElementStyles(elt, styles);
}

/**
 * Compares spotlight and pinned variants info about a viewCtx to decide
 * whether it should re-render after making such changes.
 * Returns `true` if it needs to re-render.
 */
function viewCtxInfoChanged(
  vcInfo: SpotlightAndVariantsInfo,
  vcPreviousInfo: SpotlightAndVariantsInfo
) {
  return (
    vcInfo.componentStackFrameLength !==
      vcPreviousInfo.componentStackFrameLength ||
    vcInfo.lastComponentFrame.tplComponent !==
      vcPreviousInfo.lastComponentFrame.tplComponent ||
    vcInfo.viewMode !== vcPreviousInfo.viewMode ||
    vcInfo.showDefaultSlotContents !== vcPreviousInfo.showDefaultSlotContents ||
    !isEqual(vcInfo.pinnedVariants, vcPreviousInfo.pinnedVariants) ||
    makeSelectableFullKey(vcInfo.focusedSelectable) !==
      makeSelectableFullKey(vcPreviousInfo.focusedSelectable) ||
    vcInfo.focusedTpl !== vcPreviousInfo.focusedTpl
  );
}

export function logChangedNodes(
  logMessage: string,
  changes: ModelChange[],
  includeUids?: boolean
) {
  console.log(
    logMessage,
    uniq(
      changes.map(
        (change) =>
          `${instUtil.getInstClassName(change.changeNode.inst)}${
            includeUids ? `[${change.changeNode.inst.uid}]` : ""
          }.${change.changeNode.field}`
      )
    ).join(", ")
  );
}

// Changes that should be fine even when studioCtx.blockChanges is true
function emptyChanges(recordedChanges: RecordedChanges) {
  const changes = recordedChanges.changes;
  if (changes.length === 0) {
    return true;
  }
  // We might create a VariantSetting by selecting a node that hasn't one,
  // but it should be fine
  if (
    changes.length === 1 &&
    changes[0].changeNode.field === "vsettings" &&
    changes[0].type === "array-splice" &&
    changes[0].removed.length === 0 &&
    changes[0].added.every(
      (val) => isKnownVariantSetting(val) && isVariantSettingEmpty(val)
    )
  ) {
    return true;
  }

  return false;
}

export function studioCtxKey<
  Method extends keyof StudioCtx,
  Args extends StudioCtx[Method] extends (..._args: any[]) => any
    ? Parameters<StudioCtx[Method]>
    : never
>(method: Method, ...args: Args) {
  return invalidationKey(method, ...args);
}

export function normalizeTemplateSpec(
  templateSpec: TemplateSpec[],
  isPageTemplatesGroup: boolean
): InsertableTemplatesGroup {
  return {
    type: "insertable-templates-group",
    name: "root",
    items: [...xGroupBy(templateSpec, (spec) => spec.category).entries()].map(
      ([category, specs]) => ({
        type: "insertable-templates-group",
        name: category ?? "",
        isPageTemplatesGroup,
        items: specs.map((spec) =>
          ensureType<InsertableTemplatesItem>({
            type: "insertable-templates-item",
            projectId: spec.projectId,
            componentName: spec.componentName,
            imageUrl: spec.imageUrl,
            displayName: spec.displayName,
            tokenResolution: spec.tokenResolution,
            componentResolution: spec.componentResolution,
          })
        ),
      })
    ),
  };
}

export async function addGetManyQuery({
  component,
  dataSourceId,
  table,
  templates,
  studioCtx,
  queryName,
}: {
  component: Component;
  dataSourceId: string;
  table: string;
  templates?: { [p: string]: DataSourceTemplate };
  studioCtx: StudioCtx;
  queryName?: string;
}) {
  const getMany = mkDataSourceOpExpr({
    sourceId: dataSourceId,
    opId: "temporary-id",
    opName: "getMany",
    templates: {
      resource: mkDataSourceTemplate({
        fieldType: "table",
        value: new TemplatedString({
          text: [JSON.stringify(table)],
        }),
        bindings: null,
      }),
      ...templates,
    },
  });

  const { opId } = await studioCtx.appCtx.app.withSpinner(
    studioCtx.appCtx.api.getDataSourceOpId(
      studioCtx.siteInfo.id,
      dataSourceId,
      {
        name: "getMany",
        templates: mapValues(getMany.templates, dataSourceTemplateToString),
        roleId: undefined,
      }
    )
  );

  const query = await studioCtx.changeUnsafe(() => {
    const query_ = addEmptyQuery(component, queryName);

    getMany.opId = opId;

    query_.op = getMany;

    return query_;
  });
  return query;
}
