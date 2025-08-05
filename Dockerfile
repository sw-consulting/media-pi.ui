# Copyright (c) 2025 sw.consulting
# Licensed under the MIT License.
# This file is a part of Mediapi frontend application

# Stage for building the frontend
FROM node:18.18.2 AS build
WORKDIR /app

# Add build arguments with default values
ARG API_URL=https://mediapi.sw.consulting:8085/api
ARG ENABLE_LOG=true
ENV VITE_API_URL=$API_URL
ENV VITE_ENABLE_LOG=$ENABLE_LOG

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage for running nginx with static files
FROM nginx:1.27-alpine AS final
COPY --from=build /app/dist /var/www/mediapi
COPY config/public /var/www
COPY config/nginx.conf /etc/nginx/conf.d/default.conf
COPY config/update-config.sh /docker-entrypoint.d/40-update-config.sh

# Make the script executable
RUN chmod +x /docker-entrypoint.d/40-update-config.sh

EXPOSE 8082
EXPOSE 8083
CMD ["nginx", "-g", "daemon off;"]
