FROM node:20-slim AS builder

WORKDIR /app

RUN npm install -g bun

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/application ./apps/application

RUN bun install --frozen-lockfile

WORKDIR /app/apps/application
RUN npm run build

# Runtime
FROM oven/bun:1.1.8

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/apps/application

EXPOSE 3000

CMD ["bun", "run", "start"]