FROM oven/bun:1.1.8

WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/application ./apps/application

RUN bun install --frozen-lockfile

WORKDIR /app/apps/application
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "run", "start"]
