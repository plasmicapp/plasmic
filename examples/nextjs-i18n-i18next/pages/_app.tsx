import "@/styles/globals.css";
import { appWithTranslation } from "next-i18next";
import type { AppProps } from "next/app";

function App({ Component, pageProps }: AppProps) {
  // const router = useRouter();
  // const locale = router.locale ?? router.defaultLocale ?? "en";
  // i18n.changeLanguage(locale);

  return <Component {...pageProps} />;
}

export default appWithTranslation(App);
