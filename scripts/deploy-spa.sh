#!/bin/bash

set -euo pipefail
echo "Deploying SPA to GCS..."
echo "  Bucket: gs://$GCS_BUCKET"
echo "  Tag: $TAG"
echo "  Source: $SOURCE_PATH"
echo "  Project: $GCP_PROJECT"

cd "$SOURCE_PATH"

echo "Pushing version to GCS..."
gcloud storage cp -r --quiet ./ "gs://$GCS_BUCKET/versions/$TAG/"

echo "Deploying to root..."
gcloud storage cp -r --quiet ./ "gs://$GCS_BUCKET/"
gcloud storage cp -r --quiet ./index.html "gs://$GCS_BUCKET/index.html" --cache-control 'max-age=0, s-maxage=31536000'
gcloud storage cp -r --quiet ./static/js/studio.js "gs://$GCS_BUCKET/static/js/studio.js" --cache-control 'max-age=0, s-maxage=31536000'

echo "Invalidating CDN cache..."
gcloud compute url-maps invalidate-cdn-cache platform-url-map --path "/index.html" --async --project "$GCP_PROJECT"
gcloud compute url-maps invalidate-cdn-cache platform-url-map --path "/static/js/studio.js" --async --project "$GCP_PROJECT"

echo "Deployment complete!"
