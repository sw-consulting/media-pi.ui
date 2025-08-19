#!/bin/sh

# Copyright (c) 2025 sw.consulting
# Licensed under the MIT License.
# This file is a part of Media Pi frontend application

# This script updates the runtime configuration with environment variables

# Default API URL if not provided
API_URL=${API_URL:-https://media-pi.sw.consulting:8084/api}
ENABLE_LOG=${ENABLE_LOG:-false}

# Create the config file with the provided API URL and enableLog setting
echo "{" > /var/www/media-pi/config.json
echo "  \"apiUrl\": \"${API_URL}\"," >> /var/www/media-pi/config.json
echo "  \"enableLog\": ${ENABLE_LOG}" >> /var/www/media-pi/config.json
echo "}" >> /var/www/media-pi/config.json

echo "Runtime configuration updated:"
echo "API URL: ${API_URL}"
echo "Enable Log: ${ENABLE_LOG}"

# Execute the command passed to docker run
exec "$@"
