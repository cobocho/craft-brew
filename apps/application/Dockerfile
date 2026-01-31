FROM node:20-slim AS builder

WORKDIR /app

COPY package.json ./
COPY packages ./packages
COPY apps/application ./apps/application

RUN npm install
RUN npm run --workspace application build

FROM oven/bun:1.1.30

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/application ./apps/application

ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "--cwd", "apps/application", "run", "start"]
