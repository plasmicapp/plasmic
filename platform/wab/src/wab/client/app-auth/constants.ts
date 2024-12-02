export const APP_AUTH_TRACKING_EVENT = "app-auth";
export const LOGGED_APP_USER_STORAGE_KEY = "view-as.logged-app-user";

export const storageViewAsKey = (appId: string) =>
  `${LOGGED_APP_USER_STORAGE_KEY}.${appId}`;
