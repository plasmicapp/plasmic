import {
  usePlasmicCanvasComponentInfo,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import React from "react";
import * as ConsentApi from "vanilla-cookieconsent";

import { CookieConsentProps } from "./types";

export function CookieConsent(props: CookieConsentProps) {
  const {
    mode,
    revision,
    autoShow,
    disablePageInteraction,
    hideFromBots,
    cookieName,
    cookieDomain,
    cookiePath,
    cookieSecure,
    cookieExpiresAfterDays,
    cookieSameSite,
    cookieUseLocalStorage,
    consentModal,
    preferencesModal,
    necessaryEnabled,
    necessaryReadOnly,
    analyticsEnabled,
    analyticsAutoClearCookies,
    adsEnabled,
    languageDefault,
    languageAutoDetect,
    languageRtl,
    onFirstConsent,
    onConsent,
    onChange,
    onModalReady,
    onModalShow,
    onModalHide,
    sections,
    services,
    plasmicNotifyAutoOpenedContent,
  } = props;
  const inPlasmicCanvas = usePlasmicCanvasContext();
  const isSelected =
    usePlasmicCanvasComponentInfo?.(props)?.isSelected ?? false;

  React.useEffect(() => {
    if (!isSelected && inPlasmicCanvas) {
      ConsentApi.reset(true);
      return;
    }
    plasmicNotifyAutoOpenedContent?.();

    // Parse analytics auto-clear cookies
    const analyticsAutoClearCookiesArray =
      analyticsAutoClearCookies
        ?.split(",")
        ?.map((cookie) => cookie.trim())
        ?.filter((cookie) => cookie.length > 0)
        ?.map((cookie) => ({
          name:
            cookie.startsWith("/") && cookie.endsWith("/")
              ? new RegExp(cookie.slice(1, -1))
              : cookie,
        })) || [];

    const config: ConsentApi.CookieConsentConfig = {
      root: "#plasmic-cookie-consent",
      mode,
      revision,
      autoShow,
      disablePageInteraction,
      hideFromBots,
      cookie: {
        name: cookieName,
        domain: cookieDomain || window?.location?.hostname,
        path: cookiePath,
        secure: cookieSecure,
        expiresAfterDays: cookieExpiresAfterDays,
        sameSite: cookieSameSite,
        useLocalStorage: cookieUseLocalStorage,
      },
      guiOptions: {
        consentModal: {
          layout: consentModal?.layout,
          position: consentModal?.position,
          equalWeightButtons: consentModal?.equalWeightButtons,
          flipButtons: consentModal?.flipButtons,
        },
        preferencesModal: {
          layout: preferencesModal?.layout,
          equalWeightButtons: preferencesModal?.equalWeightButtons,
          flipButtons: preferencesModal?.flipButtons,
        },
      },
      onFirstConsent: ({ cookie }) => {
        onFirstConsent?.(cookie);
      },
      onConsent: ({ cookie }) => {
        onConsent?.(cookie);
      },
      onChange: ({ changedCategories, changedServices, cookie }) => {
        onChange?.(changedCategories, changedServices, cookie);
      },
      onModalReady: ({ modalName }) => {
        onModalReady?.(modalName);
      },
      onModalShow: ({ modalName }) => {
        onModalShow?.(modalName);
      },
      onModalHide: ({ modalName }) => {
        onModalHide?.(modalName);
      },
      categories: {
        necessary: {
          enabled: necessaryEnabled,
          readOnly: necessaryReadOnly,
        },
        analytics: {
          enabled: analyticsEnabled,
          autoClear: {
            cookies: analyticsAutoClearCookiesArray,
          },
          services: services?.reduce((acc, service) => {
            acc[service.key] = {
              label: service.label || service.key,
              onAccept: service.onAccept || (() => {}),
              onReject: service.onReject || (() => {}),
            };
            return acc;
          }, {} as Record<string, ConsentApi.Service>),
        },
        ads: {
          enabled: adsEnabled,
        },
      },
      language: {
        default: languageDefault,
        autoDetect: languageAutoDetect,
        rtl: languageRtl,
        translations: {
          [languageDefault || "en"]: {
            consentModal,
            preferencesModal: {
              ...preferencesModal,
              sections: sections,
            },
          },
        },
      },
    };

    ConsentApi.run(config);

    return () => {
      ConsentApi.reset();
    };
  }, [
    mode,
    revision,
    autoShow,
    disablePageInteraction,
    hideFromBots,
    cookieName,
    cookieDomain,
    cookiePath,
    cookieSecure,
    cookieExpiresAfterDays,
    cookieSameSite,
    cookieUseLocalStorage,
    consentModal,
    preferencesModal,
    necessaryEnabled,
    necessaryReadOnly,
    analyticsEnabled,
    analyticsAutoClearCookies,
    adsEnabled,
    languageDefault,
    languageAutoDetect,
    languageRtl,
    onFirstConsent,
    onConsent,
    onChange,
    onModalReady,
    onModalShow,
    onModalHide,
    sections,
    services,
    inPlasmicCanvas,
    isSelected,
    plasmicNotifyAutoOpenedContent,
  ]);

  return <div id="plasmic-cookie-consent" />;
}
