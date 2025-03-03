# Developing Plasmic Studio: config and tooling guide

## Config (optional)

Write something like this in `~/.plasmic/secrets.json`:

```
{
  "encryptionKey": "dummykey",
  "google": {
    "clientId": "SEE_GOOGLE_INSTRUCTIONS_BELOW",
    "clientSecret": "SEE_GOOGLE_INSTRUCTIONS_BELOW"
  },
  "smtpAuth": {
    "user": "SET_THIS_TO_SMTP_USER",
    "pass": "SET_THIS_TO_SMTP_KEY"
  },
  "segmentWriteKey": "ignorethis"
}
```

You'll also need `~/.aws/credentials`, since various parts such as codegen/publish and Figma import use S3.

Please use your given IAM credentials and access token.

## Database

### Setup DB

On project root directory, make sure the Postgresql server is running, and run:

```
yarn db:setup
yarn db:reset # specify no_sudo=1 if `sudo -u postgres psql` doesn't work
```

### Reset DB State

If you ever want to, you can reset the DB state by running (on project root):

```
yarn db:reset # add --sudo if necessary (hopefully not)
```

> Important: remember clearing your browser cookies and restart any running servers.

## Running Servers

### Running Servers using screen

Run all servers in screens:

```
bash tools/start.bash
```

If you'd like to disable type-checking for faster incremental dev-server builds,
use:

```
NO_TYPECHECK=1 bash tools/start.bash
```

After start.bash, you'll automatically get three panes viewing various terminals, each one running some subset of procseses.

### (Experimental) Running on different ports

If you'd like to run on an alternate backend (app server) port:

```
BACKEND_PORT=3007 bash tools/start.bash
```

If you'd like to run on an alternate frontend (webpack dev server) port:

```
PORT=3006 bash tools/start.bash
```

If you'd like to run on an alternate database name:

```
WAB_DBNAME=altwab bash tools/start.bash
```

### (Incomplete) Running Servers manually

(This just documents running things in wab, but you must also run things outside of wab.)

In `wab` folder

Run backend

```
yarn backend
```

Run frontend client dev server

```
yarn start
```

Run host client, just a proxy on port 3005 to the frontend

```
yarn host-server
```

### Running Servers using pm2

You can also use pm2 to manage all the server processes in dev environment.
First, initialize the shell as:

```
workon wab
. ~/.node/*/bin/activate
```

Install pm2 globally so you can use pm2 rather than "yarn pm2"

```
yarn global add pm2
```

To start all processes, just

```
cd wab
pm2 start pm2-dev.config.js
```

To stop all processes,

```
pm2 stop all
```

To delete all processes,

```
pm2 delete all
```

To inspect logs,

```
pm2 logs
```

Refer to https://pm2.keymetrics.io/docs/usage/quick-start/ for more usage information.

## When pulling codebase

Whenever you fetch the latest changes, most of the time, you just need to run:

```
yarn
make
# restart node server
# restart webpack, once in a blue moon
```

But if something is still going wrong, try:

```
yarn setup
# restart node server
# restart webpack, once in a blue moon
```

If the above doesn't fix the issue, try again but running `yarn setup-all` instead.

## SVG Icons

For the in-flux SVG icons, install the icon fonts from https://github.com/keremciu/font-bundles

## Plume special package

To make sure your local database contains the latest version of the Plume
package so that you can create components from Plume templates, run:

```
yarn plume:dev update
```

If you don't do so, studio may show a NotFoundError when you open any new
project.

## Testing

Run Jest tests with:

```
bash tools/test.bash
```

## Migrating DB/model bundle schema

To migrate bundles, create a new file in the `bundle-migrations` following the same format as existing files. Small example:

```
// wab/src/wab/server/bundle-migrations/XX-my-migration.ts

import { UnsafeBundle } from "../../shared/bundles";

export function migrate(bundle: UnsafeBundle) {
    for (const [k, v] of Object.entries(bundle.map)) {
        if (v.__type === "Rule") {
            v.values = v.values;
        }
    }
}
```

And that is!

If you want to revert, simply remove the file (you can also go to gerrit and create a revert), and then restarting the app server. WARNING: this will occur in data loss. If you can create a new migration instead, do so!

In reality, you only have to worry about adding files and reverting files. Our deployment scripts will take care of the rest. Here's a brief explanation on how to do the changes in your local environment:

- Migrating live: add a new migration and restart the server.
- Reverting live: remove the migration and restart the server.
- Migrating offline: add a new migration and run `yarn db:migrate-bundles`.
- Reverting offline: remove the migration and run `yarn db:migrate-bundles`.

## Migrating dev/test bundles

We have some local JSON bundles for development/test purposes, which you also need to migrate.

To migrate these, run:

```bash
yarn migrate-dev-bundles
```

This runs any necessary migrations according to the version stamp.

Then make sure you run jest and update the test snapshots.

NOTE: This will first do a `git checkout` on the file, resetting to a fresh checkout state! This lets you repeatedly test and run your migration script on the file.

## Debugging Studio

Because Studio runs in a cross-origin iframe, debugging becomes a bit trickier.

In particular, the React Devtools Chrome extension will not work. However, you can run the standalone React Devtools Electron package.

Install and run `react-devtools`:

```bash
    yarn global add react-devtools
    react-devtool
```

Alternatively you can run it with npx:

```bash
npx react-devtools
```

And now when you open up Studio with the devflag `?enableReactDevTools=true` and it should auto-connect.
It should work for both dev server and prod.

## Debugging Node Server

You can use IntelliJ/Webstorm.

Or use `node --inspect` to debug your node app using Chrome DevTools - just open about:inspect in Chrome as per
<https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27>.

## Ant

We're opting to import all Ant styles wholesale and override their globals
in antd-overrides.less. This allows for live theming (no dev server restarts
necessary).

Read more about Ant theming: https://paper.dropbox.com/doc/Web-Dev-Tips--AQguKQi_C8k0RX8XYqxhF3reAg-ohIiFVGa3PcjyBrm8zHew#:uid=860080543912951306384687&h2=Theming

## Maintaining dependencies

Check what dependencies are not used (or missing):

```
yarn custom-depcheck
```

Check what needs to be updated:

```
yarn outdated
```

Update the dependencies:

```
yarn upgrade --latest
```

This will upgrade everything. You can also try selectively upgrading individual
packages, but things get complicated with how yarn handles upgrading
dependencies that are also indirect dependencies of other dependencies.

## Alternate configs

When pointing to a different DB, you currently have to make sure you locally
edit ormconfig.json (used by typeorm CLI) and set the WAB_DBNAME env var.

## Updating submodule repos

To update submodule repos in place (rather than edit a separate checkout,
commit, push, and pull here just to try out a change), follow these steps,
taking wab/create-react-app-new/ as an example:

- Ensure wab/create-react-app-new/ is on master, and not in detached HEAD. [More details].
- Directly edit the submodule files in wab/create-react-app-new/.
- Commit in the submodule repo.
- Commit in the parent repo, so that the parent repo updates their tracking commit hash to the latest.
- git-review the submodule.
- Merge the submodule commit first.
- Once the submodule commit is merged, git-review on the parent will work.

[More details]: https://stackoverflow.com/questions/18770545/why-is-my-git-submodule-head-detached-from-master/55570998 for more on this.

## Writing E2E tests

Some pointers:

- Normally `cy` operates on the top-most document, but we often want to interact
  with the arena frames. To do so, use the `Framed` utility class.

- Often, be sure to use `{force:true}`, or else cypress will attempt to
  auto-scroll things into view (which we almost never want since there's no real
  scrolling in our app).

## Audit licenses of dependencies

For node dependencies, do this from each project directory:

    npx license-checker --csv --out license-checker.csv

For Python dependencies, do this from each project directory:

    pip-licenses --from=mixed -f csv > pip-licenses.csv

## Production Build

Run `yarn build` to build client app for production. This takes a long time (>5m).

You can test out your built artifact with:

```
  yarn global add local-web-server
  cd build/
  ws --spa index.html --rewrite '/api/(.*) -> http://localhost:3004/api/$1'
```

Then open http://localhost:8000.
