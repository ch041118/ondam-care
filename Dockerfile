FROM node:24-bookworm-slim
WORKDIR /app
# The HTTP server uses Node built-ins only; no mobile build dependencies needed.
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
COPY --chown=node:node mobile/core.mjs ./mobile/core.mjs
COPY --chown=node:node scripts/create-social.mjs scripts/create-admin.mjs ./scripts/
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 CLOVER_DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server.mjs"]
