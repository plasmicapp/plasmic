# next-plugin-plasmic

A plugin to sync your Plasmic designs with NextJS codebases via a convenient <PlasmicLoader /> component!

### Usage

Before using the plugin, make sure a valid `plasmic.json` file already exists. Run `plasmic init` and
follow the steps to create one.

1. Add the plugin to NextJS:

```js
// next.config.js
const plasmic = require("./next-plugin-plasmic");

const withPlasmic = plasmic({
  dir: __dirname, // The root directory of your project.
  projectIds: ["some-project-id"], // An array of project ids.
});

module.exports = withPlasmic({
  // Your NextJS config.
});

```

@TODO: add example using https://github.com/cyrilwanner/next-compose-plugins.

2. Use the new <PlasmicLoader /> component like this:

```jsx
// some-page.js

import styles from '../styles/Home.module.css'
import PlasmicLoader from '@plasmicapp/next-plugin-plasmic/PlasmicLoader';

export default function Home(props) {
  return (
    <div className={styles.container}>
      <PlasmicLoader projectId="some-project-id" component="component-name" />
    </div>
  )
}
```

And that is!

### How it works

This plugin leverages existing tooling and Next server-side phases to fetch updates to your component at build
time.
