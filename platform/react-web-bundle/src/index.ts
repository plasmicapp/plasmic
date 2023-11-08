import * as DataSourcesContext from "@plasmicapp/data-sources-context";
import * as ReactWeb from "@plasmicapp/react-web";
import * as DataSources from "@plasmicapp/react-web/lib/data-sources";

ReactWeb.setPlumeStrictMode(false);

(window as any).__PlasmicReactWebBundle = ReactWeb;
(window as any).__PlasmicDataSourcesBundle = DataSources;
(window as any).__PlasmicDataSourcesContextBundle = DataSourcesContext;
