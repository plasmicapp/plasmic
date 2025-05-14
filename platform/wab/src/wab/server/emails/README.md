# Emails

This directory contains code for sending transactional emails from Plasmic (not marketing emails, yet).

## Using Plasmic Email Templates

```shell
# Start email host
yarn email:host

# Sync Plasmic codegen
yarn email:sync

# Generate email
yarn email:generate

# Generate and send email
yarn email:generate --email=you@plasmic.app
```

## Directory Structure

```
.
├── Mailer.ts         # email mailing code
├── test-email.mts    # email manual testing
├── *-email.ts        # specific email code
├── components.tsx    # code components for Email Templates (based on react-email)
├── host/             # Plasmic host for Email Templates
├── templates/
│   ├── generate.tsx  # generates an email from a template
│   └── ...           # generated code for Email Templates project
└── ...
```

### `host/`

A minimal Vite application that registers code components based on [react-email](https://react.email/).

### `templates/`

Contains Plasmic generated code from the [[PlasmicKit] Email Templates](https://studio.plasmic.app/projects/taNK5uwsoPrzfpYmBVwUwX/) Studio project.

This has its own plasmic.json file because it uses the "cdn" images scheme, unlike wab/plasmic.json, which uses "files". Note images should be common types recognized by email clients, such as JPEG, PNG, GIF, and not SVG, WEBP.

This project uses the Vite app at host/ as a custom host. Make sure to start the dev server to use the Studio project.

### `test-email.mts`

Contains scripts for manual testing of email. The script outputs the generated HTML to `out/`, that can be opened in a browser to preview. To execute the script, run:

```bash
# From anywhere within the /wab folder
yarn email:generate
```

Choose the template to use by editing the `TEMPLATE_NAME` and `TEMPLATE_PROPS` constants in the script.

**Testing with Email Delivery:**

```bash
# Send test email to a specific address
# Use the "SMTP credentials for one-off" credentials in Bitwarden
EMAIL_SMTP_USER="<SMTP user name>" \
EMAIL_SMTP_PASSWORD="<SMTP password>" \
yarn email:generate --email=you@plasmic.app
```
