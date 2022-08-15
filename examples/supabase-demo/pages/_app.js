import { PLASMIC } from "../plasmic-init";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return PLASMIC && <Component {...pageProps} />;
}

export default MyApp;
