import { CookieValue, Section, Service } from "vanilla-cookieconsent";

type PlasmicCanvasProps = {
  plasmicNotifyAutoOpenedContent?: () => void;
  __plasmic_selection_prop__?: {
    isSelected: boolean;
    selectedSlotName?: string;
  };
};

export interface CookieConsentProps extends PlasmicCanvasProps {
  // Mode and revision
  mode: "opt-in" | "opt-out";
  revision?: number;
  // Auto show settings
  autoShow?: boolean;
  disablePageInteraction?: boolean;
  hideFromBots?: boolean;
  // Cookie settings
  cookieName?: string;
  cookieDomain?: string;
  cookiePath?: string;
  cookieSecure?: boolean;
  cookieExpiresAfterDays?: number;
  cookieSameSite?: "Lax" | "Strict" | "None";
  cookieUseLocalStorage?: boolean;
  // GUI Options
  consentModal: {
    layout?: "cloud" | "cloud inline" | "box" | "bar";
    position?:
      | "top"
      | "bottom"
      | "top left"
      | "top center"
      | "top right"
      | "bottom left"
      | "bottom center"
      | "bottom right";
    equalWeightButtons?: boolean;
    flipButtons?: boolean;
    title?: string;
    description?: string;
    acceptAllBtn?: string;
    acceptNecessaryBtn?: string;
    showPreferencesBtn?: string;
    closeIconLabel?: string;
    revisionMessage?: string;
    footer?: string;
  };
  preferencesModal: {
    layout?: "box" | "bar";
    equalWeightButtons?: boolean;
    flipButtons?: boolean;
    title?: string;
    acceptAllBtn?: string;
    acceptNecessaryBtn?: string;
    savePreferencesBtn?: string;
    closeIconLabel?: string;
    serviceCounterLabel?: string;
  };
  // Categories
  necessaryEnabled?: boolean;
  necessaryReadOnly?: boolean;
  analyticsEnabled?: boolean;
  analyticsAutoClearCookies?: string;
  adsEnabled?: boolean;
  // Language
  languageDefault: string;
  languageAutoDetect?: "document" | "browser";
  languageRtl?: string;
  // Callbacks
  onFirstConsent?: (cookie: CookieValue) => void;
  onConsent?: (cookie: CookieValue) => void;
  onChange?: (
    changedCategories: string[],
    changedServices: { [category: string]: string[] },
    cookie: CookieValue
  ) => void;
  onModalReady?: (modalName: string) => void;
  onModalShow?: (modalName: string) => void;
  onModalHide?: (modalName: string) => void;
  // Sections
  sections: Section[];
  // Services
  services: ({ key: string } & Service)[];
}
