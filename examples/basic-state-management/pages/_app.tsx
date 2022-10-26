import type { AppProps } from "next/app";
import { useState } from "react";
import { ShowHideContext } from "../components/ShowHide";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [shown, setShown] = useState(true);
  return (
    <ShowHideContext.Provider value={{ shown, setShown }}>
      <Component {...pageProps} />
    </ShowHideContext.Provider>
  );
}
