import "antd/dist/antd.css";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import ComponentGallery from "./ComponentGallery";
import MaybeJsBundleThemeProvider from "./MaybeJsBundleThemeProvider";

function App() {
  // This is a throw-away preview of your components in CodeSandbox!
  // To use your designs in a real codebase, go back to your project in Plasmic
  // Studio and press the Code button in the top toolbar.
  //
  // By default, we render a gallery where you can look through your
  // components using the arrow key.  Feel free to edit this file
  // to render just the component that you want!
  return (
    <MaybeJsBundleThemeProvider>
      <BrowserRouter>
        <ComponentGallery />
      </BrowserRouter>
    </MaybeJsBundleThemeProvider>
  );
}

export default App;
