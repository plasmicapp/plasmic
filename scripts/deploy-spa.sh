#!/bin/bash

set -euo pipefail
echo "Deploying SPA to GCS..."
echo "  Bucket: gs://$GCS_BUCKET"
echo "  Tag: $TAG"
echo "  Source: $SOURCE_PATH"
echo "  Project: $GCP_PROJECT"

cd "$SOURCE_PATH"

IMMUTABLE='public, max-age=31536000, immutable'
SHORT='public, max-age=3600'

echo "Pushing version to GCS..."
gcloud storage cp -r --quiet ./ "gs://$GCS_BUCKET/versions/$TAG/"

# Only content-hashed names get the immutable policy, and `gcloud storage cp` has no
# --exclude. rsync does but lists every past release under versions/. So prune a hardlinked
# copy of the tree instead, stable URLs are uploaded separately below.
STAGE="$(mktemp -d -p .. immutable.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT
cp -al ./. "$STAGE/"
rm -rf "$STAGE"/index.html "$STAGE"/favicon.ico "$STAGE"/robots.txt \
  "$STAGE"/*.worker.js* "$STAGE"/static/host.html "$STAGE"/static/popup.html \
  "$STAGE"/static/img \
  "$STAGE"/static/css/normalize.css "$STAGE"/static/js/getlibs.js \
  "$STAGE"/static/js/preamble.js "$STAGE"/static/js/loader-hydrate.js* \
  "$STAGE"/static/js/studio.js

echo "Deploying to root..."
(cd "$STAGE" && gcloud storage cp -r --quiet ./ "gs://$GCS_BUCKET/" --cache-control "$IMMUTABLE")

# Assets whose names are stable across deployments.
gcloud storage cp -r --quiet ./static/img \
  "gs://$GCS_BUCKET/static/" --cache-control "$SHORT"
gcloud storage cp --quiet ./static/css/normalize.css \
  "gs://$GCS_BUCKET/static/css/" --cache-control "$SHORT"
gcloud storage cp --quiet ./static/js/getlibs.js ./static/js/preamble.js \
  ./static/js/loader-hydrate.js* "gs://$GCS_BUCKET/static/js/" \
  --cache-control "$SHORT"
gcloud storage cp --quiet ./static/host.html ./static/popup.html \
  "gs://$GCS_BUCKET/static/" --cache-control "$SHORT"
gcloud storage cp --quiet ./*.worker.js* ./favicon.ico ./robots.txt \
  "gs://$GCS_BUCKET/" --cache-control "$SHORT"

gcloud storage cp -r --quiet ./index.html "gs://$GCS_BUCKET/index.html" --cache-control 'max-age=0, s-maxage=31536000'
gcloud storage cp -r --quiet ./static/js/studio.js "gs://$GCS_BUCKET/static/js/studio.js" --cache-control 'max-age=0, s-maxage=31536000'

echo "Invalidating CDN cache..."
gcloud compute url-maps invalidate-cdn-cache platform-url-map --path "/index.html" --async --project "$GCP_PROJECT"
gcloud compute url-maps invalidate-cdn-cache platform-url-map --path "/static/js/studio.js" --async --project "$GCP_PROJECT"

echo "Deployment complete!"
