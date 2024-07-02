import { NextJsPlasmicComponentLoader } from "@plasmicapp/loader-nextjs";
import HelloWorld from "./components/HelloWorld";

export const LIBRARY_PROJECT_CONFIG = {
  id: "8fA1adnPC4e7fBBA6AVnWN",
  token:
    "WS62bKQIsLHeRhdkjSUixnSVGpNDZQViA4Uu7hAtVjUQPv2w4DWPJreS8l7jn91jlfI0azHB7HhfUg4xYP3vQ",
};

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

export function registerCodeComponents(loader: NextJsPlasmicComponentLoader) {
  loader.registerComponent(HelloWorld, {
    name: "Hello World",
    props: {
      name: "string",
    },
  });
}
