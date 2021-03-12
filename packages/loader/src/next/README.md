# next-plugin-plasmic

A plugin to sync your Plasmic designs with NextJS codebases via a convenient <PlasmicLoader /> component!

### Usage

1. Add the plugin to NextJS:

```js
// next.config.js
const plasmic = require("@plasmicapp/loader/next");

const withPlasmic = plasmic({
  projects: ["projectid", "projectid@>0"], // An array of project to sync.
});

module.exports = withPlasmic({
  // Your NextJS config.
});
```

2. Use the new <PlasmicLoader /> component like this:

```jsx
// some-page.js

import styles from "../styles/Home.module.css";
import PlasmicLoader from "@plasmicapp/loader";

export default function Home(props) {
  return (
    <div className={styles.container}>
      <PlasmicLoader projectId="some-project-id" component="component-name" />
    </div>
  );
}
```

And that is!

### How it works

This plugin leverages existing tooling and Next server-side phases to fetch updates to your component at build time.
