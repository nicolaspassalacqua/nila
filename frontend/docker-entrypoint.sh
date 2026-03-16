#!/bin/sh
set -eu

node <<'EOF'
const fs = require("fs");

const config = {
  API_URL: process.env.API_URL || process.env.VITE_API_URL || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "",
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID || "",
};

fs.writeFileSync("/app/dist/config.js", `window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`);
EOF

exec serve -s dist -l "${PORT:-4173}"
