A plugin to sync your Plasmic designs via a convenient <PlasmicLoader /> component! Supports both NextJS and Gatsby.

```jsx
// some-page.js

import PlasmicLoader from "@plasmicapp/loader";

export default function MyPage(props) {
  return (
    <div>
      <PlasmicLoader
        projectId="some-project-id"
        component="component-name"
        componentProps={{
          onClick() {
            // ...
          },
          someComponentProp() {
            // ...
          },
        }}
        providerProps={{
          Screen: null,
          Theme: "dark",
        }}
      />
    </div>
  );
}
```

| Prop           | Required?                                                       | Description                                                                                                               |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| component      | Yes                                                             | The name of the component that you want to load. Note that you can only load named components in Plasmic                  | $12 |
| componentProps | No                                                              | Any additional prop you wish to pass to your component                                                                    |
| projectId      | Only if you have multiple projects with the same component name | The unique project identifier. It is inside your Plasmic project URL: https://studio.plasmic.app/projects/here-project-id |
| providerProps  | Only if your component uses Global Variants                     | An object with all the Global Variants and their value for this component                                                 |

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
