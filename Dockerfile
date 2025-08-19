# Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#
# This file is a part of Media Pi frontend application

# Stage for building the frontend
FROM node:20.19.4 AS build
WORKDIR /app

# Add build arguments with default values
ARG API_URL=https://media-pi.sw.consulting:8084/api
ARG ENABLE_LOG=true
ENV VITE_API_URL=$API_URL
ENV VITE_ENABLE_LOG=$ENABLE_LOG

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage for running nginx with static files
FROM nginx:1.27-alpine AS final
COPY --from=build /app/dist /var/www/media-pi
COPY config/public /var/www
COPY config/nginx.conf /etc/nginx/conf.d/default.conf
COPY config/update-config.sh /docker-entrypoint.d/40-update-config.sh

# Make the script executable
RUN chmod +x /docker-entrypoint.d/40-update-config.sh

EXPOSE 8082
EXPOSE 8083
CMD ["nginx", "-g", "daemon off;"]
