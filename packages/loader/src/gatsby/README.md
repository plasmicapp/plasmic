# gatsby-source-plasmic

A plugin to sync your Plasmic designs with Gatsby codebases via a convenient <PlasmicLoader /> component!

### Usage

1. Add the plugin to Gatsby:

```js
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `@plasmicapp/loader/gatsby`,
      options: {
        projects: ["projectid", "projectid@>0"], // An array of projects to sync.
      },
    },
  ],
};
```

2. Use the new <PlasmicLoader /> component like this:

```jsx
// some-page.js

import * as React from "react";
import PlasmicLoader from "@plasmicapp/loader";

const IndexPage = () => {
  return (
    <main>
      <PlasmicLoader projectId="some-project-id" component="component-name" />
    </main>
  );
};

export default IndexPage;
```

And that is!

### How it works

This plugin leverages existing tooling and Gatsby server-side hooks to fetch updates to your component at build time.
