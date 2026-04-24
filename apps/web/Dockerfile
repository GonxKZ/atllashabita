FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY apps/web/package.json apps/web/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/web .
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
RUN pnpm add -g serve
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
