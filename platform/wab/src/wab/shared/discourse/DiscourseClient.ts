export enum PermissionType {
  CREATE = 1, // FULL
  REPLY = 2, // CREATE_POST
  SEE = 3, // READONLY
}

export type GroupPermissionsMutation = { [group_name: string]: PermissionType };
export type GroupPermissions = {
  group_name: string;
  permission_type: PermissionType;
}[];

export enum GroupVisibilityLevel {
  PUBLIC = 0,
  LOGGED_ON_USERS = 1,
  MEMBERS = 2,
  STAFF = 3,
  OWNERS = 4,
}

export enum GroupAliasLevel {
  NOBODY = 0,
  ONLY_ADMINS = 1,
  MODS_AND_ADMINS = 2,
  MEMBERS_MODS_AND_ADMINS = 3,
  OWNERS_MODS_AND_ADMINS = 4,
  EVERYONE = 99,
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  group_permissions: GroupPermissions;
  topic_url: string;
}

export interface CategoryMutation {
  name?: string;
  slug?: string;
  parent_category_id?: number;
  color?: string;
  text_color?: string;
  permissions?: GroupPermissionsMutation;
  custom_fields?: {
    enable_accepted_answers?: "true"; // Discourse Solved
    enable_unassigned_filter?: "true"; // Discourse Assign
  };
}

export interface Group {
  id: number;
  name: string;
  is_group_owner: boolean;
  is_group_user: boolean;
}

export interface GroupMutation {
  name?: string;
  full_name?: string;
  members_visibility_level?: GroupVisibilityLevel;
  mentionable_level?: GroupAliasLevel;
  messageable_level?: GroupAliasLevel;
  visibility_level?: GroupVisibilityLevel;
}

export interface Invite {
  id: number;
  link: string;
}

export interface Post {
  id: number;
  username: string;
  raw: string;
  version: number;
}

export interface PostRevision {
  post_id: number;
  current_revision: number;
  current_hidden: boolean;
}

export interface PostMutation {
  raw: string;
  edit_reason?: string;
}

export interface Site {
  groups: Group[];
  categories: Category[];
}

export interface Topic {
  id: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  groups: Group[];
}

export class DiscourseHttpError {
  constructor(
    readonly url: string,
    readonly status: number,
    readonly statusText: string,
    readonly body: string
  ) {}
}

/**
 * Discourse base API client
 */
class DiscourseApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly apiUsername: string
  ) {}

  /** https://docs.discourse.org/#tag/Categories/operation/getCategory */
  async categoryGet(id: number): Promise<{ category: Category }> {
    return this.httpGet(`/c/${id}/show.json`);
  }
  /** https://docs.discourse.org/#tag/Categories/operation/createCategory */
  async categoryCreate(
    data: CategoryMutation & { name: string }
  ): Promise<{ category: Category }> {
    return this.httpPost(`/categories.json`, data);
  }
  /** https://docs.discourse.org/#tag/Categories/operation/updateCategory */
  async categoryUpdate(
    id: number,
    data: CategoryMutation
  ): Promise<{ category: Category }> {
    return this.httpPut(`/categories/${id}.json`, data);
  }

  /** https://docs.discourse.org/#tag/Groups/operation/getGroup */
  async groupGet(name: string): Promise<{ group: Group }> {
    return this.httpGet(`/groups/${name}.json`);
  }
  /** https://docs.discourse.org/#tag/Groups/operation/createGroup */
  async groupCreate(data: {
    group: GroupMutation & { name: string };
  }): Promise<{ basic_group: Group }> {
    return this.httpPost(`/admin/groups.json`, data);
  }
  /** https://docs.discourse.org/#tag/Groups/operation/updateGroup */
  async groupUpdate(
    id: number,
    data: {
      group: GroupMutation;
    }
  ): Promise<{ success: "OK" }> {
    return this.httpPut(`/groups/${id}.json`, data);
  }
  /** https://docs.discourse.org/#tag/Groups/operation/addGroupMembers */
  async groupAddMembers(
    id: number,
    data: {
      usernames: string;
    }
  ): Promise<{ success: string }> {
    return this.httpPut(`/groups/${id}/members.json`, data);
  }
  /** https://docs.discourse.org/#tag/Groups/operation/removeGroupMembers */
  async groupRemoveMembers(
    id: number,
    data: {
      usernames: string;
    }
  ): Promise<{ success: string }> {
    return this.httpDelete(`/groups/${id}/members.json`, data);
  }
  /** undocumented */
  async groupAddOwners(
    id: number,
    data: {
      usernames: string;
    }
  ): Promise<{ success: string }> {
    return this.httpPut(`/groups/${id}/owners.json`, data);
  }
  /** undocumented */
  async groupRemoveOwners(
    id: number,
    data: {
      user_id: number;
    }
  ): Promise<{ success: string }> {
    return this.httpDelete(`/groups/${id}/owners.json`, data);
  }

  /** https://docs.discourse.org/#tag/Invites/operation/createInvite */
  async inviteCreate(data: {
    email?: string;
    skip_email?: boolean;
    custom_message?: string;
    max_redemptions_allowed?: number;
    topic_id?: number;
    group_ids?: string[];
    group_names?: string[];
    expires_at?: string;
  }): Promise<Invite> {
    return this.httpPost(`/invites.json`, data);
  }

  /** https://docs.discourse.org/#tag/Posts/operation/getPost */
  async postGet(id: number): Promise<Post> {
    return this.httpGet(`/posts/${id}.json`);
  }
  /** https://docs.discourse.org/#tag/Posts/operation/updatePost */
  async postUpdate(
    id: number,
    data: {
      post: PostMutation;
    }
  ): Promise<{ post: Post }> {
    return this.httpPut(`/posts/${id}.json`, data);
  }

  /** undocumented */
  async postRevisionGetLatest(id: number): Promise<PostRevision> {
    return this.httpGet(`/posts/${id}/revisions/latest.json`);
  }
  /** undocumented */
  async postRevisionHide(id: number, revisionId: number): Promise<void> {
    return this.httpPut(`/posts/${id}/revisions/${revisionId}/hide`, undefined);
  }
  /** undocumented */
  async postRevisionShow(id: number, revisionId: number): Promise<void> {
    return this.httpPut(`/posts/${id}/revisions/${revisionId}/show`, undefined);
  }

  /** https://docs.discourse.org/#tag/Search/operation/search */
  async search(q: string): Promise<{
    posts: {
      id: number;
      topic_id: number;
      username: string;
    }[];
  }> {
    return this.httpGet(`/search.json?q=${encodeURIComponent(q)}`);
  }

  /** https://docs.discourse.org/#tag/Site/operation/getSite */
  async site(): Promise<Site> {
    return this.httpGet(`/site.json`);
  }

  /** https://docs.discourse.org/#tag/Topics/operation/updateTopic */
  async topicUpdate(
    id: number,
    data: { title?: string; category_id?: string }
  ): Promise<{ basic_topic: Topic }> {
    return this.httpPut(`/t/-/${id}.json`, data);
  }

  /** https://docs.discourse.org/#tag/Users/operation/getUserExternalId */
  async userGetByExternalId(externalId: string): Promise<{ user: User }> {
    return this.httpGet(`/u/by-external/${externalId}.json`);
  }

  private async httpGet<T>(endpoint: string): Promise<T> {
    return this.http("get", endpoint, undefined);
  }

  private async httpPost<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    return this.http("post", endpoint, data);
  }

  private async httpPut<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    return this.http("put", endpoint, data);
  }

  private async httpDelete<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    return this.http("delete", endpoint, data);
  }

  private async http<T>(
    method: string,
    endpoint: string,
    data: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Api-Key": this.apiKey,
        "Api-Username": this.apiUsername,
        "Content-Type": "application/json",
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });

    if (!response.ok) {
      throw new DiscourseHttpError(
        url,
        response.status,
        response.statusText,
        await response.text()
      );
    }

    return await response.json();
  }
}

/**
 * Discourse high-level client
 */
export class DiscourseClient extends DiscourseApiClient {
  constructor(baseUrl: string, apiKey: string, apiUsername: string) {
    super(baseUrl, apiKey, apiUsername);
  }

  async categoryAppendGroupPermissions(
    id: number,
    newPermissions: GroupPermissionsMutation
  ): Promise<Category> {
    const category = (await this.categoryGet(id)).category;
    const currentPermissions = Object.fromEntries(
      category.group_permissions.map(({ group_name, permission_type }) => [
        group_name,
        permission_type,
      ])
    );
    return (
      await this.categoryUpdate(id, {
        permissions: {
          ...currentPermissions,
          ...newPermissions,
        },
      })
    ).category;
  }
}
