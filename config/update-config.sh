#!/bin/sh

# Copyright (c) 2025 sw.consulting
# This file is a part of Media Pi frontend application

# This script updates the runtime configuration with environment variables
# and generates the /etc/nginx/conf.d/port-8082.conf snippet that controls
# how nginx listens on port 8082.

set -e

# Default API URL if not provided
API_URL=${API_URL:-https://media-pi.sw.consulting:8084/api}
ENABLE_LOG=${ENABLE_LOG:-false}

# PORTS_LAYOUT: "debug" => serve UI on 8082; "release" => redirect to 8083.
# Default to debug for local development. Set to "release" in CI/GitHub Actions
# when building production images.
PORTS_LAYOUT=${PORTS_LAYOUT:-debug}

# Validate PORTS_LAYOUT
case "$PORTS_LAYOUT" in
  debug|release)
    ;; # valid
  *)
    echo "ERROR: Invalid PORTS_LAYOUT='$PORTS_LAYOUT'"
    echo "Valid values: debug, release"
    echo "Example: docker run -e PORTS_LAYOUT=release ..."
    exit 1
    ;;
esac

# Write runtime config for frontend
mkdir -p /var/www/media-pi
cat > /var/www/media-pi/config.json <<-JSON
{
  "apiUrl": "${API_URL}",
  "enableLog": ${ENABLE_LOG}
}
JSON

echo "Runtime configuration updated:"
echo "API URL: ${API_URL}"
echo "Enable Log: ${ENABLE_LOG}"
echo "PORTS_LAYOUT: ${PORTS_LAYOUT}"

# Generate nginx include for port 8082
NGINX_PORT_CONF=/etc/nginx/conf.d/port-8082.conf
mkdir -p "$(dirname $NGINX_PORT_CONF)"
if [ "$PORTS_LAYOUT" = "debug" ]; then
  cat > "$NGINX_PORT_CONF" <<-'NGINX'
server {
  listen 8082;
  listen [::]:8082;
  http2;
  server_name _;
  root /var/www/media-pi;
  index index.html;

  location / {
    try_files $uri /index.html =404;
  }
}
NGINX
else
  cat > "$NGINX_PORT_CONF" <<-'NGINX'
server {
  listen 8082;
  listen [::]:8082;
  http2;
  server_name _;
  return 301 https://$host:8083$request_uri;
}
NGINX
fi

echo "Wrote $NGINX_PORT_CONF"

# Finally exec the container CMD
exec "$@"
