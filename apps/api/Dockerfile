FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @qrder/api build

FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo /app
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
