FROM oven/bun:1.1.8

WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/queue-ingest ./apps/queue-ingest

RUN bun install --frozen-lockfile

CMD ["bun", "--cwd", "apps/queue-ingest", "src/index.ts"]
