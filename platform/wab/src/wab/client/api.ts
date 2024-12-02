import { analytics } from "@/wab/client/analytics";
import { storageViewAsKey } from "@/wab/client/app-auth/constants";
import { ensureIsTopFrame, isHostFrame } from "@/wab/client/cli-routes";
import { LocalClipboardAction } from "@/wab/client/clipboard/local";
import {
  SerializableClipboardData,
  serializeClipboardItems,
} from "@/wab/client/clipboard/ReadableClipboard";
import { PushPullQueue } from "@/wab/commons/asyncutil";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import { transformErrors } from "@/wab/shared/ApiErrors/errors";
import { ApiUser } from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { Bundler } from "@/wab/shared/bundler";
import {
  assert,
  ensure,
  hackyCast,
  maybe,
  omitNils,
  swallow,
  truncateText,
} from "@/wab/shared/common";
import {
  DEVFLAGS,
  flattenInsertableIconGroups,
  flattenInsertableTemplates,
} from "@/wab/shared/devflags";
import { LowerHttpMethod } from "@/wab/shared/HttpClientUtil";
import { PLEXUS_STORAGE_KEY } from "@/wab/shared/insertables";
import {
  PkgInfo,
  SharedApi,
  WrappedStorageEvent,
} from "@/wab/shared/SharedApi";
import * as Sentry from "@sentry/browser";
import { proxy, ProxyMarked } from "comlink";
import $ from "jquery";
import L, { pick } from "lodash";
import io, { Socket } from "socket.io-client";

const fullApiPath = (url: /*TWZ*/ string) => `/api/v1/${L.trimStart(url, "/")}`;

export class XHRStatus0Error extends Error {
  constructor(message?: string) {
    super(`XHRStatus0Error: ${message}`);
  }
}

export class UnknownApiError extends Error {}

export const ajax = async (
  method: string,
  apiSubpath: string,
  data?: {},
  opts?: /*TWZ*/ {},
  hideDataOnError?: boolean,
  noErrorTransform?: boolean
) =>
  new Promise<any>((resolve, reject) => {
    let search = "";
    if (method === "get" || method === "delete") {
      search = new URLSearchParams(
        L.mapValues(L.omitBy(data, L.isUndefined), (v) => JSON.stringify(v))
      ).toString();
      if (search) {
        search = "?" + search;
      }
    }
    // From jQuery.ajax().fail() we can't get the full stack trace with
    // information about who made the request. To overcome that, we create
    // an empty error here to get a stack trace that an be appended to the
    // stack of the error we generate in the fail() function below.
    const callingStack = (new Error().stack || "")
      .split("\n")
      .slice(1)
      .join("\n");

    const params =
      data instanceof FormData && data.has("file")
        ? {
            processData: false,
            // This is imperative to force jQuery not to add a Content-Type,
            // leaving that to the browser which can handle FormData properly.
            // Reference: https://stackoverflow.com/questions/5392344/
            contentType: false as any,
            data,
          }
        : {
            mimeType: "application/json",
            contentType: "application/json; charset=utf-8",
            data: method === "get" ? undefined : maybe(data, JSON.stringify),
          };

    void $.ajax({
      url: fullApiPath(apiSubpath) + search,
      type: method,
      ...params,
      ...opts,
    })
      .done((responseData, _txtStatus, _xhr) => {
        resolve(responseData);
      })
      .fail((xhr, txtStatus, err) => {
        const error =
          swallow(() => {
            const response = JSON.parse(xhr.responseText);
            if (noErrorTransform) {
              return response;
            }
            let transformed = transformErrors(response.error);
            if (!(transformed instanceof Error)) {
              // The error was JSON-parsible, but not one of the known
              // ApiErrors. So it is now just a JSON object, not an Error.
              // We create an UnknownApiError for it instead.
              transformed = new UnknownApiError(
                `${method} ${apiSubpath} failed: ${
                  (transformed as Error).message
                }`
              );
            }
            return transformed;
          }) ||
          (xhr.status === 0
            ? new XHRStatus0Error(`${method} ${apiSubpath} failed`)
            : new UnknownApiError(
                `${method} ${apiSubpath} failed [${xhr.status}/${
                  xhr.readyState
                }]: ${err}\nstatus ${txtStatus}\ndata ${
                  data === undefined
                    ? "undefined"
                    : hideDataOnError
                    ? "[redacted]"
                    : truncateText(200, JSON.stringify(data))
                }`
              ));
        if (!noErrorTransform) {
          error.stack += `\n${callingStack}`;
        }
        reject(error);
      });
  });

type EventWithData = { eventName: string; data: {} };

export class Api extends SharedApi {
  constructor() {
    super();
    ensureIsTopFrame();
  }

  setUser = setUser;

  clearUser() {
    analytics().setAnonymousUser();
    Sentry.configureScope((scope) => {
      scope.setUser({});
    });
  }

  async req(
    method: LowerHttpMethod,
    url: string,
    data?: {},
    opts?: {},
    hideDataOnError?: boolean,
    noErrorTransform?: boolean
  ) {
    return ajax(method, url, data, opts, hideDataOnError, noErrorTransform);
  }

  private socket?: typeof Socket;
  private queue = new PushPullQueue<EventWithData>();

  /**
   * This method proxies the websocket. This is a very simple model where we
   * assume a single socket and a static set of events that are being listened
   * for - basically just enough to serve
   * StudioCtx.startListeningForSocketEvents.
   *
   * The socket connect and event listening must happen synchronously or else
   * messages may be missed (I think - don't know socket.io well).
   *
   * Each call returns one EventWithData bundle (or never returns if someone
   * calls closeSocket). So you're expected to call this in a loop.
   */
  async listenSocket(
    eventNames: string[],
    connected: boolean
  ): Promise<EventWithData> {
    if (this.socket && !connected) {
      // Not connected, even though the socket exists; disconnect the existing
      // socket and create a new one. This happens if we navigate from a studio
      // page to a dashboard and back to a studio page. When we navigate away
      // from a studio page, we don't have a chance to disconnect yet, because
      // the host iframe just gets removed and there's nothing we can hook into
      // to disconnect first :-/
      this.socket.disconnect();
      this.socket = undefined;
    }
    if (!this.socket) {
      this.socket = io.connect({
        path: "/api/v1/socket",
        transports: ["websocket"],
      });
      for (const eventName of eventNames) {
        this.socket.on(eventName, (data) => {
          this.queue.push({ eventName, data });
        });
      }
    }
    return this.queue.pull();
  }

  async closeSocket() {
    this.socket?.close();

    this.queue = new PushPullQueue();
  }

  async getStudioUrl(): Promise<string> {
    return `${location.protocol}//${location.host}`;
  }

  async reloadLocation() {
    location.reload();
  }

  async emit(eventName: string, data: {}) {
    ensure(this.socket, "Unexpected nullish socket").emit(eventName, data);
  }

  githubToken() {
    const token = this.getStorageItem("githubToken");
    if (!token) {
      throw new Error("Missing GitHub token");
    }
    return { "x-plasmic-github-token": token };
  }

  // listeners is a dict of unique IDs to registered handlers.
  // It is used to help removing event listeners, because handler/event
  // wrapping makes it very hard to get the right handler to remove.
  //
  // Expected usage of (add|remove)StorageListener:
  //
  //   React.useEffect(() => {
  //     const uniqueId = mkUuid();
  //     api.addStorageListener(uniqueId, handler);
  //     return () => api.removeEventListener("storage", uniqueId);
  //   }
  private listeners: Record<string, (...args: any) => any> = {};

  addStorageListener(
    uniqueId: string,
    listener: ((ev: WrappedStorageEvent) => any) & ProxyMarked
  ) {
    const wrapped = (ev: StorageEvent): any => {
      return listener({
        key: ev.key,
        newValue: ev.newValue,
      });
    };
    this.listeners[uniqueId] = wrapped;
    window.addEventListener("storage", wrapped);
  }

  // This is for generic listeners which do not require arguments. API will
  // not forward the triggering event to the handler.
  addEventListener(
    event: string,
    uniqueId: string,
    listener: (() => any) & ProxyMarked
  ) {
    assert(["popstate"].includes(event), "Unexpected event");
    const wrapped = () => {
      return listener();
    };
    this.listeners[uniqueId] = wrapped;
    window.addEventListener(event, wrapped);
  }

  removeEventListener(event: string, uniqueId: string) {
    window.removeEventListener(event, this.listeners[uniqueId]);
    delete this.listeners[uniqueId];
  }

  addStorageItem(key: string, value: any) {
    assert(!isHostFrame(), "Should only run in the top frame");
    localStorage.setItem(key, value);
    // "storage" events aren't triggered on the same window that sets the
    // new value
    window.dispatchEvent(
      new StorageEvent("storage", {
        key,
        newValue: value,
      })
    );
  }

  getStorageItem(key: string) {
    assert(!isHostFrame(), "Should only run in the top frame");
    return localStorage.getItem(key);
  }

  removeStorageItem(key: string) {
    assert(!isHostFrame(), "Should only run in the top frame");
    localStorage.removeItem(key);
  }

  async readNavigatorClipboard(
    lastAction: LocalClipboardAction
  ): Promise<SerializableClipboardData> {
    assert(!isHostFrame(), "Should only run in the top frame");

    let permission: PermissionStatus;
    try {
      permission = await navigator.permissions.query({
        name: "clipboard-read",
      });
    } catch (_) {
      throw new Error("Your browser does not support Clipboard API");
    }

    if (permission.state != "granted" && permission.state != "prompt") {
      throw new Error("No permission to use clipboard");
    }

    assert(
      navigator.clipboard.read,
      "Your browser does not support Clipboard API"
    );
    const items = await navigator.clipboard.read();
    return await serializeClipboardItems(items, lastAction);
  }

  async whitelistProjectIdToCopy(projectId: string) {
    assert(!isHostFrame(), "Should only run in the top frame");

    this.addStorageItem(`copy/${projectId}`, JSON.stringify(+new Date()));
  }
}

export class SiteApi {
  _siteId: string;
  _api: PromisifyMethods<Api>;
  constructor({ siteId, api }: { siteId: string; api: PromisifyMethods<Api> }) {
    this._siteId = siteId;
    this._api = api;
  }
  dml(data) {
    return this._api.post(`/dml/${this._siteId}`, data);
  }
  insert(data) {
    return this._api.post(`/insert/${this._siteId}`, data);
  }
  query(queries: QueryBundle) {
    return this._api.post(`/query/${this._siteId}`, { queries });
  }
  eval(data) {
    return this._api.post("/eval", data);
  }
  uploadUrl() {
    return fullApiPath(`/upload/${this._siteId}`);
  }
  nodeOp(data) {
    return this._api.post("/node-op", data);
  }
}

interface QueryMap {
  [key: string]: string;
}
type QueryBundle = QueryMap | string[];

export class BundlingSiteApi {
  _siteApi: SiteApi;
  _bundler: Bundler;
  constructor({ bundler, siteApi }: { bundler: Bundler; siteApi: SiteApi }) {
    this._siteApi = siteApi;
    this._bundler = bundler;
  }
  dml(data) {
    return this._siteApi.dml(data);
  }
  insert(data) {
    return this._siteApi.insert(data);
  }
  query(queries: QueryBundle) {
    return this._siteApi.query(queries);
  }
  eval(data) {
    return this._siteApi.eval(data);
  }
  uploadUrl() {
    return this._siteApi.uploadUrl();
  }
}

/**
 * This is to filter the API requests from the host app, for example to make
 * sure it won't be able to delete projects, or to access all projects from the
 * user.
 * @param projectId The site ID
 * @param apiProxy A proxy that binds the methods to the original API instance
 * @param appConfig
 * @returns Another proxy with basic access control to prevent unwanted calls
 */
export function filteredApi(
  projectId: string,
  apiProxy: PromisifyMethods<Api>,
  appConfig: typeof DEVFLAGS
) {
  // Cached Pkg
  let maybePkg: PkgInfo | undefined = undefined;
  const getPkgId = async () => {
    if (!maybePkg) {
      // Maybe the project didn't have a pkg last time we fetched, so try again!
      maybePkg = (await apiProxy.getPkgByProjectId(projectId)).pkg;
    }
    return maybePkg?.id;
  };

  const insertableProjectIds = L.uniq([
    ...flattenInsertableTemplates(appConfig.insertableTemplates).map(
      (i) => i.projectId
    ),
    ...flattenInsertableIconGroups(appConfig.insertableTemplates).map(
      (i) => i.projectId
    ),
    ...flattenInsertableTemplates(DEVFLAGS.insertableTemplates).map(
      (i) => i.projectId
    ),
    ...flattenInsertableIconGroups(DEVFLAGS.insertableTemplates).map(
      (i) => i.projectId
    ),
  ]);

  const checkprojectId = (reqProjectId: string) => {
    assert(
      reqProjectId === projectId,
      `Unexpected projectId ${reqProjectId} (Expected ${projectId})`
    );
  };

  // Whitelisted keys for the host app to read and write to the localStorage
  // Make sure to not allow reading auth tokens etc.
  const whitelistedLocalStorageKeys = [
    "codegenType",
    storageViewAsKey(projectId),
  ];
  const whitelistedLocalStorageKeyPrefixes = [
    PLEXUS_STORAGE_KEY,
    "plasmic.tours.",
    "plasmic.focused.",
    "plasmic.leftTabKey",
    "plasmic.free-trial.",
    "plasmic.load-cache.",
  ];

  // Methods that are always safe for the host app to call
  const whitelistedMethods: (keyof Api)[] = [
    "listenSocket",
    "closeSocket",
    "getStudioUrl",
    "getUsersById",
    "reloadLocation",
    "addEventListener",
    "removeEventListener",
    "getSelfInfo",
    "getPlumePkg",
    "getPkgByProjectId",
    "getPkgVersion",
    "getPkgVersionMeta",
    "refreshCsrfToken",
    "getLastBundleVersion",
    "getAppConfig",
    "getClip",
    "readNavigatorClipboard",
    "uploadImageFile",
    "queryCopilot",
    "sendCopilotFeedback",
    "addReactionToComment",
    "removeReactionFromComment",
    "getAppAuthPubConfig",
    "processSvg",
  ];
  const checkProjectIdInFirstArg =
    (f: any) =>
    (reqProjectId: string, ...args: any[]) => {
      checkprojectId(reqProjectId);
      return f(reqProjectId, ...args);
    };

  const isWhitelistedStorageKey = (key: string) => {
    return (
      whitelistedLocalStorageKeys.includes(key) ||
      whitelistedLocalStorageKeyPrefixes.some((prefix) =>
        key.startsWith(prefix)
      )
    );
  };

  // Methods that we need to allow the host to use, but want to make sure it's
  // being used correctly
  const wrappedMethods: Partial<{
    [key in keyof Api]: (f: Api[key]) => Api[key];
  }> = {
    emit: (f) => (eventName, data) => {
      if (data && "projectIds" in data) {
        assert(
          (data["projectIds"] as string[]).every((id) => id === projectId),
          "Unexpected projectId"
        );
      }
      if (data && "projectId" in data) {
        assert(data["projectId"] === projectId, "Unexpected projectId");
      }
      return f(eventName, data);
    },
    addStorageListener: (f) => (uniqueId, listener) => {
      return f(
        uniqueId,
        proxy((ev) => {
          if (isWhitelistedStorageKey(ev.key ?? "")) {
            listener(ev);
          }
        })
      );
    },
    addStorageItem: (f) => (key, value) => {
      assert(isWhitelistedStorageKey(key), "Unexpected key " + key);
      return f(key, value);
    },
    getStorageItem: (f) => (key) => {
      assert(isWhitelistedStorageKey(key), "Unexpected key " + key);
      return f(key);
    },
    removeStorageItem: (f) => (key) => {
      assert(isWhitelistedStorageKey(key), "Unexpected key " + key);
      return f(key);
    },
    getModelUpdates: checkProjectIdInFirstArg,
    getSiteInfo: (f) => async (siteId, opts) => {
      // The only projects we need to fetch are the site itself and the
      // insertable templates (imported projects use `getPkgVersion`).

      const isKnownProject = [projectId, ...insertableProjectIds].includes(
        siteId
      );
      if (isKnownProject) {
        return f(siteId, opts);
      }

      // In case the user has copied some elements from another project we
      // check how long ago the user copied the elements. If it's been more
      // than 1 day, we don't need to fetch the project.
      const errorMsg = `Unexpected projectId ${siteId}`;

      const value = await apiProxy.getStorageItem(`copy/${siteId}`);
      if (!value) {
        throw new Error(errorMsg);
      }

      const diff = new Date().getTime() - new Date(+value).getTime();
      const diffInDays = diff / (1000 * 3600 * 24);

      if (diffInDays > 1) {
        throw new Error(errorMsg);
      }

      return f(siteId, opts);
    },
    cloneProject: checkProjectIdInFirstArg,
    saveProjectRevChanges: checkProjectIdInFirstArg,
    computeNextProjectVersion: checkProjectIdInFirstArg,
    publishProject: checkProjectIdInFirstArg,
    listPkgVersionsWithoutData:
      (f) =>
      async (...args) => {
        assert(args[0] === (await getPkgId()), "Unexpected pkgId");
        return f(...args);
      },
    updatePkgVersion:
      (f) =>
      async (...args) => {
        assert(args[0] === (await getPkgId()), "Unexpected pkgId");
        return f(...args);
      },
    revertToVersion: checkProjectIdInFirstArg,
    getProjectRevWithoutData: checkProjectIdInFirstArg,
    listBranchesForProject: checkProjectIdInFirstArg,
    createBranch: checkProjectIdInFirstArg,
    updateBranch: checkProjectIdInFirstArg,
    deleteBranch: checkProjectIdInFirstArg,
    getComments: checkProjectIdInFirstArg,
    postComment: checkProjectIdInFirstArg,
    editComment: checkProjectIdInFirstArg,
    deleteComment: checkProjectIdInFirstArg,
    deleteThread: checkProjectIdInFirstArg,
    updateNotificationSettings: checkProjectIdInFirstArg,
    listAppUsers: checkProjectIdInFirstArg,
    getEndUserRoleInApp: checkProjectIdInFirstArg,
    listAppRoles: checkProjectIdInFirstArg,
    getAppCurrentUserProperties: checkProjectIdInFirstArg,
    getInitialUserToViewAs: checkProjectIdInFirstArg,
    upsertAppCurrentUserOpConfig: checkProjectIdInFirstArg,
    getAppCurrentUserOpConfig: checkProjectIdInFirstArg,
    getDataSourceOpId: checkProjectIdInFirstArg,
    executeDataSourceOperationInCanvas: checkProjectIdInFirstArg,
    executeDataSourceStudioOp: checkProjectIdInFirstArg,
    getDataSourceById:
      (innerGetDataSourceById) =>
      async (
        dataSourceId: string,
        opts: Parameters<typeof apiProxy.getDataSourceById>[1]
      ) => {
        return innerGetDataSourceById(dataSourceId, {
          ...(opts ?? {}),
          // Enforce that the host app doesn't return data source settings
          excludeSettings: true,
        });
      },
    setMainBranchProtection: checkProjectIdInFirstArg,
    whitelistProjectIdToCopy: checkProjectIdInFirstArg,
  };

  // Start with all methods marked as forbidden
  const filtered = Object.fromEntries(
    Object.getOwnPropertyNames(Object.getPrototypeOf(apiProxy)).map((key) => [
      key,
      (..._args: any[]) => {
        throw new Error("unauthorizedMethod " + key);
      },
    ])
  ) as any as Api;

  // Pick the whitelisted methods
  Object.assign(filtered, pick(apiProxy, whitelistedMethods));

  // Assign the validation wrappers
  Object.entries(wrappedMethods).forEach(([key, wrapper]: any) => {
    filtered[key] = wrapper(apiProxy[key]);
  });

  return filtered;
}

export function setUser(user: ApiUser) {
  const { id, email, firstName, lastName } = user;
  const traits = omitNils({
    email,
    firstName,
    lastName,
    createdAt: hackyCast<string>(user.createdAt),
    fullName: fullName(user),
    domain: email.split("@")[1],
  });
  analytics().setUser(id);
  Sentry.configureScope((scope) => {
    scope.setUser({ id, ...traits });
  });
}

export function invalidationKey(method: string, ...args: any[]) {
  return JSON.stringify([method, ...args]);
}

export function apiKey<
  Method extends keyof Api,
  Args extends Api[Method] extends (..._args: any[]) => any
    ? Parameters<Api[Method]>
    : never
>(method: Method, ...args: Args) {
  return invalidationKey(method, ...args);
}
