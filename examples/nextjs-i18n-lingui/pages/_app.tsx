import "@/styles/globals.css";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { messages as en } from "../locales/en/messages";
import { messages as es } from "../locales/es/messages";

i18n.load({
  en,
  es,
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const locale = router.locale ?? router.defaultLocale ?? "en";
  i18n.activate(locale);

  return (
    <I18nProvider i18n={i18n}>
      <Component {...pageProps} />
    </I18nProvider>
  );
}
