#!/usr/bin/env bash
# Build the Chrome Web Store upload zip.
#
# Chrome needs manifest.json + background.js at the zip root, but this repo keeps
# the Firefox build at the root and the Chrome variants alongside it as
# manifest.chrome.json / background.chrome.js. This stages the Chrome names into
# dist-chrome/ and zips it. The popup/, blocked/, and icons/ trees are shared
# verbatim with the Firefox build.
set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(sed -nE 's/.*"version" *: *"([^"]+)".*/\1/p' manifest.chrome.json | head -1)
OUT="siteblock-chrome-${VERSION}.zip"
STAGE="dist-chrome"

rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"

cp manifest.chrome.json "$STAGE/manifest.json"
cp background.chrome.js "$STAGE/background.js"
cp -R popup blocked icons "$STAGE/"

find "$STAGE" -name '.DS_Store' -delete

(cd "$STAGE" && zip -rq "../$OUT" .)
rm -rf "$STAGE"

echo "Built $OUT"
