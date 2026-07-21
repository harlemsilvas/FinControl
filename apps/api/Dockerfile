FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN npm run build --workspace @fincontrol/api
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S fincontrol && adduser -S fincontrol -G fincontrol
COPY --from=build --chown=fincontrol:fincontrol /app/package.json /app/package-lock.json ./
COPY --from=build --chown=fincontrol:fincontrol /app/node_modules ./node_modules
COPY --from=build --chown=fincontrol:fincontrol /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=fincontrol:fincontrol /app/apps/api/dist ./apps/api/dist
USER fincontrol
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
