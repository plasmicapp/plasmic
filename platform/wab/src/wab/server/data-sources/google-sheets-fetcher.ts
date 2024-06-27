import { assert, ensure, withoutNils } from "@/wab/shared/common";
import {
  SqlalchemyClient,
  SQLITE_TO_BUILDER_TYPE,
} from "@/wab/server/data-sources/pybackend-client/pybackend-client";
import { getDefaultConnection } from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { TokenData } from "@/wab/server/entities/Entities";
import {
  getGoogleSheetsClientId,
  getGoogleSheetsClientSecret,
} from "@/wab/server/secrets";
import { GoogleSheetsDataSource } from "@/wab/shared/data-sources-meta/google-sheets-meta";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import { google, sheets_v4 } from "googleapis";
import refresh from "passport-oauth2-refresh";
import { Connection } from "typeorm";

export async function makeGoogleSheetsFetcher(
  dbCon: Connection,
  source: GoogleSheetsDataSource
) {
  return new GoogleSheetsImpl(dbCon, source).createFetcher();
}

export class GoogleSheetsImpl {
  private tokenData: TokenData;
  private sheetsClient: sheets_v4.Sheets;
  private sqlalchemy: SqlalchemyClient;

  constructor(
    private dbCon: Connection,
    private source: GoogleSheetsDataSource
  ) {
    this.sqlalchemy = new SqlalchemyClient(
      this.methodWrapper.bind(this),
      {
        dburi: "shillelagh://",
      },
      this.getSchema.bind(this),
      (resource) => this.makeSheetUrl(resource)
    );
  }

  async createFetcher() {
    await this.getAndCacheSheetsCredentials();
    this.sqlalchemy.setEngineKwargs({
      adapters: ["gsheetsapi"],
      adapter_kwargs: {
        gsheetsapi: { access_token: this.tokenData.accessToken },
      },
    });
    return this.sqlalchemy.createFetcher();
  }

  private async getAndCacheSheetsCredentials() {
    if (this.tokenData && this.sheetsClient) {
      return;
    }
    const maybeTokenData = await this.dbCon.transaction((em) => {
      const dbMgr = new DbMgr(em, SUPER_USER);
      return dbMgr.getOauthTokenById(this.source.credentials.credentials);
    });
    assert(maybeTokenData, "OAuth token should not be undefined");
    this.tokenData = maybeTokenData.token;

    const oAuth2Client = new google.auth.OAuth2({
      clientId: getGoogleSheetsClientId(),
      clientSecret: getGoogleSheetsClientSecret(),
    });
    oAuth2Client.setCredentials({
      refresh_token: this.tokenData.refreshToken,
      access_token: this.tokenData.accessToken,
    });
    this.sheetsClient = google.sheets({ version: "v4", auth: oAuth2Client });
  }

  async getSchema(): Promise<DataSourceSchema> {
    return this.methodWrapper(async () => {
      const metadata = await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.source.settings.spreadsheetId,
      });

      const sheets = metadata.data.sheets ?? [];

      const result = await this.sqlalchemy.executeOp({
        op: "inspect",
        inspectTables: sheets.map((sh) =>
          this.makeSheetUrl(ensure(sh.properties?.sheetId, ""))
        ),
      });

      // Can fail to extract for some sheets, so omit them as tables.
      return {
        tables: withoutNils(
          sheets.map((sh) => {
            const schema =
              result[this.makeSheetUrl(ensure(sh.properties?.sheetId, ""))];
            if (!schema) {
              return undefined;
            }
            return {
              id: ensure(
                sh.properties?.sheetId?.toString(),
                () => `Failed to get sheet ID`
              ),

              label: sh.properties?.title?.toString(),
              fields: schema.map((col) => ({
                id: col.name,
                label: col.name,
                type: SQLITE_TO_BUILDER_TYPE[col.type] ?? "unknown",
                readOnly: false,
              })),
            };
          })
        ),
      };
    });
  }

  private makeSheetUrl(sheetId: number | string) {
    return `https://docs.google.com/spreadsheets/d/${this.source.settings.spreadsheetId}/edit?headers=1#gid=${sheetId}`;
  }

  private async methodWrapper(req: () => Promise<any>) {
    await this.getAndCacheSheetsCredentials();
    return tryAndRefresh(
      req,
      this.source.credentials.credentials,
      this.tokenData,
      (newTokens) => {
        this.tokenData = newTokens;

        const oAuth2Client = new google.auth.OAuth2();
        oAuth2Client.setCredentials({
          refresh_token: this.tokenData.refreshToken,
          access_token: this.tokenData.accessToken,
        });
        this.sheetsClient = google.sheets({
          version: "v4",
          auth: oAuth2Client,
        });
      }
    );
  }
}

async function tryAndRefresh(
  req: () => Promise<any>,
  oauthTokenId: string,
  token: TokenData,
  resolve?: (newTokens: TokenData) => void
) {
  try {
    const data = await req();
    return data;
  } catch (e) {
    if (!e.code || e.code !== 401) {
      throw e;
    }
    const newTokens = await refreshAndUpdateToken(oauthTokenId, token);
    if (!newTokens) {
      throw e;
    }
    resolve?.(newTokens);
    return req();
  }
}

async function refreshAndUpdateToken(oauthTokenId: string, token: TokenData) {
  return new Promise<TokenData | undefined>((resolve) =>
    refresh.requestNewAccessToken(
      "google-sheets",
      token.refreshToken,
      async (err, accessToken) => {
        if (err) {
          resolve(undefined);
          return;
        }

        const conn = await getDefaultConnection();
        await conn.transaction(async (em) => {
          const mgr = new DbMgr(em, SUPER_USER);
          await mgr.refreshOauthTokenById(oauthTokenId, {
            accessToken,
            refreshToken: token.refreshToken,
          });
        });

        await resolve({ accessToken, refreshToken: token.refreshToken });
      }
    )
  );
}
