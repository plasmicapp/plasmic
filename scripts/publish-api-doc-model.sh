#!/usr/bin/env bash

function read_json_object_field() {
  file=$1
  key=$2

  # -m 1 returns only first match
  # -o returns only matched text

  # first match the sequence "<key>": "<value> (no closing quote)
  grep -m 1 -o '"'"$key"'": "[^"]*' $file | \
  # then match the last part without quotes
  grep -o '[^"]*$'
}

package_name=$(read_json_object_field ./package.json name)
package_version=$(read_json_object_field ./package.json version)

# Check that the cicd.bash wasn't publishing to Verdaccio
# NPM_REGISTRY in the start_verdaccio function
if [ -n "$NPM_REGISTRY" ]; then
  echo "We were probably publishing to Verdaccio because the NPM_REGISTRY flag was set to $NPM_REGISTRY. "\
       "Not publishing API doc model for $package_name@$package_version."
  exit 0
fi;

# Sanity check that the package has already been published to NPM
npm_version=$(npm --no-workspaces view $package_name version | tr -d '\n')
if [ "$npm_version" != "$package_version" ]; then
  echo "Current latest version on NPM is $npm_version. "\
       "Not publishing API doc model for $package_name@$package_version."
  exit 0
fi

s3_dest="s3://api-doc-model/$package_name/$package_version"
aws s3 sync "./api/temp" $s3_dest
echo "Published API doc model for $package_name@$package_version to $s3_dest."
