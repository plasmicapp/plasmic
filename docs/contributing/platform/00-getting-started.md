# Developing Plasmic Studio: getting started

## Database setup

Plasmic uses PostgreSQL (v15) as a database. We highly recommend setting postgres through docker (see `docker-compose.yml` for details). If you follow the Docker setup guide -- database will be created for you automatically.
If you prefer the manual application set up just run `docker-compose up -d --no-deps plasmic-db` in your terminal to build and launch the postgresql instance.

## OS-specific instructions

### Mac OS X

This section applies only if you install postgres manually, not through docker.

Update the version numbers for Postgresql in the following depending on what's latest!

```
{ sed 's/#.*//' | while read line; do sudo port install -b $line; done ; } << "EOF"
curl-ca-bundle
postgresql15
postgresql15-server
hadolint # for Dockerfile checking
EOF

# Follow the instructions printed during the postgresql-server installation:
sudo port select postgresql postgresql15
sudo mkdir -p /opt/local/var/db/postgresql15/defaultdb
sudo chown postgres:postgres /opt/local/var/db/postgresql15/defaultdb
sudo su postgres -c 'cd /opt/local/var/db/postgresql15 && /opt/local/lib/postgresql15/bin/initdb -D /opt/local/var/db/postgresql15/defaultdb
sudo port load postgresql15-server
```

(Your life will be much easier if you use macports. Don't use brew for installing PG.)

In order for `sudo -u postgres psql` to work without error messages, you should `chmod 755 ~`.

### Ubuntu 18.04+

- Install OS packages:

  ```
  apt update
  apt install build-essential python3 python3-pip virtualenvwrapper postgresql postgresql-contrib wget screen
  ```

- You may also need to increase your max watched file limit (see [issue](https://github.com/facebook/create-react-app/issues/2549)):
  ```
  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
  ```

## asdf

`asdf` (https://asdf-vm.com/) manages multiple versions of runtimes/tools that we use, such as `node` and `python`.
This can be useful if you need to work in multiple environments on the same machine.

Versions are kept in version control in `.tool-versions` and `.envrc`.

1. Install `asdf`: https://asdf-vm.com/guide/getting-started.html
1. Install plugins:
   ```
   asdf plugin add nodejs
   asdf plugin add python
   asdf plugin add direnv
   ```
1. Run `asdf install` from the root directory (and any dir with `.tool-versions`).
1. In the root directory, run: `direnv allow`.
1. Check that the installed tools work and have the correct version.
   ```bash
   node --version
   python --version
   ```

Notes:

- You want asdf for python instead of using your Mac's system python because
  - in the latest MacOS 12.6 (which suddenly switches to python 3.9) building binary packages within certain environments like the pre-commit pyenv is broken, unless maybe you install Xcode.
  - we have more consistent control across platforms of which python we are relying on, which can have subtle effects on the chances of success of npm gyp builds. Plus, no more sudden switching python 3.8 to 3.9 (for ex) just because you updated MacOS!
- You want asdf-direnv so that:
  - you get local virtualenv's managed by direnv (what's called "layouts" in direnv) - these local envs are not handled by asdf.
  - things like `node --various-node-flags $(which yarn)` work as expected (used in various scripts).
  - plus the general benefits of avoiding shims.

## Docker setup

By default, the source code is mounted as a shared volume with the host. The node modules are mounted separately, each having their own volume, in order to cache the npm install step and make sure we don't pollute the shared volume with the built artifacts.

This setup is quite heavy on CPU/RAM consumption, make sure you have **at least** 8GB of RAM available for the application container.

Launching the app through docker takes just a single command from the root of the repository:

```
docker-compose up -d
```

It will automatically spin up database, seed it, perform all the migrations, build all the source code needed for the studio to operate properly, and launch the server.

## Manual setup (suggested)

Before proceeding, make sure you have configured your [database](#database-setup) and [git hooks](#configuring-git-and-git-hooks).

### 1. Environment variables

Make sure the root of your project and `./platform/wab` folder contain the following `.env` files:

```
DATABASE_URI=postgres://wab:SEKRET@localhost:5432/wab
WAB_DBNAME=plasmic-db
WAB_DBPASSWORD=SEKRET
NODE_ENV=development
```

### 2. Installing dependencies

Run `yarn install` twice -- once in the root folder, and second time in the `./platform/wab`

### 3. Seeding the database

In the `./platform/wab` run:

```
yarn seed
```

### 4. Application setup

In the project root directory, run:

```
yarn setup-all && yarn bootstrap
```

### 5. Starting dev servers

Run all servers in GNU screens:

```
yarn dev
```

## Using the app

The app runs on http://localhost:3003/.

If you have freshly reset the DB, the following users will be created for you
(see [seed script](/platform/wab/src/wab/server/db/DbInit.ts) for details):

- admin@admin.example.com
- user@example.com
- user2@example.com

The password for these accounts is `!53kr3tz!`.

WARNING: Avoid testing with the admin@admin.example.com user.
By default, the admin.example.com domain is considered an admin and has
elevated privileges (e.g. access to all teams, workspaces, projects, etc).
For most development purposes, use a normal user such as user@example.com.

## Troubleshooting

### Executable `hadolint` not found

Install [hadolint](https://github.com/hadolint/hadolint) if you do any changes to the docker configs

### tools/dev.bash: line 3: concurrently: command not found

If your `/platform/wab/tools/dev.bash` throws an error about `concurrently` not being a function, re-write it as `npx concurrently`

## Next steps

Dive deeper into the tooling and configuration in [01-config-tooling.md](./01-config-tooling.md).
