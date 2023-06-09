import "@/styles/globals.css";
import { IntlProvider } from "react-intl";
import type { AppProps } from "next/app";
import en from "../locales/en.json";
import es from "../locales/es.json";
import { useRouter } from "next/router";

function App({ Component, pageProps }: AppProps) {
  const { locale } = useRouter();
  const messages = locale === "es" ? es : en;
  return (
    <IntlProvider locale={locale ?? "en"} messages={messages}>
      <Component {...pageProps} />
    </IntlProvider>
  );
}

export default App;
