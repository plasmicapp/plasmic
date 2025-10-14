import { TokenRegistration } from "@plasmicapp/host";
import { CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import registerToken from "@plasmicapp/host/registerToken";
import { CookieConsentProps } from "./types";

const modulePath = "@plasmicpkgs/vanilla-cookieconsent";

export interface Registerable {
  registerToken: typeof registerToken;
}

export function registerTokens(loader?: Registerable) {
  const tokenRegistrations = [
    // Basic colors
    {
      name: "--cc-font-family",
      type: "font-family",
      value: "Inter",
    },
    {
      name: "--cc-bg",
      type: "color",
      value: "#ffffff",
    },
    {
      name: "--cc-primary-color",
      type: "color",
      value: "#2c2f31",
    },
    {
      name: "--cc-secondary-color",
      type: "color",
      value: "#5e6266",
    },

    // Primary button styling
    {
      name: "--cc-btn-primary-bg",
      type: "color",
      value: "#30363c",
    },
    {
      name: "--cc-btn-primary-color",
      type: "color",
      value: "#ffffff",
    },
    {
      name: "--cc-btn-primary-hover-bg",
      type: "color",
      value: "#000000",
    },
    {
      name: "--cc-btn-primary-hover-color",
      type: "color",
      value: "#ffffff",
    },

    // Secondary button styling
    {
      name: "--cc-btn-secondary-bg",
      type: "color",
      value: "#eaeff2",
    },
    {
      name: "--cc-btn-secondary-hover-bg",
      type: "color",
      value: "#d4dae0",
    },
    {
      name: "--cc-btn-secondary-hover-color",
      type: "color",
      value: "#000000",
    },
    {
      name: "--cc-btn-secondary-hover-border-color",
      type: "color",
      value: "#d4dae0",
    },

    // Button border radius
    {
      name: "--cc-btn-border-radius",
      type: "spacing",
      value: "10px",
    },

    // Separator
    {
      name: "--cc-separator-border-color",
      type: "color",
      value: "#f0f4f7",
    },

    // Toggle styling
    {
      name: "--cc-toggle-off-bg",
      type: "color",
      value: "#667481",
    },
    {
      name: "--cc-toggle-on-knob-bg",
      type: "color",
      value: "#ffffff",
    },

    // Toggle readonly
    {
      name: "--cc-toggle-readonly-bg",
      type: "color",
      value: "#d5dee2",
    },
    {
      name: "--cc-toggle-readonly-knob-bg",
      type: "color",
      value: "#ffffff",
    },

    // Cookie category sections
    {
      name: "--cc-cookie-category-block-bg",
      type: "color",
      value: "#f0f4f7",
    },
    {
      name: "--cc-cookie-category-block-border",
      type: "color",
      value: "#f0f4f7",
    },
    {
      name: "--cc-cookie-category-block-hover-bg",
      type: "color",
      value: "#e9eff4",
    },
    {
      name: "--cc-cookie-category-block-hover-border",
      type: "color",
      value: "#e9eff4",
    },
    {
      name: "--cc-cookie-category-expanded-block-bg",
      type: "color",
      value: "transparent",
    },
    {
      name: "--cc-cookie-category-expanded-block-hover-bg",
      type: "color",
      value: "#dee4e9",
    },

    // Overlay and scrollbar
    {
      name: "--cc-overlay-bg",
      type: "color",
      value: "rgba(0, 0, 0, 0.65)",
    },

    // Footer
    {
      name: "--cc-footer-border-color",
      type: "color",
      value: "#e4eaed",
    },
  ].map((token) => ({
    ...token,
    displayName: token.name,
    type: token.type as TokenRegistration["type"],
  }));

  // Register all tokens
  if (loader) {
    tokenRegistrations.forEach((token) => loader.registerToken(token));
  } else {
    tokenRegistrations.forEach((token) => registerToken(token));
  }
}

export const CookieConsentMeta: CodeComponentMeta<CookieConsentProps> = {
  name: "hostless-vanilla-cookieconsent",
  displayName: "Cookie Consent",
  importName: "CookieConsent",
  importPath: modulePath,
  description: "Shows Cookie Consent Banner",
  defaultStyles: {
    maxWidth: "100%",
  },
  props: {
    mode: {
      type: "choice",
      options: ["opt-in", "opt-out"],
      displayName: "Consent Mode",
      description:
        "Changes the scripts' activation logic when consent is not valid. opt-in: scripts will run only if the user accepts that category (GDPR compliant). opt-out: scripts will run automatically (not GDPR compliant).",
      defaultValue: "opt-in",
    },
    revision: {
      type: "number",
      displayName: "Revision",
      description:
        "Manages consent revisions; useful if you'd like to ask your users again for consent after a change in your cookie/privacy policy",
      defaultValue: 0,
    },
    autoShow: {
      type: "boolean",
      displayName: "Auto Show",
      description:
        "Automatically show the consent modal if consent is not valid",
      defaultValue: true,
    },
    disablePageInteraction: {
      type: "boolean",
      displayName: "Disable Page Interaction",
      description:
        "Creates a dark overlay and blocks the page scroll until consent is expressed",
      defaultValue: false,
    },
    hideFromBots: {
      type: "boolean",
      displayName: "Hide From Bots",
      description:
        "Stops the plugin's execution when a bot/crawler is detected, to prevent them from indexing the modal's content",
      defaultValue: true,
    },
    cookieName: {
      type: "string",
      displayName: "Cookie Name",
      description: "Name of the consent cookie",
      defaultValue: "cc_cookie",
    },
    cookieDomain: {
      type: "string",
      displayName: "Cookie Domain",
      description:
        "Current domain/subdomain's name, retrieved automatically if left empty",
    },
    cookiePath: {
      type: "string",
      displayName: "Cookie Path",
      description: "Path for the consent cookie",
      defaultValue: "/",
    },
    cookieSecure: {
      type: "boolean",
      displayName: "Cookie Secure",
      description:
        "Toggle the secure flag (won't be set if there is no https connection)",
      defaultValue: true,
    },
    cookieExpiresAfterDays: {
      type: "number",
      displayName: "Cookie Expires After Days",
      description: "Number of days before the cookie expires",
      defaultValue: 182,
    },
    cookieSameSite: {
      type: "choice",
      options: ["Lax", "Strict", "None"],
      displayName: "Cookie SameSite",
      description: "SameSite attribute for the consent cookie",
      defaultValue: "Lax",
    },
    cookieUseLocalStorage: {
      type: "boolean",
      displayName: "Use Local Storage",
      description:
        "Store the value of the cookie in localStorage (ignores domain, path, sameSite when enabled)",
      defaultValue: false,
    },
    consentModal: {
      type: "object",
      displayName: "Consent Modal",
      description: "Configuration for the consent modal",
      defaultValue: {
        layout: "cloud inline",
        position: "bottom center",
        equalWeightButtons: true,
        title: "We use cookies",
        description: "Description text for the consent modal",
        acceptAllBtn: "Accept all",
        acceptNecessaryBtn: "Reject all",
        showPreferencesBtn: "Manage Individual Preferences",
        closeIconLabel: "Close",
        revisionMessage: "",
        footer:
          '<a href="#path-to-impressum.html" target="_blank">Impressum</a><a href="#path-to-privacy-policy.html" target="_blank">Privacy Policy</a>',
      },
      fields: {
        layout: {
          type: "choice",
          options: ["cloud", "cloud inline", "box", "bar"],
          displayName: "Layout",
          description: "Layout style for the consent modal",
        },
        position: {
          type: "choice",
          options: [
            "top",
            "bottom",
            "top left",
            "top center",
            "top right",
            "bottom left",
            "bottom center",
            "bottom right",
          ],
          displayName: "Position",
          description: "Position of the consent modal",
        },
        equalWeightButtons: {
          type: "boolean",
          displayName: "Equal Weight Buttons",
          description: "Make buttons in consent modal equal weight",
        },
        flipButtons: {
          type: "boolean",
          displayName: "Flip Buttons",
          description: "Flip button order in consent modal",
        },
        title: {
          type: "string",
          displayName: "Title",
          description: "Title text for the consent modal",
        },
        description: {
          type: "string",
          displayName: "Description",
          description: "Description text for the consent modal",
        },
        acceptAllBtn: {
          type: "string",
          displayName: "Accept All Button Text",
          description: "Text for the accept all button",
        },
        acceptNecessaryBtn: {
          type: "string",
          displayName: "Accept Necessary Button Text",
          description: "Text for the accept necessary button",
        },
        showPreferencesBtn: {
          type: "string",
          displayName: "Show Preferences Button Text",
          description: "Text for the show preferences button",
        },
        closeIconLabel: {
          type: "string",
          displayName: "Close Icon Label",
          description:
            "If specified, a big X button will be generated (visible only in box layout). Acts the same as acceptNecessaryBtn",
        },
        revisionMessage: {
          type: "string",
          displayName: "Revision Message",
          description: "Message shown when there's a revision change",
        },
        footer: {
          type: "string",
          displayName: "Footer",
          description:
            "A small area where you can place your links (impressum, privacy policy, etc.) - allows HTML markup",
        },
      },
    },
    preferencesModal: {
      type: "object",
      displayName: "Preferences Modal",
      description: "Configuration for the preferences modal",
      defaultValue: {
        layout: "box",
        equalWeightButtons: true,
        flipButtons: false,
        title: "Manage cookie preferences",
        acceptAllBtn: "Accept all",
        acceptNecessaryBtn: "Reject all",
        savePreferencesBtn: "Accept current selection",
        closeIconLabel: "Close modal",
        serviceCounterLabel: "Service|Services",
      },
      fields: {
        layout: {
          type: "choice",
          options: ["box", "bar"],
          displayName: "Layout",
          description: "Layout style for the preferences modal",
        },
        equalWeightButtons: {
          type: "boolean",
          displayName: "Equal Weight Buttons",
          description: "Make buttons in preferences modal equal weight",
        },
        flipButtons: {
          type: "boolean",
          displayName: "Flip Buttons",
          description: "Flip button order in preferences modal",
        },
        title: {
          type: "string",
          displayName: "Title",
          description: "Title text for the preferences modal",
        },
        acceptAllBtn: {
          type: "string",
          displayName: "Accept All Button Text",
          description: "Text for the accept all button in preferences modal",
        },
        acceptNecessaryBtn: {
          type: "string",
          displayName: "Accept Necessary Button Text",
          description:
            "Text for the accept necessary button in preferences modal",
        },
        savePreferencesBtn: {
          type: "string",
          displayName: "Save Preferences Button Text",
          description: "Text for the save preferences button",
        },
        closeIconLabel: {
          type: "string",
          displayName: "Close Icon Label",
          description: "Label for the close icon",
        },
        serviceCounterLabel: {
          type: "string",
          displayName: "Service Counter Label",
          description: "Label for service counter (singular|plural)",
        },
      },
    },
    necessaryEnabled: {
      type: "boolean",
      displayName: "Necessary Category Enabled",
      description: "Enable the necessary category by default",
      defaultValue: true,
    },
    necessaryReadOnly: {
      type: "boolean",
      displayName: "Necessary Category Read Only",
      description: "Make the necessary category read-only (cannot be disabled)",
      defaultValue: true,
    },
    analyticsEnabled: {
      type: "boolean",
      displayName: "Analytics Category Enabled",
      description: "Enable the analytics category by default",
      defaultValue: false,
    },
    analyticsAutoClearCookies: {
      type: "string",
      displayName: "Analytics Auto Clear Cookies",
      description:
        "Comma-separated list of cookie names to auto-clear (supports regex patterns)",
      defaultValue: "_ga,_gid",
    },
    adsEnabled: {
      type: "boolean",
      displayName: "Ads Category Enabled",
      description: "Enable the ads category by default",
      defaultValue: false,
    },
    languageDefault: {
      type: "string",
      displayName: "Default Language",
      description: "The desired default language",
      defaultValue: "en",
    },
    languageAutoDetect: {
      type: "choice",
      options: ["document", "browser"],
      displayName: "Language Auto Detect",
      description:
        "Set the current language dynamically. 'document': retrieve language from the lang attribute. 'browser': retrieve the user's browser language",
    },
    languageRtl: {
      type: "string",
      displayName: "RTL Languages",
      description:
        "List of languages that should use the RTL layout (comma-separated)",
    },
    onFirstConsent: {
      type: "eventHandler",
      displayName: "On First Consent",
      description: "Event handler called when user gives first consent",
      argTypes: [
        {
          name: "cookie",
          type: "object",
        },
      ],
    },
    onConsent: {
      type: "eventHandler",
      displayName: "On Consent",
      description: "Event handler called when user gives consent",
      argTypes: [
        {
          name: "cookie",
          type: "object",
        },
      ],
    },
    onChange: {
      type: "eventHandler",
      displayName: "On Change",
      description: "Event handler called when consent categories change",
      argTypes: [
        {
          name: "changedCategories",
          type: "object",
        },
        {
          name: "changedServices",
          type: "object",
        },
      ],
    },
    onModalReady: {
      type: "eventHandler",
      displayName: "On Modal Ready",
      description: "Event handler called when modal is ready",
      argTypes: [
        {
          name: "modalName",
          type: "string",
        },
      ],
    },
    onModalShow: {
      type: "eventHandler",
      displayName: "On Modal Show",
      description: "Event handler called when modal is shown",
      argTypes: [
        {
          name: "modalName",
          type: "string",
        },
      ],
    },
    onModalHide: {
      type: "eventHandler",
      displayName: "On Modal Hide",
      description: "Event handler called when modal is hidden",
      argTypes: [
        {
          name: "modalName",
          type: "string",
        },
      ],
    },
    sections: {
      type: "array",
      displayName: "Preferences Modal Sections",
      description: "Sections to display in the preferences modal",
      itemType: {
        nameFunc: (item) => item?.title,
        type: "object",
        fields: {
          title: {
            type: "string",
            displayName: "Section Title",
            description: "Title of the section",
          },
          description: {
            type: "string",
            displayName: "Section Description",
            description: "Description text for the section",
          },
          linkedCategory: {
            type: "string",
            displayName: "Linked Category",
            description:
              "Category name to link this section to (e.g., 'necessary', 'analytics', 'ads')",
          },
          cookieTable: {
            type: "object",
            displayName: "Cookie Table",
            description: "Cookie table configuration for this section",
            fields: {
              caption: {
                type: "string",
                displayName: "Table Caption",
                description: "Caption for the cookie table",
              },
              headers: {
                type: "object",
                displayName: "Table Headers",
                description: "Headers for the cookie table",
                fields: {
                  name: {
                    type: "string",
                    displayName: "Name Header",
                    description: "Header for cookie name column",
                  },
                  domain: {
                    type: "string",
                    displayName: "Domain Header",
                    description: "Header for domain column",
                  },
                  desc: {
                    type: "string",
                    displayName: "Description Header",
                    description: "Header for description column",
                  },
                },
              },
              body: {
                type: "array",
                displayName: "Table Body",
                description: "Rows in the cookie table",
                itemType: {
                  type: "object",
                  nameFunc: (item) => item?.name || item?.domain,
                  fields: {
                    name: {
                      type: "string",
                      displayName: "Cookie Name",
                      description: "Name of the cookie",
                    },
                    domain: {
                      type: "string",
                      displayName: "Domain",
                      description: "Domain where the cookie is set",
                    },
                    desc: {
                      type: "string",
                      displayName: "Description",
                      description: "Description of what the cookie does",
                    },
                  },
                },
              },
            },
          },
        },
      },
      defaultValue: [
        {
          title: "Your Privacy Choices",
          description:
            'In this panel you can express some preferences related to the processing of your personal information. You may review and change expressed choices at any time by resurfacing this panel via the provided link. To deny your consent to the specific processing activities described below, switch the toggles to off or use the "Reject all" button and confirm you want to save your choices.',
        },
        {
          title: "Strictly Necessary",
          description:
            "These cookies are essential for the proper functioning of the website and cannot be disabled.",
          linkedCategory: "necessary",
        },
        {
          title: "Performance and Analytics",
          description:
            "These cookies collect information about how you use our website. All of the data is anonymized and cannot be used to identify you.",
          linkedCategory: "analytics",
          cookieTable: {
            caption: "Cookie table",
            headers: {
              name: "Cookie",
              domain: "Domain",
              desc: "Description",
            },
            body: [
              {
                name: "_ga",
                domain: "example.com",
                desc: "Description 1",
              },
              {
                name: "_gid",
                domain: "example.com",
                desc: "Description 2",
              },
            ],
          },
        },
        {
          title: "Targeting and Advertising",
          description:
            "These cookies are used to make advertising messages more relevant to you and your interests. The intention is to display ads that are relevant and engaging for the individual user and thereby more valuable for publishers and third party advertisers.",
          linkedCategory: "ads",
        },
        {
          title: "More information",
          description:
            'For any queries in relation to my policy on cookies and your choices, please <a href="#contact-page">contact us</a>',
        },
      ],
    },
    services: {
      type: "array",
      displayName: "Analytics Services",
      description: "Services to display in the analytics category",
      itemType: {
        type: "object",
        nameFunc: (item) => item?.label || item?.key,
        fields: {
          key: {
            type: "string",
            displayName: "Service Key",
            description:
              "Unique identifier for the service (e.g., 'ga', 'youtube')",
          },
          label: {
            type: "string",
            displayName: "Service Label",
            description: "Display name for the service",
          },
          onAccept: {
            type: "eventHandler",
            displayName: "On Accept",
            description: "Event handler called when user accepts this service",
            argTypes: [],
          },
          onReject: {
            type: "eventHandler",
            displayName: "On Reject",
            description: "Event handler called when user rejects this service",
            argTypes: [],
          },
        },
      },
      defaultValue: [
        {
          key: "ga",
          label: "Google Analytics",
        },
        {
          key: "youtube",
          label: "Youtube Embed",
        },
      ],
    },
  },
};
