# Developing Plasmic Studio: third-party system integrations

## Plasmic hosting on Vercel

To be able to locallly access a plasmic hosted project in dev environment it's required to have the `hosting` application running (`pm2-dev.config.js` has a configuration to run it locally with the proper environment variables).

With hosting running, you can access a published project by going to `http://localhost:3009/_sites/yourdomain.plasmic.run` which is going to be the equivalent of going to `yourdomain.plasmic.run`.

## Setting up Google SSO

For now, users who use SSO must have an email domain that matches an org's domain.

Each developer who works on Plasmic and wants to try out SSO will need to set up
a project on Google Developers Console.

- Go to [Google Developers Console](https://console.developers.google.com/)
- On the upper-left corner, you can see the Project you are using (next to three black hexagons).
  Click it, and in the dialog box, click "New Project" on the upper-right.
- Name your project something like "Plasmic Yang Dev"
- Click on the Credentials tab on the left sidebar.
- First click on the "OAuth consent screen". Fill in the required fields, and for scopes,
  make sure "email", "profile", "openid" are included (should be by default).
- Next, click on the "Credentials tab"
  - Select "Create credentials", and choose "OAuth Client ID".
  - Application type: "Web application"
  - Name: <whatever you want>
  - Authorized Javascript origins: [http://localhost:3003]
  - Authorized redirect URIs: [http://localhost:3003/api/v1/oauth2/google/callback]
- Save the client ID and secret in your `~/.plasmic/secrets.json`. It should look like:
  ```json
  {
    "encryptionKey": "this is a secret DB encryption key",
    "google": {
      "clientId": "YOUR CLIENT ID",
      "clientSecret": "YOUR CLIENT SECRET"
    }
  }
  ```

## Setting up GitHub App

- Sign in to GitHub with your personal account and go to
  [GitHub Developer Settings](https://github.com/settings/apps).
- Create a new GitHub App with the following information:
  - Homepage URL: http://localhost:3003
  - Callback URL: http://localhost:3003/github/callback
  - Uncheck "Expire user authorization tokens"
  - Check "Request user authorization (OAuth) during installation"
  - Deactivate webhook
  - Repository permissions:
    - Actions: Read & write
    - Administration: Read & write
    - Contents: Read & write
    - Pages: Read & write
    - Pull requests: Read & write
    - Workflows: Read & write
- Click on "Edit" in the app you created and generate/store a client secret
  and a private key.
- Fill the following fields in your ~/.plasmic/secrets.json:

  ```json
  {
    "github": {
      "appId": "<APP_ID>",
      "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n<YOUR_KEY>...",
      "oauth": {
        "clientId": "<CLIENT_ID>",
        "clientSecret": "<CLIENT_SECRET>"
      }
    }
  }
  ```

  **Note that the private key must have its line breaks replaced by "\n".**

- Edit the devflags (in your local storage) changing githubClientId and
  githubAppName to your app client ID and kebab-cased name (copy it from the
  app URL), then reload studio for changes to take effect.

### Developing/debugging GitHub integration

Here are various tips and tools for localhost development.

### Set an externally facing URL

GitHub Actions needs to call your app server to perform syncs, so use a service
like localhost.run and set your `externalBaseUrl` devflag to point to your
resulting temp URL.

### Use toolchain debug flags

We internally use our own toolchain including create-plasmic-app,
@plasmicapp/cli, @plasmicapp/loader, etc. You can use `yalc` to temporarily
change package.json to use your own local create-plasmic-app, and you can use
the various debug flags for those packages like `PLASMIC_DEFAULT_HOST`.

For example, to have the CLI/PlasmicLoader point to your own localhost server:

    PLASMIC_DEFAULT_HOST=http://localhost:3003 yarn backend

This is ignored by the app server but consumed by CLI/PlasmicLoader.

See the various READMEs on those projects for relevant debug flags.

### Publish the toolchain first

The CLI/PlasmicLoader does eventually get run on GitHub Actions runners, so the "easiest" way to test things for now is to publish first.

Potentially, you can also amend the resulting package.json (in the repo that gets pushed to GitHub) to point to some alternate package source, but I haven't done/needed this yet.

## Setting up billing (Stripe)

To test billing locally, add Stripe test secret key (https://dashboard.stripe.com/test/apikeys) to secrets.json:

```json
{
  "stripe": {
    "secretKey": "<PASTE_SECRET_KEY_HERE>"
  }
}
```

## Setting up Google Sheets

Have a GCloud account, Sheets API enabled, OAuth consent screen.

Create an OAuth client.

- Type: web application
- Redirects: http://localhost:3003/api/v1/oauth2/google-sheets/callback

Save into secrets.json:

```json
{
  "google-sheets": {
    "clientId": "<CLIENT_ID>",
    "clientSecret": "<CLIENT_SECRET>"
  }
}
```
