# gatsby-source-plasmic
A plugin to sync your Plasmic designs with Gatsby codebases via a convenient <PlasmicLoader /> component!

### Usage

Before using the plugin, make sure a valid `plasmic.json` file already exists. Run `plasmic init` and
follow the steps to create one.

1. Add the plugin to Gatsby:

```js
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-plasmic`,
      options: {
        dir: __dirname, // The root directory of your project.
        projectIds: ["some-project-id"], // An array of project ids.
      },
    },
  ],
};
```

2. Use the new <PlasmicLoader /> component like this:

```jsx
// some-page.js

import * as React from "react"
import PlasmicLoader from '@plasmicapp/gatsby-source-plasmic/PlasmicLoader';

const IndexPage = () => {
  return (
    <main>
      <PlasmicLoader projectId="some-project-id" component="component-name" />
    </main>
  )
}

export default IndexPage

```

And that is!

### How it works

This plugin leverages existing tooling and Gatsby server-side hooks to fetch updates to your component at build
time.
