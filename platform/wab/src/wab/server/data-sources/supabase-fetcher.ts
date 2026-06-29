import { base64StringToBuffer } from "@/wab/server/data-sources/data-utils";
import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { SupabaseDataSource } from "@/wab/shared/data-sources-meta/supabase-meta";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function makeSupabaseFetcher(source: SupabaseDataSource) {
  return new SupabaseFetcher(source);
}

export class SupabaseFetcher {
  private supabaseClient: SupabaseClient;
  constructor(source: SupabaseDataSource) {
    this.supabaseClient = createClient(
      source.settings.url,
      source.credentials.apiKey
    );
  }

  async uploadFile(opts: {
    bucket: string;
    path: string;
    content: string;
    contentType: string;
    upsert?: boolean;
  }) {
    const res = await this.supabaseClient.storage
      .from(opts.bucket)
      .upload(opts.path, base64StringToBuffer(opts.content), {
        contentType: opts.contentType,
        upsert: opts.upsert,
      });
    if (res.error) {
      throw new DataSourceError(
        res.error.message,
        (res.error as any).statusCode
      );
    }
    return res.data;
  }

  async getSignedFileUrl(opts: {
    bucket: string;
    path: string;
    expiresIn: number;
    download?: boolean;
  }) {
    const res = await this.supabaseClient.storage
      .from(opts.bucket)
      .createSignedUrl(opts.path, opts.expiresIn, {
        download: opts.download,
      });
    return res.data;
  }
}
