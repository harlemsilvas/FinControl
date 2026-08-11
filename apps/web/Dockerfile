FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/web apps/web
ARG VITE_API_URL=/
ARG VITE_BASE_PATH=/
ARG VITE_APP_VERSION=0.1.0
ARG VITE_GIT_SHA=container
ARG VITE_BUILD_TIME=container
ARG VITE_RELEASE_ID=container
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_GIT_SHA=$VITE_GIT_SHA
ENV VITE_BUILD_TIME=$VITE_BUILD_TIME
ENV VITE_RELEASE_ID=$VITE_RELEASE_ID
RUN npm run build --workspace @fincontrol/web
RUN printf '{\n  "app": "FinControl",\n  "version": "%s",\n  "commitSha": "%s",\n  "releaseId": "%s",\n  "buildTime": "%s"\n}\n' "$VITE_APP_VERSION" "$VITE_GIT_SHA" "$VITE_RELEASE_ID" "$VITE_BUILD_TIME" > apps/web/dist/version.json

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
