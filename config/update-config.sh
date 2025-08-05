#!/bin/sh

# Copyright (c) 2025 sw.consulting
# Licensed under the MIT License.
# This file is a part of Mediapi frontend application

# This script updates the runtime configuration with environment variables

# Default API URL if not provided
API_URL=${API_URL:-https://mediapi.sw.consulting:8085/api}
ENABLE_LOG=${ENABLE_LOG:-false}

# Create the config file with the provided API URL and enableLog setting
echo "{" > /var/www/mediapi/config.json
echo "  \"apiUrl\": \"${API_URL}\"," >> /var/www/mediapi/config.json
echo "  \"enableLog\": ${ENABLE_LOG}" >> /var/www/mediapi/config.json
echo "}" >> /var/www/mediapi/config.json

echo "Runtime configuration updated:"
echo "API URL: ${API_URL}"
echo "Enable Log: ${ENABLE_LOG}"

# Execute the command passed to docker run
exec "$@"
