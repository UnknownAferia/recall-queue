FROM node:24-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS quality

COPY . .
RUN npm run check

FROM dependencies AS build

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM dependencies AS production-dependencies

RUN npm prune --omit=dev && npm cache clean --force

FROM mongo:8.0.26-noble AS mongodb-tools

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=mongodb-tools /usr/bin/mongodump /usr/local/bin/mongodump
COPY --from=mongodb-tools /usr/bin/mongorestore /usr/local/bin/mongorestore
RUN mongodump --version >/dev/null \
    && mongorestore --version >/dev/null
COPY scripts ./scripts
COPY assets ./assets
RUN mkdir -p /app/logs /app/backups && chown -R node:node /app/logs /app/backups

USER node
CMD ["npm", "run", "start"]
