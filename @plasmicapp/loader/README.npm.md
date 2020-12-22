A plugin to sync your Plasmic designs via a convenient <PlasmicLoader /> component! Supports both NextJS and Gatsby.

```jsx
// some-page.js

import PlasmicLoader from "@plasmicapp/loader";

export default function MyPage(props) {
  return (
    <div>
      <PlasmicLoader projectId="some-project-id" component="component-name" />
    </div>
  );
}
```

### Usage with NextJS

For NextJS codebases, add our plugin like this:

```js
// next.config.js
const plasmic = require("@plasmicapp/loader/next");

const withPlasmic = plasmic({
  dir: __dirname, // The root directory of your project.
  projectIds: ["some-project-id"], // An array of project ids.
});

module.exports = withPlasmic({
  // Your NextJS config.
});
```

### Usage with Gatsby

For Gatsby codebases, add our plugin like this:

```js
// gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `@plasmicapp/loader/gatsby`,
      options: {
        dir: __dirname, // The root directory of your project.
        projectIds: ["some-project-id"], // An array of project ids.
      },
    },
  ],
};
```
