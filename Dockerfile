# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY server server
COPY web web
# npm hoists most packages to the root but keeps clashing versions in server/node_modules.
# Make sure that folder exists so the COPY below works either way.
RUN npm run build && npm prune --omit=dev && mkdir -p server/node_modules

# ---- runtime ----
FROM node:22-bookworm-slim
# Chromium is only used to log in to Willys/Hemköp. Set BROWSER_WS_URL to use an external
# browser (e.g. browserless) instead, or build with --build-arg WITH_CHROMIUM=false.
ARG WITH_CHROMIUM=true
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata ca-certificates \
  && if [ "$WITH_CHROMIUM" = "true" ]; then apt-get install -y --no-install-recommends chromium fonts-liberation; fi \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    TZ=Europe/Stockholm \
    DATA_DIR=/data \
    PORT=8099 \
    CHROMIUM_PATH=/usr/bin/chromium \
    WEB_DIST=/app/web/dist

WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server/package.json server/
COPY --from=build /app/web/dist web/dist
COPY package.json ./

VOLUME /data
EXPOSE 8099 8443
CMD ["node", "server/dist/index.js"]
