#!/bin/sh

# Copyright (c) 2025 sw.consulting
# This file is a part of Media Pi frontend application

# This script updates the runtime configuration with environment variables
# and generates the /etc/nginx/media-pi/port-8082.conf snippet that controls
# how nginx listens on port 8082.

set -e

# Default API URL if not provided
API_URL=${API_URL:-https://media-pi.sw.consulting:8086/api}
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
NGINX_PORT_8082_CONF=/etc/nginx/media-pi/port-8082.conf
mkdir -p "$(dirname "$NGINX_PORT_8082_CONF")"
if [ "$PORTS_LAYOUT" = "debug" ]; then
  cat > "$NGINX_PORT_8082_CONF" <<-'NGINX'
# Default server for port 8082 (catches unmatched requests)
server {
  listen 8082 default_server;
  listen [::]:8082 default_server;
  server_name _;
  root /var/www;
  index 200.html;
  error_page 404 404.html;
  
  location / {
    try_files $uri $uri/ =404;
  }
}

# Media Pi UI server
server {
  listen 8082;
  listen [::]:8082;
  server_name media-pi.local;
  root /var/www/media-pi;
  index index.html;

  location / {
    try_files $uri /index.html =404;
  }
}
NGINX
else
  cat > "$NGINX_PORT_8082_CONF" <<-'NGINX'
server {
  listen 8082;
  listen [::]:8082;
  # release: redirect to https cockpit host on 8083
  server_name _;
  return 301 https://$host:8083$request_uri;
}
NGINX
fi

echo "Wrote $NGINX_PORT_8082_CONF"
cat "$NGINX_PORT_8082_CONF"

# Generate cockpit server snippet (dynamic per PORTS_LAYOUT)
COCKPIT_CONF=/etc/nginx/media-pi/cockpit.conf
mkdir -p "$(dirname "$COCKPIT_CONF")"
if [ "$PORTS_LAYOUT" = "debug" ]; then
  cat > "$COCKPIT_CONF" <<-'NGINX'
server {
  listen 8082;
  listen [::]:8082;
  # debug: no TLS, local cockpit host
  server_name cockpit.local;

  # 1) Entry point
  location = / {
    auth_request /__auth;
    auth_request_set $cockpit_alias_header $upstream_http_x_cockpit_alias;
    return 302 /@$cockpit_alias/;
  }

  # 2) Internal auth subrequest
  location = /__auth {
    internal;
    proxy_method GET;
    proxy_pass http://mediapi_core/api/auth/authorize?deviceId=$arg_deviceId;

    proxy_set_header Authorization $http_authorization;
    proxy_set_header Cookie        $http_cookie;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Original-URI  $scheme://$host$request_uri;

    proxy_intercept_errors on;
    error_page 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 421 422 423 424 425 426 428 429 431 451 500 501 502 503 504 505 506 507 508 510 511 = @auth_forbidden;
  }

  location @auth_forbidden { return 403; }

  location / {
    auth_request /__auth;
    proxy_pass http://cockpit_ws;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Proto http;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;

    proxy_http_version 1.1;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;

    proxy_read_timeout  3600s;
    proxy_send_timeout  3600s;
  }
}
NGINX
else
  cat > "$COCKPIT_CONF" <<-'NGINX'
server {
  listen 8083 ssl;
  listen [::]:8083 ssl;
  http2 on;
  server_name cockpit.media-pi.sw.consulting;

  ssl_certificate /etc/nginx/certificate/s.crt;
  ssl_certificate_key /etc/nginx/certificate/s.key;
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

  # 1) Entry point
  location = / {
    auth_request /__auth;
    auth_request_set $cockpit_alias_header $upstream_http_x_cockpit_alias;
    return 302 /@$cockpit_alias/;
  }

  # 2) Internal auth subrequest
  location = /__auth {
    internal;
    proxy_method GET;
    proxy_pass http://mediapi_core/api/auth/authorize?deviceId=$arg_deviceId;

    proxy_set_header Authorization $http_authorization;
    proxy_set_header Cookie        $http_cookie;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Original-URI  $scheme://$host$request_uri;

    proxy_intercept_errors on;
    error_page 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 421 422 423 424 425 426 428 429 431 451 500 501 502 503 504 505 506 507 508 510 511 = @auth_forbidden;
  }

  location @auth_forbidden { return 403; }

  location / {
    proxy_pass http://cockpit_ws;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;

    proxy_http_version 1.1;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;

    proxy_read_timeout  3600s;
    proxy_send_timeout  3600s;
  }
}
NGINX
fi

echo "Wrote $COCKPIT_CONF"
cat "$COCKPIT_CONF"

# Finally exec the container CMD
exec "$@"
