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

# Exclude stable URLs from the immutable sync so they are uploaded only once,
# below, with their final cache policy. Do not add a leading ^: gcloud treats it
# as custom-delimiter syntax, while its regex matching is already anchored.
EXCLUDE='(\./)?(index\.html|[^/]*\.worker\.js.*|favicon\.ico|robots\.txt|static/img/.*|static/font-awesome/.*|static/css/normalize\.css|static/js/getlibs\.js|static/js/preamble\.js|static/js/loader-hydrate\.js.*|static/js/studio\.js|static/host\.html|static/popup\.html)$'

echo "Pushing version to GCS..."
gcloud storage cp -r --quiet ./ "gs://$GCS_BUCKET/versions/$TAG/"

echo "Deploying to root..."
gcloud storage rsync --recursive --quiet --cache-control "$IMMUTABLE" --exclude="$EXCLUDE" ./ "gs://$GCS_BUCKET/"

# Override the cache policy for assets whose names are stable across deployments.
gcloud storage cp -r --quiet ./static/img ./static/font-awesome \
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
