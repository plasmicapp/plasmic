# auth

Plasmic authentication uses [Passport](https://www.passportjs.org/) to handle
multiple strategies for signing in, such as password, Google, Okta, etc.

## Google

To set up Google sign-in for local development, follow these instructions:

1. Sign in to https://console.cloud.google.com/.
2. Create a separate project for Plasmic development.
3. Go to the Credentials page and create a new "Oauth client ID".
4. Fill in the following fields:
   - Application type: Web application
   - Name: App name, e.g. "Plasmic Dev (my_username)"
   - Authorized JavaScript origins: http://localhost:3003
   - Authorized redirect URIs: http://localhost:3003/api/v1/oauth2/google/callback
5. Copy the "Client ID" and "Client secret", and paste them into your
   secrets.json file ([docs about secrets](/platform/wab/src/wab/server/secrets.ts).
   ```json
   {
     "google": {
       "clientId": "copy from Google",
       "clientSecret": "copy from Google"
     }
   }
   ```

Now go to http://localhost:3003/login and sign in with Google!

## Okta

We have a shared Okta dev instance at https://dev-2205008.okta.com/.

In Bitwarden, you'll find 3 accounts that you can use:

- Admin user: for configuring the Okta dev instance
- Test user: for manual testing and development
- Test user for CI/CD: for automated testing

To set up Okta SSO for local development, follow these instructions:

1. Go to the [Plasmic Generic SSO Test app](https://dev-2205008-admin.okta.com/admin/app/oidc_client/instance/0oa7xfuoxgo9Jsfu45d7/).
2. Sign in as the admin user (credentials in Bitwarden).
   You should see a client ID and client secret, which you'll need later.
3. Go to https://localhost:3003/admin/teams.
4. Lookup a team and open it.
5. Scroll down, open the "Misc" tab, and click "Configure SSO".
6. Fill in the following fields:
   - Domain: dev-2205008.okta.com
   - Provider: Okta
   - Config:
     ```json
     {
       "audience": "https://dev-2205008.okta.com",
       "clientID": "copy from Okta",
       "clientSecret": "copy from Okta"
     }
     ```
7. There should now be a new row in the `sso_config` table.
   Update the `tenantId` to `6RB4POx0y1gr7rCNvTDMMc`.

Now go to http://localhost:3003/sso and use the test user to sign in.
