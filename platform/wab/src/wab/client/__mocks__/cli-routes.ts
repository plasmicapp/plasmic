import { History } from "history";
import L from "lodash";

const formatRoute: any = () => {};

export class R<T> {
  constructor(public pattern: string) {}
  fill(params: T): string {
    return formatRoute(this.pattern, params);
  }
}

export class RouteSet {
  dashboard = new R<{}>("/");
  login = new R<{}>("/login");
  resetPassword = new R<{}>("/reset-password");
  register = new R<{}>("/register");
  site = new R<{ siteId: string }>("/site/:siteId");
  components = new R<{ siteId: string }>(`${this.site.pattern}/components`);
  pages = new R<{ siteId: string }>(`${this.site.pattern}/pages`);
  db = new R<{ siteId: string }>(`${this.site.pattern}/db`);
  tables = new R<{ siteId: string }>(`${this.db.pattern}/tables`);
  table = new R<{ siteId: string; tableId: string }>(
    `${this.tables.pattern}/:tableId`
  );
  tableSettings = new R<{ siteId: string; tableId: string }>(
    `${this.table.pattern}/settings`
  );
  tableData = new R<{ siteId: string; tableId: string }>(
    `${this.table.pattern}/data`
  );
  siteSettings = new R<{ siteId: string }>(`${this.site.pattern}/settings`);
  canvas = new R<{ pageId: string }>(`/page/:pageId/canvas`);
  componentCanvas = new R<{ componentAddr: string }>(
    `/component/:componentAddr/canvas`
  );
  rels = new R<{ siteId: string }>(`${this.db.pattern}/rels`);
  rel = new R<{ siteId: string; relId: string }>(`${this.rels.pattern}/:relId`);
}

export const UU = new RouteSet();

export const U = L.mapValues(UU, <T>(v: R<T>) => (params: T) => v.fill(params));

export class Router {
  constructor(public history: History) {}
  routeTo(path: string) {
    this.history.push(path);
  }
}
