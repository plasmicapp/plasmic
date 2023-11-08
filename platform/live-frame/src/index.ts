import "@plasmicapp/react-web/lib/plasmic.css";
import "./live.css";

const SystemJs = (window as any).SystemJS;
const Sub = (window as any).__Sub;

// Directly register these pre-loaded dependencies within the live frame,
// so we don't have to load them remotely
SystemJs.set(SystemJs.resolveSync("react"), SystemJs.newModule(Sub.React));
SystemJs.set(
  SystemJs.resolveSync("react-dom"),
  SystemJs.newModule(Sub.ReactDOM)
);
SystemJs.set(
  SystemJs.resolveSync("@plasmicapp/react-web"),
  SystemJs.newModule((window as any).__PlasmicReactWebBundle)
);
SystemJs.set(
  SystemJs.resolveSync("@plasmicapp/data-sources-context"),
  SystemJs.newModule((window as any).__PlasmicDataSourcesContextBundle)
);
SystemJs.set(SystemJs.resolveSync("@plasmicapp/host"), SystemJs.newModule(Sub));
if (Sub.PlasmicQuery) {
  SystemJs.set(
    SystemJs.resolveSync("@plasmicapp/query"),
    SystemJs.newModule(Sub.PlasmicQuery)
  );
  SystemJs.set(
    SystemJs.resolveSync("@plasmicapp/react-web/lib/data-sources"),
    SystemJs.newModule((window as any).__PlasmicDataSourcesBundle)
  );
}
// Also register dummy content for plasmic.css.  We don't need the real
// content here, because the import at the top of the file already inserted
// the css into the document.
SystemJs.refreshXModules([
  {
    name: "@plasmicapp/react-web/lib/plasmic.css",
    source: "/* nothing to see */",
    lang: "css",
  },
]);
